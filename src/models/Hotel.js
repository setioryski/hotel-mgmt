import mongoose from 'mongoose';

const hotelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: String,
  contact: String,
  basePrice: { type: Number, required: true },
  seasonalMultipliers: [{ month: Number, multiplier: Number }],
  totalRooms: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Hotel', hotelSchema);
