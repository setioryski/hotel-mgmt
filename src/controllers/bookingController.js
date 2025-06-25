// src/controllers/bookingController.js

import { Op } from 'sequelize';
import Booking from '../models/Booking.js';
import Guest from '../models/Guest.js';
import Room from '../models/Room.js';
import Hotel from '../models/Hotel.js';
import AccountingEntry from '../models/AccountingEntry.js';
import { getIO } from '../socket.js'; // Import the getIO function

const ALLOWED_INITIAL_STATUSES = ['tentative', 'booked'];
const ALL_STATUSES = ['tentative', 'booked', 'checkedin', 'checkedout', 'cancelled'];

/**
 * Helper function to emit a 'dataUpdated' event to the appropriate hotel room via Socket.IO.
 * This notifies all connected clients for a specific hotel that they need to refresh their data.
 * @param {number|string} hotelId - The ID of the hotel whose clients should be notified.
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

    const bookingStatus = (status && ALLOWED_INITIAL_STATUSES.includes(status)) ? status : 'booked';

    const booking = await Booking.create({
      RoomId: roomId,
      GuestId: guestId,
      startDate,
      endDate,
      price: overrideRate || roomDoc.price,
      totalPrice: overrideTotal || roomDoc.price, // Simplified logic for total, adjust if needed
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
    
    // Notify clients that new data is available
    notifyClients(roomDoc.HotelId);

    res.status(201).json(booking);
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
        return res.json([]); // Return empty if no hotel is specified
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
 * Update an existing booking.
 * Handles changes in dates, price, status, or room.
 * Notifies clients of the original and new hotel (if changed).
 */
export const updateBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id, { include: { model: Room, include: [Hotel] } });
    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }
    
    const originalHotelId = booking.Room.Hotel.id;

    await booking.update(req.body);

    const updatedBooking = await Booking.findByPk(req.params.id, { include: [{ model: Room, include: [Hotel] }, Guest] });
    const newHotelId = updatedBooking.Room.Hotel.id;

    // Update the associated accounting entry
    const entry = await AccountingEntry.findOne({ where: { BookingId: updatedBooking.id } });
    if (entry) {
      await entry.update({
        amount: updatedBooking.totalPrice,
        description: `Booking #${updatedBooking.id} (${updatedBooking.Guest?.name})`,
        date: updatedBooking.startDate,
        HotelId: newHotelId,
      });
    }

    // Notify clients of the original hotel
    notifyClients(originalHotelId);
    // If the booking was moved to a different hotel, notify its clients too
    if (originalHotelId !== newHotelId) {
        notifyClients(newHotelId);
    }

    res.json(updatedBooking);
  } catch (err) {
    next(err);
  }
};


/**
 * Cancel a booking by setting its status to 'cancelled'.
 * This is a soft-delete. It also creates a refund accounting entry.
 */
export const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id, { include: [{ model: Room, include: [Hotel] }, Guest] });
    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    const hotelId = booking.Room.Hotel.id;
    await booking.update({ status: 'cancelled' });

    // Create a refund entry
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
 * Use with caution.
 */
export const deleteBooking = async (req, res, next) => {
    try {
        const booking = await Booking.findByPk(req.params.id, { include: { model: Room, include: [Hotel] } });
        if (!booking) {
            return res.status(404).json({ msg: 'Booking not found' });
        }

        const hotelId = booking.Room.Hotel.id;

        // Delete associated accounting entries first to maintain referential integrity
        await AccountingEntry.destroy({ where: { BookingId: booking.id } });

        // Then delete the booking itself
        await booking.destroy();

        notifyClients(hotelId);

        res.json({ msg: 'Booking permanently deleted' });
    } catch (err) {
        next(err);
    }
};
