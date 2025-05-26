import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  guest: { type: mongoose.Schema.Types.ObjectId, ref: 'Guest', required: true },
  startDate: Date,
  endDate: Date,
  status: { type: String, enum: ['confirmed','cancelled','completed'], default: 'confirmed' },
  price: Number
}, { timestamps: true });

bookingSchema.index({ room: 1, startDate: 1, endDate: 1 });
export default mongoose.model('Booking', bookingSchema);
