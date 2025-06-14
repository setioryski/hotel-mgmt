// src/controllers/roomController.js

import Room from '../models/Room.js';
import { validationResult } from 'express-validator';

/**
 * Create a new room, mapping `req.body.hotel` → `Room.HotelId`.
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
      HotelId: hotel,              // ← map incoming hotel ID to the FK column
    });

    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch all rooms, optionally filtered by hotel.
 */
export const getRooms = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.hotel) filter.HotelId = req.query.hotel;

    const rooms = await Room.findAll({ where: filter });
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
 * Update a room (including re-mapping `hotel` → `HotelId`).
 */
export const updateRoom = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const roomDoc = await Room.findByPk(req.params.id);
    if (!roomDoc) return res.status(404).json({ msg: 'Room not found' });

    const { hotel, number, type, price, status } = req.body;

    await roomDoc.update({
      number,
      type,
      price,
      status,
      HotelId: hotel,
    });

    res.json(roomDoc);
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
