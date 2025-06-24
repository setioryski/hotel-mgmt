// src/controllers/accountingController.js

import { validationResult } from 'express-validator';
import { Op } from 'sequelize';
import AccountingEntry from '../models/AccountingEntry.js';
import Hotel from '../models/Hotel.js';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import Guest from '../models/Guest.js';

/**
 * GET /api/accountings?hotel=:hotelId
 * Returns both persisted accounting entries and, for any booking
 * without one, a generated “income” entry.
 */
export const getEntries = async (req, res, next) => {
  try {
    const hotelId = req.query.hotel;
    if (!hotelId) {
      return res.status(400).json({ error: 'Missing hotel query parameter' });
    }
    const hotel = await Hotel.findByPk(hotelId);
    if (!hotel) {
      return res.status(404).json({ error: 'Hotel not found' });
    }

    // 1. Fetch all rooms in this hotel
    const rooms = await Room.findAll({
      where: { HotelId: hotelId },
      attributes: ['id']
    });
    const roomIds = rooms.map(r => r.id);

    // 2. Persisted entries for this hotel
    const persisted = await AccountingEntry.findAll({
      where: { HotelId: hotelId }
    });

    // 3. All non-cancelled bookings for those rooms
    const bookings = await Booking.findAll({
      where: {
        RoomId: { [Op.in]: roomIds },
        status: { [Op.ne]: 'cancelled' }
      },
      include: [{ model: Guest, attributes: ['name'] }]
    });

    // 4. Determine which bookings already have an entry
    const accounted = new Set(
      persisted
        .filter(e => e.BookingId)
        .map(e => e.BookingId.toString())
    );

    // 5. Generate entries for un-accounted bookings
    const generated = bookings
      .filter(b => !accounted.has(b.id.toString()))
      .map(b => ({
        id:          null,
        BookingId:   b.id,
        HotelId:     hotelId,
        type:        'income',
        amount:      parseFloat(b.totalPrice),
        description: `Booking #${b.id} (${b.Guest?.name || 'Guest'})`,
        date:        b.startDate,
        _generated:  true
      }));

    // 6. Mark persisted entries
    const persistedWithFlag = persisted.map(e => {
      const obj = e.toJSON();
      obj._generated = false;
      return obj;
    });

    // 7. Merge, sort by date desc
    const allEntries = persistedWithFlag
      .concat(generated)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return res.json(allEntries);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/accountings?hotel=:hotelId
 * Create a manual income/expense entry.
 */
export const addEntry = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const hotelId = req.query.hotel;
    if (!hotelId) return res.status(400).json({ error: 'Missing hotel query parameter' });

    const hotel = await Hotel.findByPk(hotelId);
    if (!hotel) return res.status(404).json({ error: 'Hotel not found' });

    const { type, amount, description, date } = req.body;
    const entry = await AccountingEntry.create({
      type,
      amount,
      description: description || '',
      date:        date || new Date(),
      HotelId:     hotelId
    });

    return res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/accountings/:id
 * Update an existing entry.
 */
export const updateEntry = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const entry = await AccountingEntry.findByPk(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    const { type, amount, description, date } = req.body;
    await entry.update({
      ...(type        !== undefined && { type }),
      ...(amount      !== undefined && { amount }),
      ...(description !== undefined && { description }),
      ...(date        !== undefined && { date })
    });

    return res.json(entry);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/accountings/:id
 * Delete an entry.
 */
export const deleteEntry = async (req, res, next) => {
  try {
    const entry = await AccountingEntry.findByPk(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    await entry.destroy();
    return res.status(204).end();
  } catch (err) {
    next(err);
  }
};
