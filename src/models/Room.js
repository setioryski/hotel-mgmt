import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['standard','deluxe','suite'],
    default: 'standard'
  },
  priceOverride: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['available','maintenance'],
    default: 'available'
  },
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  }
}, { timestamps: true });

// ensure fast lookup by hotel + number if needed
roomSchema.index({ hotel: 1, number: 1 });

export default mongoose.model('Room', roomSchema);
