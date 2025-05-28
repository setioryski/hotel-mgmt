import Room from '../models/Room.js';
import { validationResult } from 'express-validator';

// Create a new room
export const createRoom = async (req, res, next) => {
  // handle validation errors first
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { number, type, priceOverride, status, hotel } = req.body;
    const room = new Room({ number, type, priceOverride, status, hotel });
    await room.save();
    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
};

// Get all rooms (optionally filtered by hotel)
export const getRooms = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.hotel) filter.hotel = req.query.hotel;
    const rooms = await Room.find(filter);
    res.json(rooms);
  } catch (err) {
    next(err);
  }
};

// Get a single room by ID
export const getRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ msg: 'Room not found' });
    res.json(room);
  } catch (err) {
    next(err);
  }
};

// Update a room
export const updateRoom = async (req, res, next) => {
  try {
    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!room) return res.status(404).json({ msg: 'Room not found' });
    res.json(room);
  } catch (err) {
    next(err);
  }
};

// Delete a room
export const deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) return res.status(404).json({ msg: 'Room not found' });
    res.json({ msg: 'Room deleted' });
  } catch (err) {
    next(err);
  }
};
