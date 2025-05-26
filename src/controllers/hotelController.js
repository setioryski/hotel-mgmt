import Hotel from '../models/Hotel.js';

export const createHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.create(req.body);
    res.status(201).json(hotel);
  } catch (err) { next(err); }
};

export const getHotels = async (req, res, next) => {
  try {
    const hotels = await Hotel.find();
    res.json(hotels);
  } catch (err) { next(err); }
};

export const getHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    res.json(hotel);
  } catch (err) { next(err); }
};

export const updateHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(hotel);
  } catch (err) { next(err); }
};

export const deleteHotel = async (req, res, next) => {
  try {
    await Hotel.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Deleted' });
  } catch (err) { next(err); }
};
