import Room from '../models/Room.js';
import { validationResult } from 'express-validator';
import { Op } from 'sequelize';

export const createRoom = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const room = await Room.create(req.body);
    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
};

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

export const getRoom = async (req, res, next) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ msg: 'Room not found' });
    res.json(room);
  } catch (err) {
    next(err);
  }
};

export const updateRoom = async (req, res, next) => {
  try {
    const room = await Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ msg: 'Room not found' });

    await room.update(req.body);
    res.json(room);
  } catch (err) {
    next(err);
  }
};

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
