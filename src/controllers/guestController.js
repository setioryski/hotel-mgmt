import Guest from '../models/Guest.js';

export const createGuest = async (req, res, next) => {
  try {
    const guest = await Guest.create(req.body);
    res.status(201).json(guest);
  } catch (err) {
    next(err);
  }
};

export const getGuests = async (req, res, next) => {
  try {
    const guests = await Guest.findAll();
    res.json(guests);
  } catch (err) {
    next(err);
  }
};

export const getGuest = async (req, res, next) => {
  try {
    const guest = await Guest.findByPk(req.params.id);
    if (!guest) return res.status(404).json({ msg: 'Guest not found' });
    res.json(guest);
  } catch (err) {
    next(err);
  }
};

export const updateGuest = async (req, res, next) => {
  try {
    const guest = await Guest.findByPk(req.params.id);
    if (!guest) return res.status(404).json({ msg: 'Guest not found' });

    await guest.update(req.body);
    res.json(guest);
  } catch (err) {
    next(err);
  }
};

export const deleteGuest = async (req, res, next) => {
  try {
    const guest = await Guest.findByPk(req.params.id);
    if (!guest) return res.status(404).json({ msg: 'Guest not found' });

    await guest.destroy();
    res.json({ msg: 'Deleted' });
  } catch (err) {
    next(err);
  }
};
