// src/controllers/bookingController.js

import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Guest from '../models/Guest.js';
import Room from '../models/Room.js';
import { validationResult } from 'express-validator';

// POST /api/bookings
export const createBooking = async (req, res, next) => {
  // 1) Handle validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { room, guest, startDate, endDate } = req.body;

      // look up guest by ID
      const guestDoc = await Guest.findById(guest);
      if (!guestDoc) {
        return res.status(404).json({ msg: 'Guest not found' });
      }

      // prevent overlapping bookings
      const overlap = await Booking.findOne({
        room,
        $or: [
          { startDate: { $lt: endDate, $gte: startDate } },
          { endDate:   { $gt: startDate, $lte: endDate } }
        ]
      });
      if (overlap) {
        return res.status(400).json({ msg: 'Double booking' });
      }

      // calculate price
      const roomDoc = await Room.findById(room).populate('hotel');
      const nights  = (new Date(endDate) - new Date(startDate)) / 86400000;
      const month   = new Date(startDate).getMonth() + 1;
      const seasonal = roomDoc.hotel.seasonalMultipliers
                        .find(m => m.month === month)?.multiplier || 1;
      const override = roomDoc.priceOverride || 0;
      const price    = (roomDoc.hotel.basePrice * seasonal + override) * nights;

      // create booking
      const [booking] = await Booking.create(
        [{ room, guest: guestDoc._id, startDate, endDate, price }],
        { session }
      );

      res.status(201).json(booking);
    });
  } catch (err) {
    next(err);
  } finally {
    session.endSession();
  }
};

// GET /api/bookings
export const getBookings = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.hotel) {
      // only bookings for rooms in that hotel
      const rooms = await Room.find({ hotel: req.query.hotel }).select('_id');
      filter.room = { $in: rooms.map(r => r._id) };
    }

    const bookings = await Booking.find(filter).populate('room guest');
    res.json(
      bookings.map(b => ({
        id:         b._id,
        resourceId: b.room._id,
        title:      b.guest.name,
        start:      b.startDate,
        end:        b.endDate,
        bgColor:    b.status === 'cancelled' ? '#999' : '#3B82F6'
      }))
    );
  } catch (err) {
    next(err);
  }
};

// PUT /api/bookings/:id
export const updateBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }
    res.json(booking);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/bookings/:id
export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }
    res.json({ msg: 'Booking cancelled', booking });
  } catch (err) {
    next(err);
  }
};
