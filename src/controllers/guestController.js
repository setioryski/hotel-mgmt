// src/controllers/guestController.js
import Guest from '../models/Guest.js';

/**
 * Create a new guest
 */
export const createGuest = async (req, res, next) => {
  try {
    const guest = await Guest.create(req.body);
    res.status(201).json(guest);
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch all guests
 */
export const getGuests = async (req, res, next) => {
  try {
    const guests = await Guest.findAll();
    res.json(guests);
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch a single guest by ID
 */
export const getGuest = async (req, res, next) => {
  try {
    const guest = await Guest.findByPk(req.params.id);
    if (!guest) {
      return res.status(404).json({ msg: 'Guest not found' });
    }
    res.json(guest);
  } catch (err) {
    next(err);
  }
};

/**
 * Update a guest by ID
 */
export const updateGuest = async (req, res, next) => {
  try {
    const guest = await Guest.findByPk(req.params.id);
    if (!guest) {
      return res.status(404).json({ msg: 'Guest not found' });
    }
    await guest.update(req.body);
    res.json(guest);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a guest by ID
 */
export const deleteGuest = async (req, res, next) => {
  try {
    const guest = await Guest.findByPk(req.params.id);
    if (!guest) {
      return res.status(404).json({ msg: 'Guest not found' });
    }
    await guest.destroy();
    res.json({ msg: 'Guest deleted' });
  } catch (err) {
    next(err);
  }
};
