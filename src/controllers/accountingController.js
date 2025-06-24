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
 * Returns all accounting entries for a hotel from the database.
 * Automatically creates and persists income entries for any bookings that are missing one.
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

    // 2. All non-cancelled bookings for those rooms
    const bookings = await Booking.findAll({
      where: {
        RoomId: { [Op.in]: roomIds },
        status: { [Op.ne]: 'cancelled' }
      },
      include: [{ model: Guest, attributes: ['name'] }]
    });

    // 3. Find which bookings already have a persisted entry
    const bookingIdsWithEntries = await AccountingEntry.findAll({
      where: {
        BookingId: { [Op.in]: bookings.map(b => b.id) }
      },
      attributes: ['BookingId']
    }).then(entries => new Set(entries.map(e => e.BookingId.toString())));

    // 4. Filter for bookings that do NOT have an entry and create them
    const newEntriesToCreate = bookings
      .filter(b => !bookingIdsWithEntries.has(b.id.toString()))
      .map(b => ({
        BookingId:   b.id,
        HotelId:     hotelId,
        type:        'income',
        amount:      parseFloat(b.totalPrice),
        description: `Booking #${b.id} (${b.Guest?.name || 'Guest'})`,
        date:        b.startDate,
      }));

    if (newEntriesToCreate.length > 0) {
      await AccountingEntry.bulkCreate(newEntriesToCreate);
    }

    // 5. Fetch ALL entries for the hotel (now including the newly created ones)
    const allEntries = await AccountingEntry.findAll({
      where: { HotelId: hotelId },
      order: [['date', 'DESC']]
    });

    // 6. Return the complete, clean list from the database
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