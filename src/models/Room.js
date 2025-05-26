import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  number: { type: String, required: true, index: true },
  type: String,
  priceOverride: Number,
  status: { type: String, enum: ['available','maintenance'], default: 'available' },
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true }
}, { timestamps: true });

export default mongoose.model('Room', roomSchema);
