import Hotel from '../models/Hotel.js';

export const createHotel = async (req, res, next) => {
  try { res.status(201).json(await Hotel.create(req.body)); }
  catch (err) { next(err); }
};
export const getHotels = async (req, res, next) => {
  try { res.json(await Hotel.find()); }
  catch (err) { next(err); }
};
export const getHotel = async (req, res, next) => {
  try { res.json(await Hotel.findById(req.params.id)); }
  catch (err) { next(err); }
};
export const updateHotel = async (req, res, next) => {
  try { res.json(await Hotel.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (err) { next(err); }
};
export const deleteHotel = async (req, res, next) => {
  try { await Hotel.findByIdAndDelete(req.params.id); res.json({ msg: 'Deleted' }); }
  catch (err) { next(err); }
};