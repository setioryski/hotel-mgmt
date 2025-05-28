import { Op } from 'sequelize';
import Booking from '../models/Booking.js';
import Guest from '../models/Guest.js';
import Room from '../models/Room.js';
import Hotel from '../models/Hotel.js';

export const createBooking = async (req, res, next) => {
  try {
    const { room, guest, startDate, endDate } = req.body;
    const roomDoc = await Room.findByPk(room, { include: Hotel });
    const guestDoc = await Guest.findByPk(guest);

    if (!roomDoc || !guestDoc) return res.status(404).json({ msg: 'Invalid room or guest' });

    const overlap = await Booking.findOne({
      where: {
        RoomId: room,
        [Op.or]: [
          { startDate: { [Op.between]: [startDate, endDate] } },
          { endDate: { [Op.between]: [startDate, endDate] } }
        ]
      }
    });

    if (overlap) return res.status(400).json({ msg: 'Double booking' });

    const nights = (new Date(endDate) - new Date(startDate)) / 86400000;
    const month = new Date(startDate).getMonth() + 1;
    const seasonal = roomDoc.Hotel.seasonalMultipliers?.find(m => m.month === month)?.multiplier || 1;
    const override = roomDoc.priceOverride || 0;
    const price = (roomDoc.Hotel.basePrice * seasonal + override) * nights;

    const booking = await Booking.create({
      RoomId: room,
      GuestId: guest,
      startDate,
      endDate,
      price,
      status: 'confirmed'
    });

    res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
};

export const getBookings = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.hotel) {
      const roomIds = await Room.findAll({
        where: { HotelId: req.query.hotel },
        attributes: ['id']
      }).then(rooms => rooms.map(r => r.id));

      where.RoomId = { [Op.in]: roomIds };
    }

    const bookings = await Booking.findAll({
      where,
      include: [Room, Guest]
    });

    res.json(bookings.map(b => ({
      id: b.id,
      resourceId: b.RoomId,
      title: b.Guest?.name || 'Guest',
      start: b.startDate,
      end: b.endDate,
      bgColor: b.status === 'cancelled' ? '#999' : '#3B82F6'
    })));
  } catch (err) {
    next(err);
  }
};

export const updateBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });

    await booking.update(req.body);
    res.json(booking);
  } catch (err) {
    next(err);
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).json({ msg: 'Booking not found' });

    await booking.update({ status: 'cancelled' });
    res.json({ msg: 'Booking cancelled', booking });
  } catch (err) {
    next(err);
  }
};
