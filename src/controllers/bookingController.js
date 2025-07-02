import { Op } from 'sequelize';
import Booking from '../models/Booking.js';
import Guest from '../models/Guest.js';
import Room from '../models/Room.js';
import Hotel from '../models/Hotel.js';
import RoomBlock from '../models/RoomBlock.js'; // Import RoomBlock model
import AccountingEntry from '../models/AccountingEntry.js';
import { getIO } from '../socket.js';

const ALLOWED_INITIAL_STATUSES = ['tentative', 'booked'];
const ALL_STATUSES = ['tentative', 'booked', 'checkedin', 'checkedout', 'cancelled'];

/**
 * Helper function to emit a 'dataUpdated' event to the appropriate hotel room via Socket.IO.
 */
const notifyClients = (hotelId) => {
  if (!hotelId) return;
  const io = getIO();
  const roomName = `hotel_${hotelId}`;
  io.to(roomName).emit('dataUpdated');
  console.log(`Socket event 'dataUpdated' emitted to room: ${roomName}`);
};

/**
 * Create a new booking.
 * ✅ Validates against existing blocks and bookings.
 * Automatically generates an 'income' accounting entry.
 * Notifies clients via WebSocket upon successful creation.
 */
export const createBooking = async (req, res, next) => {
  try {
    const {
      room: roomId,
      guest: guestId,
      startDate,
      endDate,
      status,
      price: overrideRate,
      totalPrice: overrideTotal,
      notes,
    } = req.body;

    const roomDoc = await Room.findByPk(roomId, { include: Hotel });
    const guestDoc = await Guest.findByPk(guestId);
    if (!roomDoc || !guestDoc) {
      return res.status(404).json({ msg: 'Invalid room or guest ID' });
    }
    
    // --- FIX START: Add conflict validation ---
    // 1. Check for overlapping room blocks
    const overlappingBlock = await RoomBlock.findOne({
      where: {
        RoomId: roomId,
        startDate: { [Op.lt]: endDate },
        endDate: { [Op.gt]: startDate },
      },
    });
    if (overlappingBlock) {
      return res.status(409).json({ msg: 'This date range is blocked and cannot be booked.' });
    }

    // 2. Check for overlapping bookings
    const overlappingBooking = await Booking.findOne({
      where: {
        RoomId: roomId,
        status: { [Op.ne]: 'cancelled' },
        startDate: { [Op.lt]: endDate },
        endDate: { [Op.gt]: startDate },
      },
    });
    if (overlappingBooking) {
      return res.status(409).json({ msg: 'This date range is already booked.' });
    }
    // --- FIX END ---

    const bookingStatus = (status && ALLOWED_INITIAL_STATUSES.includes(status)) ? status : 'booked';

    const booking = await Booking.create({
      RoomId: roomId,
      GuestId: guestId,
      startDate,
      endDate,
      price: overrideRate || roomDoc.price,
      totalPrice: overrideTotal || roomDoc.price,
      status: bookingStatus,
      notes,
    });

    await AccountingEntry.create({
      type: 'income',
      amount: booking.totalPrice,
      description: `Booking #${booking.id} (${guestDoc.name})`,
      date: startDate,
      HotelId: roomDoc.HotelId,
      BookingId: booking.id,
    });
    
    notifyClients(roomDoc.HotelId);

    res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
};

/**
 * Create multiple bookings in one request.
 */
export const createGroup = async (req, res, next) => {
  try {
    const bookingsData = req.body; // expecting an array
    if (!Array.isArray(bookingsData) || bookingsData.length === 0) {
      return res.status(400).json({ msg: 'Expected a non-empty array of bookings.' });
    }

    const created = [];
    for (const data of bookingsData) {
      const {
        room: roomId,
        guest: guestId,
        startDate,
        endDate,
        status,
        price: overrideRate,
        totalPrice: overrideTotal,
        notes,
      } = data;

      // Validate room & guest
      const roomDoc = await Room.findByPk(roomId, { include: Hotel });
      const guestDoc = await Guest.findByPk(guestId);
      if (!roomDoc || !guestDoc) {
        return res.status(404).json({ msg: 'Invalid room or guest ID in one of the bookings.' });
      }

      // Conflict checks
      const overlappingBlock = await RoomBlock.findOne({
        where: {
          RoomId: roomId,
          startDate: { [Op.lt]: endDate },
          endDate: { [Op.gt]: startDate },
        },
      });
      if (overlappingBlock) {
        return res.status(409).json({ msg: `Date range blocked for room ${roomId}.` });
      }
      const overlappingBooking = await Booking.findOne({
        where: {
          RoomId: roomId,
          status: { [Op.ne]: 'cancelled' },
          startDate: { [Op.lt]: endDate },
          endDate: { [Op.gt]: startDate },
        },
      });
      if (overlappingBooking) {
        return res.status(409).json({ msg: `Date range already booked for room ${roomId}.` });
      }

      const bookingStatus = (status && ALLOWED_INITIAL_STATUSES.includes(status)) ? status : 'booked';

      const booking = await Booking.create({
        RoomId: roomId,
        GuestId: guestId,
        startDate,
        endDate,
        price: overrideRate || roomDoc.price,
        totalPrice: overrideTotal || roomDoc.price,
        status: bookingStatus,
        notes,
      });

      await AccountingEntry.create({
        type: 'income',
        amount: booking.totalPrice,
        description: `Booking #${booking.id} (${guestDoc.name})`,
        date: startDate,
        HotelId: roomDoc.HotelId,
        BookingId: booking.id,
      });

      notifyClients(roomDoc.HotelId);
      created.push(booking);
    }

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing booking.
 * ✅ Validates against existing blocks and bookings.
 * Handles changes in dates, price, status, or room.
 * Notifies clients of the original and new hotel (if changed).
 */
export const updateBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findByPk(bookingId, { include: { model: Room, include: [Hotel] } });
    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    // --- FIX START: Add conflict validation ---
    const checkRoomId = req.body.RoomId || booking.RoomId;
    const checkStartDate = req.body.startDate || booking.startDate;
    const checkEndDate = req.body.endDate || booking.endDate;

    // 1. Check for overlapping room blocks
    const overlappingBlock = await RoomBlock.findOne({
        where: {
            RoomId: checkRoomId,
            startDate: { [Op.lt]: checkEndDate },
            endDate: { [Op.gt]: checkStartDate },
        },
    });
    if (overlappingBlock) {
        return res.status(409).json({ msg: 'This date range is blocked and cannot be booked.' });
    }

    // 2. Check for overlapping bookings (excluding the current one)
    const overlappingBooking = await Booking.findOne({
        where: {
            id: { [Op.ne]: bookingId }, // Exclude the booking being updated
            RoomId: checkRoomId,
            status: { [Op.ne]: 'cancelled' },
            startDate: { [Op.lt]: checkEndDate },
            endDate: { [Op.gt]: checkStartDate },
        },
    });
    if (overlappingBooking) {
        return res.status(409).json({ msg: 'This date range is already booked by another party.' });
    }
    // --- FIX END ---

    const originalHotelId = booking.Room.Hotel.id;

    await booking.update(req.body);

    const updatedBooking = await Booking.findByPk(bookingId, { include: [{ model: Room, include: [Hotel] }, Guest] });
    const newHotelId = updatedBooking.Room.Hotel.id;

    const entry = await AccountingEntry.findOne({ where: { BookingId: updatedBooking.id } });
    if (entry) {
      await entry.update({
        amount: updatedBooking.totalPrice,
        description: `Booking #${updatedBooking.id} (${updatedBooking.Guest?.name})`,
        date: updatedBooking.startDate,
        HotelId: newHotelId,
      });
    }

    notifyClients(originalHotelId);
    if (originalHotelId !== newHotelId) {
        notifyClients(newHotelId);
    }

    res.json(updatedBooking);
  } catch (err) {
    next(err);
  }
};

/**
 * Fetches all non-cancelled bookings for a given hotel and formats them for the scheduler.
 */
export const getBookings = async (req, res, next) => {
  try {
    const where = { status: { [Op.ne]: 'cancelled' } };
    if (req.query.hotel) {
      const roomIds = await Room.findAll({
        where: { HotelId: req.query.hotel },
        attributes: ['id'],
      }).then(rooms => rooms.map(r => r.id));
      where.RoomId = { [Op.in]: roomIds };
    } else {
        return res.json([]);
    }

    const bookings = await Booking.findAll({ where, include: [Room, Guest] });

    const payload = bookings.map(b => ({
      id: b.id,
      resourceId: b.RoomId,
      title: b.Guest?.name || 'Unknown Guest',
      start: b.startDate,
      end: b.endDate,
      price: b.price,
      totalPrice: b.totalPrice,
      bgColor: b.status === 'tentative' ? '#FBBF24' : b.status === 'checkedin' ? '#10B981' : b.status === 'checkedout' ? '#EF4444' : '#3B82F6',
      status: b.status,
      guestId: b.Guest?.id || null,
      notes: b.notes,
    }));

    res.json(payload);
  } catch (err) {
    next(err);
  }
};

/**
 * Cancel a booking by setting its status to 'cancelled'.
 */
export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id, { include: [{ model: Room, include: [Hotel] }, Guest] });
    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    const hotelId = booking.Room.Hotel.id;
    await booking.update({ status: 'cancelled' });

    await AccountingEntry.create({
      type: 'expense',
      amount: booking.totalPrice,
      description: `Refund for cancelled booking #${booking.id} (${booking.Guest?.name})`,
      date: new Date(),
      HotelId: hotelId,
      BookingId: booking.id,
    });

    notifyClients(hotelId);

    res.json({ msg: 'Booking cancelled successfully', booking });
  } catch (err) {
    next(err);
  }
};

/**
 * Permanently delete a booking from the database.
 */
export const deleteBooking = async (req, res, next) => {
    try {
        const booking = await Booking.findByPk(req.params.id, { include: { model: Room, include: [Hotel] } });
        if (!booking) {
            return res.status(404).json({ msg: 'Booking not found' });
        }

        const hotelId = booking.Room.Hotel.id;
        
        await AccountingEntry.destroy({ where: { BookingId: booking.id } });
        
        await booking.destroy();

        notifyClients(hotelId);

        res.json({ msg: 'Booking permanently deleted' });
    } catch (err) {
        next(err);
    }
};
