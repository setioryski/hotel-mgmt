// src/controllers/bookingController.js

import { Op } from 'sequelize';
import Booking from '../models/Booking.js';
import Guest from '../models/Guest.js';
import Room from '../models/Room.js';
import Hotel from '../models/Hotel.js';
import AccountingEntry from '../models/AccountingEntry.js';

const ALLOWED_INITIAL_STATUSES = ['tentative', 'booked'];
const ALL_STATUSES = ['tentative', 'booked', 'checkedin', 'checkedout', 'cancelled'];

/**
 * Create a new booking. Admin may set both nightly rate and total price.
 * Automatically generates an 'income' accounting entry.
 */
export const createBooking = async (req, res, next) => {
  try {
    const {
      room,
      guest,
      startDate,
      endDate,
      status,
      price: overrideRate,
      totalPrice: overrideTotal,
      notes,
    } = req.body;

    // 1. Validate existence
    const roomDoc = await Room.findByPk(room, { include: Hotel });
    const guestDoc = await Guest.findByPk(guest);
    if (!roomDoc || !guestDoc) {
      return res.status(404).json({ msg: 'Invalid room or guest' });
    }

    // 2. Validate initial status
    let bookingStatus = 'booked';
    if (status && ALLOWED_INITIAL_STATUSES.includes(status)) {
      bookingStatus = status;
    }

    // 3. Overlap check
    const overlap = await Booking.findOne({
      where: {
        RoomId: room,
        status: { [Op.ne]: 'cancelled' },
        startDate: { [Op.lt]: endDate },
        endDate:   { [Op.gt]: startDate },
      },
    });
    if (overlap) {
      return res.status(400).json({ msg: 'Double booking' });
    }

    // 4. Calculate defaults
    const nights = (new Date(endDate) - new Date(startDate)) / 86400000;
    const month = new Date(startDate).getMonth() + 1;
    const seasonal =
      roomDoc.Hotel.seasonalMultipliers?.find(m => m.month === month)?.multiplier || 1;
    const overrideRoomPrice = roomDoc.priceOverride || 0;
    const defaultRate = roomDoc.Hotel.basePrice * seasonal + overrideRoomPrice;
    const defaultTotal = defaultRate * nights;

    // 5. Apply overrides if provided
    const finalRate  = overrideRate  !== undefined ? parseFloat(overrideRate)  : defaultRate;
    const finalTotal = overrideTotal !== undefined ? parseFloat(overrideTotal) : defaultTotal;

    // 6. Create booking
    const booking = await Booking.create({
      RoomId:     room,
      GuestId:    guest,
      startDate,
      endDate,
      price:      finalRate,
      totalPrice: finalTotal,
      status:     bookingStatus,
      notes,
    });

    // 7. Create accounting entry for this booking’s income
    await AccountingEntry.create({
      type:        'income',
      amount:      finalTotal,
      description: `Booking #${booking.id} (${guestDoc.name})`,
      date:        startDate,
      HotelId:     roomDoc.HotelId,
      BookingId:   booking.id,
    });

    return res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch all non-cancelled bookings for a hotel, including price & totalPrice.
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
    }

    const bookings = await Booking.findAll({
      where,
      include: [Room, Guest],
    });

    const payload = bookings.map(b => {
      let bgColor = '#3B82F6';
      if (b.status === 'tentative') bgColor = '#FBBF24';
      else if (b.status === 'checkedin') bgColor = '#10B981';
      else if (b.status === 'checkedout') bgColor = '#EF4444';

      return {
        id:         b.id,
        resourceId: b.RoomId,
        title:      b.Guest?.name || 'Guest',
        start:      b.startDate,
        end:        b.endDate,
        price:      b.price,
        totalPrice: b.totalPrice,
        bgColor,
        status:     b.status,
        guestId:    b.Guest?.id || null,
        notes:      b.notes,
      };
    });

    return res.json(payload);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing booking: dates, room, guest, status, nightly rate, or totalPrice.
 * Also syncs the related accounting entry.
 */
export const updateBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    const {
      room,
      guestId,
      startDate,
      endDate,
      status,
      price: overrideRate,
      totalPrice: overrideTotal,
      notes,
    } = req.body;

    // 1. Overlap re-check if changing room/dates
    if (room !== undefined || startDate !== undefined || endDate !== undefined) {
      const newRoom = room !== undefined ? room : booking.RoomId;
      const newStart = startDate !== undefined ? startDate : booking.startDate;
      const newEnd   = endDate   !== undefined ? endDate   : booking.endDate;
      const overlap = await Booking.findOne({
        where: {
          id: { [Op.ne]: booking.id },
          RoomId: newRoom,
          status: { [Op.ne]: 'cancelled' },
          startDate: { [Op.lt]: newEnd },
          endDate:   { [Op.gt]: newStart },
        },
      });
      if (overlap) {
        return res.status(400).json({ msg: 'Double booking' });
      }
    }

    // 2. Validate status
    const newStatus = status && ALL_STATUSES.includes(status) ? status : booking.status;

    // 3. Determine new guest ID
    const newGuestId = guestId !== undefined ? guestId : booking.GuestId;

    // 4. Apply updates
    await booking.update({
      RoomId:     room      !== undefined ? room      : booking.RoomId,
      GuestId:    newGuestId,
      startDate:  startDate !== undefined ? startDate : booking.startDate,
      endDate:    endDate   !== undefined ? endDate   : booking.endDate,
      status:     newStatus,
      notes:      notes     !== undefined ? notes     : booking.notes,
      ...(overrideRate  !== undefined && { price:      parseFloat(overrideRate) }),
      ...(overrideTotal !== undefined && { totalPrice: parseFloat(overrideTotal) }),
    });

    // 5. Sync accounting entry
    const updatedBooking = booking;
    const roomDoc   = await Room.findByPk(updatedBooking.RoomId, { include: Hotel });
    const guestDoc  = await Guest.findByPk(updatedBooking.GuestId);
    const entry     = await AccountingEntry.findOne({ where: { BookingId: updatedBooking.id } });

    if (entry) {
      await entry.update({
        amount:      updatedBooking.totalPrice,
        description: `Booking #${updatedBooking.id} (${guestDoc.name})`,
        date:        updatedBooking.startDate,
        HotelId:     roomDoc.HotelId,
      });
    }

    return res.json(booking);
  } catch (err) {
    next(err);
  }
};

/**
 * Cancel (soft-delete) a booking by setting status to 'cancelled'.
 * Also records a refund as an 'expense' accounting entry.
 */
export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    // Fetch related data for accounting reversal
    const roomDoc  = await Room.findByPk(booking.RoomId, { include: Hotel });
    const guestDoc = await Guest.findByPk(booking.GuestId);

    // Update booking status
    await booking.update({ status: 'cancelled' });

    // Record refund expense
    await AccountingEntry.create({
      type:        'expense',
      amount:      booking.totalPrice,
      description: `Refund for cancelled booking #${booking.id} (${guestDoc.name})`,
      date:        new Date(),
      HotelId:     roomDoc.HotelId,
      BookingId:   booking.id,
    });

    return res.json({ msg: 'Booking cancelled', booking });
  } catch (err) {
    next(err);
  }
};
