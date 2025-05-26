import Guest from '../models/Guest.js';

export const createGuest = async (req, res, next) => {
  try {
    const g = await Guest.create(req.body);
    res.status(201).json(g);
  } catch (err) { next(err); }
};

export const getGuests = async (req, res, next) => {
  try {
    res.json(await Guest.find());
  } catch (err) { next(err); }
};

export const getGuest = async (req, res, next) => {
  try {
    res.json(await Guest.findById(req.params.id));
  } catch (err) { next(err); }
};

export const updateGuest = async (req, res, next) => {
  try {
    const g = await Guest.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(g);
  } catch (err) { next(err); }
};

export const deleteGuest = async (req, res, next) => {
  try {
    await Guest.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Deleted' });
  } catch (err) { next(err); }
};
