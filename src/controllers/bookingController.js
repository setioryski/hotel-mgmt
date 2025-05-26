import Booking from '../models/Booking.js';
import Guest from '../models/Guest.js';
import Room from '../models/Room.js';
import mongoose from 'mongoose';

export const createBooking = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const { room, guestEmail, startDate, endDate } = req.body;
      const guest = await Guest.findOne({ email: guestEmail });
      if (!guest) throw { statusCode: 404, message: 'Guest not found' };

      const overlap = await Booking.findOne({
        room,
        $or: [
          { startDate: { $lt: endDate, $gte: startDate } },
          { endDate:   { $gt: startDate, $lte: endDate } }
        ]
      });
      if (overlap) throw { statusCode: 400, message: 'Double booking' };

      const roomDoc = await Room.findById(room).populate('hotel');
      const nights = (new Date(endDate) - new Date(startDate)) / (1000*60*60*24);
      const month = new Date(startDate).getMonth() + 1;
      const seasonal = roomDoc.hotel.seasonalMultipliers.find(m => m.month===month)?.multiplier || 1;
      const override = roomDoc.priceOverride || 0;
      const price = (roomDoc.hotel.basePrice * seasonal + override) * nights;

      const [booking] = await Booking.create(
        [{ room, guest: guest._id, startDate, endDate, price }],
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

export const getBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find().populate('room guest');
    res.json(bookings.map(b => ({
      id: b._id,
      resourceId: b.room._id,
      title: b.guest.name,
      start: b.startDate,
      end: b.endDate
    })));
  } catch (err) {
    next(err);
  }
};

export const updateBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(booking);
  } catch (err) {
    next(err);
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    res.json(booking);
  } catch (err) {
    next(err);
  }
};
