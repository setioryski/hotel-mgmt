import mongoose from 'mongoose';

const guestSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Guest', guestSchema);
