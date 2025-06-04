// src/controllers/bookingController.js

import { Op } from 'sequelize';
import Booking from '../models/Booking.js';
import Guest from '../models/Guest.js';
import Room from '../models/Room.js';
import Hotel from '../models/Hotel.js';

export const createBooking = async (req, res, next) => {
  try {
    const { room, guest, startDate, endDate } = req.body;

    // 1. Validate Room & Guest exist
    const roomDoc = await Room.findByPk(room, { include: Hotel });
    const guestDoc = await Guest.findByPk(guest);
    if (!roomDoc || !guestDoc) {
      return res.status(404).json({ msg: 'Invalid room or guest' });
    }

    // 2. Check for overlap, ignoring any bookings with status = 'cancelled'
    const overlap = await Booking.findOne({
      where: {
        RoomId: room,
        status: { [Op.ne]: 'cancelled' },
        [Op.or]: [
          {
            // New booking’s startDate falls within an existing booking
            startDate: {
              [Op.between]: [startDate, endDate]
            }
          },
          {
            // New booking’s endDate falls within an existing booking
            endDate: {
              [Op.between]: [startDate, endDate]
            }
          },
          {
            // New booking entirely spans an existing booking
            startDate: { [Op.lte]: startDate },
            endDate: { [Op.gte]: endDate }
          }
        ]
      }
    });

    if (overlap) {
      return res.status(400).json({ msg: 'Double booking' });
    }

    // 3. Calculate price
    const nights = (new Date(endDate) - new Date(startDate)) / 86400000;
    const month = new Date(startDate).getMonth() + 1;
    const seasonal =
      roomDoc.Hotel.seasonalMultipliers?.find((m) => m.month === month)?.multiplier ||
      1;
    const override = roomDoc.priceOverride || 0;
    const price = (roomDoc.Hotel.basePrice * seasonal + override) * nights;

    // 4. Create new booking (status defaulted to 'confirmed')
    const booking = await Booking.create({
      RoomId: room,
      GuestId: guest,
      startDate,
      endDate,
      price,
      status: 'confirmed'
    });

    return res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
};

export const getBookings = async (req, res, next) => {
  try {
    // 1. Build base filter: exclude cancelled bookings
    const where = { status: { [Op.ne]: 'cancelled' } };

    // 2. If a hotel filter is provided, only fetch rooms for that hotel
    if (req.query.hotel) {
      const roomIds = await Room.findAll({
        where: { HotelId: req.query.hotel },
        attributes: ['id']
      }).then((rooms) => rooms.map((r) => r.id));

      where.RoomId = { [Op.in]: roomIds };
    }

    // 3. Fetch all non-cancelled bookings, including Room & Guest
    const bookings = await Booking.findAll({
      where,
      include: [Room, Guest]
    });

    // 4. Map into scheduler format (only active/confirmed bookings)
    const payload = bookings.map((b) => ({
      id: b.id,
      resourceId: b.RoomId,
      title: b.Guest?.name || 'Guest',
      start: b.startDate,
      end: b.endDate,
      // Always render active bookings in primary color
      bgColor: '#3B82F6'
    }));

    return res.json(payload);
  } catch (err) {
    next(err);
  }
};

export const updateBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    // If room, startDate, or endDate is being changed, re-check overlaps
    const { room, startDate, endDate } = req.body;
    if (room !== undefined || startDate !== undefined || endDate !== undefined) {
      const newRoomId = room !== undefined ? room : booking.RoomId;
      const newStart = startDate !== undefined ? startDate : booking.startDate;
      const newEnd = endDate !== undefined ? endDate : booking.endDate;

      const overlap = await Booking.findOne({
        where: {
          id: { [Op.ne]: booking.id },
          RoomId: newRoomId,
          status: { [Op.ne]: 'cancelled' },
          [Op.or]: [
            { startDate: { [Op.between]: [newStart, newEnd] } },
            { endDate: { [Op.between]: [newStart, newEnd] } },
            {
              startDate: { [Op.lte]: newStart },
              endDate: { [Op.gte]: newEnd }
            }
          ]
        }
      });

      if (overlap) {
        return res.status(400).json({ msg: 'Double booking' });
      }
    }

    await booking.update(req.body);
    return res.json(booking);
  } catch (err) {
    next(err);
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    // Mark as cancelled; getBookings will no longer return it
    await booking.update({ status: 'cancelled' });
    return res.json({ msg: 'Booking cancelled', booking });
  } catch (err) {
    next(err);
  }
};
