import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  guest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guest',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['confirmed','cancelled','completed'],
    default: 'confirmed'
  },
  price: {
    type: Number,
    required: true
  }
}, { timestamps: true });

// prevent overlapping bookings on same room
bookingSchema.index({ room: 1, startDate: 1, endDate: 1 });

export default mongoose.model('Booking', bookingSchema);
