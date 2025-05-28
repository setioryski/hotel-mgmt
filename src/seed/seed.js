import bcrypt from 'bcrypt';
import sequelize from '../config/sequelize.js';
import User from '../models/User.js';
import Hotel from '../models/Hotel.js';
import Room from '../models/Room.js';
import Guest from '../models/Guest.js';
import Booking from '../models/Booking.js';

await sequelize.sync({ force: true });

const hashedPassword = await bcrypt.hash('1234', 10);

await User.create({
  name: 'Admin',
  email: 'admin@hotel.com',
  password: hashedPassword,
  role: 'admin'
});

const guest = await Guest.create({
  name: 'Guest One',
  email: 'guest@hotel.com',
  phone: '08123456789'
});

const hotel = await Hotel.create({
  name: 'Grand Palace',
  address: 'Jl. Sunset 88',
  contact: '021-1234567'
});

const room = await Room.create({
  number: '101',
  type: 'Deluxe',
  price: 750000,
  status: 'available',
  HotelId: hotel.id
});

await Booking.create({
  RoomId: room.id,
  GuestId: guest.id,
  startDate: new Date('2025-06-01'),
  endDate: new Date('2025-06-03'),
  status: 'confirmed'
});

console.log('✅ Seed complete with admin password: 1234');
process.exit();
