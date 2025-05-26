import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Hotel from '../models/Hotel.js';
import Room from '../models/Room.js';
import Guest from '../models/Guest.js';

const run = async () => {
  await connectDB();

  const adminPass = await bcrypt.hash('AdminPass123', 10);
  await User.create({
    name: 'Admin',
    email: 'admin@hotel.com',
    password: adminPass,
    role: 'admin'
  });

  const hotel = await Hotel.create({
    name: 'Grand Plaza',
    address: '123 Main St',
    contact: '0123456789',
    basePrice: 100,
    seasonalMultipliers: [
      { month: 12, multiplier: 1.5 },
      { month: 1,  multiplier: 1.2 }
    ],
    totalRooms: 10
  });

  for (let i = 1; i <= hotel.totalRooms; i++) {
    await Room.create({ number: `${i}`, type: 'standard', hotel: hotel._id });
  }

  const userPass = await bcrypt.hash('GuestPass123', 10);
  const user = await User.create({
    name: 'Guest One',
    email: 'guest@hotel.com',
    password: userPass,
    role: 'guest'
  });
  await Guest.create({
    name: 'Guest One',
    email: 'guest@hotel.com',
    phone: '08123456789',
    user: user._id
  });

  console.log('Seeding completed');
  process.exit();
};
run();
