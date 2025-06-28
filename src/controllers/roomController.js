// src/controllers/roomController.js

import { validationResult } from 'express-validator';
import Room from '../models/Room.js';

/**
 * Create a new room.
 * Expects: { hotel, number, type, price, status, visible }
 */
export const createRoom = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { hotel, number, type, price, status, visible } = req.body;

    const room = await Room.create({
      number,
      type,
      price,
      status,
      visible,
      HotelId: hotel,
    });

    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
};

/**
 * Get all rooms, optionally filtered by hotel.
 * Query: ?hotel=<hotelId>
 */
export const getRooms = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.hotel) where.HotelId = req.query.hotel;

    const rooms = await Room.findAll({
      where,
      order: [['position', 'ASC']],
    });

    res.json(rooms);
  } catch (err) {
    next(err);
  }
};

/**
 * Get a single room by ID.
 */
export const getRoom = async (req, res, next) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) {
      return res.status(404).json({ msg: 'Room not found' });
    }
    res.json(room);
  } catch (err) {
    next(err);
  }
};

/**
 * Update a room.
 * Body may include: hotel, number, type, price, status, visible
 */
export const updateRoom = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) {
      return res.status(404).json({ msg: 'Room not found' });
    }

    const { hotel, number, type, price, status, visible } = req.body;

    await room.update({
      number:   number   ?? room.number,
      type:     type     ?? room.type,
      price:    price    ?? room.price,
      status:   status   ?? room.status,
      visible:  visible  ?? room.visible,
      HotelId:  hotel    ?? room.HotelId,
    });

    res.json(room);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a room by ID.
 */
export const deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) {
      return res.status(404).json({ msg: 'Room not found' });
    }

    await room.destroy();
    res.json({ msg: 'Room deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * Reorder rooms based on an array of IDs, saving each as its new `position`.
 * Expects: { order: [id1, id2, id3, ...] }
 */
export const reorderRooms = async (req, res, next) => {
  try {
    const { order } = req.body; // e.g. ["3","1","2"]

    if (!Array.isArray(order)) {
      return res.status(400).json({ msg: 'Order must be an array of room IDs' });
    }

    // Update each room's position in the given sequence
    for (let idx = 0; idx < order.length; idx++) {
      const id = order[idx];
      await Room.update(
        { position: idx },
        { where: { id } }
      );
    }

    res.json({ msg: 'Rooms reordered' });
  } catch (err) {
    next(err);
  }
};
