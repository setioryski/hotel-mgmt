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
const MS_PER_DAY = 1000 * 60 * 60 * 24;

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
 * Helper function to calculate total price based on dates and rate.
 * This is the single source of truth for price calculation.
 */
const calculateTotalPrice = (startDateStr, endDateStr, price) => {
    if (!startDateStr || !endDateStr || price == null) return 0;

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Ensure dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return 0;
    }
    
    // Use UTC to avoid timezone issues in calculation
    const startTime = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
    const endTime = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());

    const nights = Math.round((endTime - startTime) / MS_PER_DAY);
    if (nights <= 0) return 0;
    
    const numericPrice = parseFloat(String(price).replace(/,/g, '.'));
    if (isNaN(numericPrice)) return 0;

    // Perform calculation and round to 2 decimal places to avoid floating point issues
    const total = nights * numericPrice;
    return Math.round(total * 100) / 100;
};


/**
 * Create a new booking.
 * ✅ Validates against existing blocks and bookings.
 * ✅ Always recalculates total price on the server.
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
      // totalPrice is deliberately ignored from the request body
      notes,
    } = req.body;

    const roomDoc = await Room.findByPk(roomId, { include: Hotel });
    const guestDoc = await Guest.findByPk(guestId);
    if (!roomDoc || !guestDoc) {
      return res.status(404).json({ msg: 'Invalid room or guest ID' });
    }
    
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

    const bookingStatus = (status && ALLOWED_INITIAL_STATUSES.includes(status)) ? status : 'booked';

    // --- FIX START: Always calculate total price on the server ---
    const finalRate = overrideRate || roomDoc.price;
    const finalTotalPrice = calculateTotalPrice(startDate, endDate, finalRate);
    // --- FIX END ---

    const booking = await Booking.create({
      RoomId: roomId,
      GuestId: guestId,
      startDate,
      endDate,
      price: finalRate,
      totalPrice: finalTotalPrice, // Use server-calculated price
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
 * Update an existing booking.
 * ✅ Validates against existing blocks and bookings.
 * ✅ Recalculates total price if relevant fields change.
 * Notifies clients of the original and new hotel (if changed).
 */
export const updateBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findByPk(bookingId, { include: { model: Room, include: [Hotel] } });
    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    const { startDate, endDate, price, RoomId } = req.body;
    
    const checkRoomId = RoomId || booking.RoomId;
    const checkStartDate = startDate || booking.startDate;
    const checkEndDate = endDate || booking.endDate;

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
    
    const originalHotelId = booking.Room.Hotel.id;

    // --- FIX START: Recalculate total price on update ---
    const finalData = { ...req.body };
    const newPrice = price !== undefined ? price : booking.price;
    
    // Always recalculate total price if dates or price are changing
    if (startDate || endDate || price !== undefined) {
        finalData.totalPrice = calculateTotalPrice(checkStartDate, checkEndDate, newPrice);
    }
    // --- FIX END ---
    
    await booking.update(finalData);

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