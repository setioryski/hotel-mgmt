import { Op } from 'sequelize';
import Booking from '../models/Booking.js';
import Guest from '../models/Guest.js';
import Room from '../models/Room.js';
import Hotel from '../models/Hotel.js';

const ALLOWED_INITIAL_STATUSES = ['tentative', 'booked'];

/**
 * Create a new booking. Admin may choose status = 'tentative' or 'booked'.
 */
export const createBooking = async (req, res, next) => {
  try {
    const { room, guest, startDate, endDate, status } = req.body;

    // 1. Validate Room & Guest exist
    const roomDoc = await Room.findByPk(room, { include: Hotel });
    const guestDoc = await Guest.findByPk(guest);
    if (!roomDoc || !guestDoc) {
      return res.status(404).json({ msg: 'Invalid room or guest' });
    }

    // 2. Validate status on creation: only tentative or booked
    let bookingStatus = 'booked';
    if (status && ALLOWED_INITIAL_STATUSES.includes(status)) {
      bookingStatus = status;
    }

    // 3. Check for overlap, ignoring any bookings with status = 'cancelled'
    const overlap = await Booking.findOne({
      where: {
        RoomId: room,
        status: { [Op.ne]: 'cancelled' },
        [Op.or]: [
          { startDate: { [Op.between]: [startDate, endDate] } },
          { endDate: { [Op.between]: [startDate, endDate] } },
          {
            startDate: { [Op.lte]: startDate },
            endDate: { [Op.gte]: endDate },
          },
        ],
      },
    });

    if (overlap) {
      return res.status(400).json({ msg: 'Double booking' });
    }

    // 4. Calculate price (unchanged)
    const nights = (new Date(endDate) - new Date(startDate)) / 86400000;
    const month = new Date(startDate).getMonth() + 1;
    const seasonal =
      roomDoc.Hotel.seasonalMultipliers?.find((m) => m.month === month)?.multiplier ||
      1;
    const override = roomDoc.priceOverride || 0;
    const price = (roomDoc.Hotel.basePrice * seasonal + override) * nights;

    // 5. Create the booking with chosen status
    const booking = await Booking.create({
      RoomId: room,
      GuestId: guest,
      startDate,
      endDate,
      price,
      status: bookingStatus,
    });

    return res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch all non-cancelled bookings for a given hotel, including color-coding by status.
 */
export const getBookings = async (req, res, next) => {
  try {
    // 1. Base filter: exclude cancelled bookings
    const where = { status: { [Op.ne]: 'cancelled' } };

    // 2. If hotel filter provided, fetch only rooms for that hotel
    if (req.query.hotel) {
      const roomIds = await Room.findAll({
        where: { HotelId: req.query.hotel },
        attributes: ['id'],
      }).then((rooms) => rooms.map((r) => r.id));

      where.RoomId = { [Op.in]: roomIds };
    }

    // 3. Fetch all non-cancelled bookings, including Room & Guest
    const bookings = await Booking.findAll({
      where,
      include: [Room, Guest],
    });

    // 4. Map into scheduler format, with bgColor based on status
    const payload = bookings.map((b) => {
      let bgColor = '#3B82F6'; // default BLUE ('booked')
      if (b.status === 'tentative') bgColor = '#FBBF24'; // YELLOW
      else if (b.status === 'checkedin') bgColor = '#10B981'; // GREEN
      else if (b.status === 'checkedout') bgColor = '#EF4444'; // RED
      // 'booked' stays BLUE; 'cancelled' would be filtered out

      return {
        id: b.id,
        resourceId: b.RoomId,
        title: b.Guest?.name || 'Guest',
        start: b.startDate,
        end: b.endDate,
        bgColor,
        status: b.status,
        guestId: b.Guest?.id || null,
      };
    });

    return res.json(payload);
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing booking. Allows changing dates, room, or status.
 */
export const updateBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    const { room, startDate, endDate, status } = req.body;

    // 1. If room or dates are being changed, re-check overlaps
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
              endDate: { [Op.gte]: newEnd },
            },
          ],
        },
      });

      if (overlap) {
        return res.status(400).json({ msg: 'Double booking' });
      }
    }

    // 2. Validate status change if provided
    const allStatuses = ['tentative', 'booked', 'checkedin', 'checkedout', 'cancelled'];
    const newStatus = status && allStatuses.includes(status) ? status : booking.status;

    // 3. Perform update
    await booking.update({
      RoomId: room !== undefined ? room : booking.RoomId,
      startDate: startDate !== undefined ? startDate : booking.startDate,
      endDate: endDate !== undefined ? endDate : booking.endDate,
      status: newStatus,
    });

    return res.json(booking);
  } catch (err) {
    next(err);
  }
};

/**
 * Mark a booking as cancelled. Does not delete; sets status = 'cancelled'.
 */
export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    // Mark as cancelled; getBookings will filter it out
    await booking.update({ status: 'cancelled' });
    return res.json({ msg: 'Booking cancelled', booking });
  } catch (err) {
    next(err);
  }
};
