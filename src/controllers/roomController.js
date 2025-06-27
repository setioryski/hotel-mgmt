// src/controllers/roomController.js
import Room from '../models/Room.js';
import { validationResult } from 'express-validator';

/**
 * Create a new room.
 */
export const createRoom = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { hotel, number, type, price, status } = req.body;
    const room = await Room.create({
      number,
      type,
      price,
      status,
      HotelId: hotel
      // position will default to 0
    });
    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch all rooms, optionally filtered by hotel,
 * always sorted by position ASC so ordering persists.
 */
export const getRooms = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.hotel) filter.HotelId = req.query.hotel;

    const rooms = await Room.findAll({
      where: filter,
      order: [['position', 'ASC']]
    });
    res.json(rooms);
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch one room by PK.
 */
export const getRoom = async (req, res, next) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ msg: 'Room not found' });
    res.json(room);
  } catch (err) {
    next(err);
  }
};

/**
 * Update a room.
 */
export const updateRoom = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ msg: 'Room not found' });

    const { hotel, number, type, price, status } = req.body;
    await room.update({ number, type, price, status, HotelId: hotel });
    res.json(room);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a room.
 */
export const deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ msg: 'Room not found' });

    await room.destroy();
    res.json({ msg: 'Room deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * Reorder rooms after drag-and-drop.
 * Expects: { order: [ '3', '1', '4', ... ] }
 */
export const reorderRooms = async (req, res, next) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ msg: 'Invalid payload: expected array of IDs' });
    }
    // update each room’s position
    for (let idx = 0; idx < order.length; idx++) {
      await Room.update(
        { position: idx },
        { where: { id: order[idx] } }
      );
    }
    res.json({ msg: 'Room order updated' });
  } catch (err) {
    next(err);
  }
};
