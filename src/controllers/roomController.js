import Room from '../models/Room.js';

export const createRoom = async (req, res, next) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json(room);
  } catch (err) { next(err); }
};

export const getRooms = async (req, res, next) => {
  try {
    res.json(await Room.find());
  } catch (err) { next(err); }
};

export const getRoom = async (req, res, next) => {
  try {
    res.json(await Room.findById(req.params.id));
  } catch (err) { next(err); }
};

export const updateRoom = async (req, res, next) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(room);
  } catch (err) { next(err); }
};

export const deleteRoom = async (req, res, next) => {
  try {
    await Room.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Deleted' });
  } catch (err) { next(err); }
};
