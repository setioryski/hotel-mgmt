// src/app.js

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import expressLayouts from 'express-ejs-layouts';
import { fileURLToPath } from 'url';

import sequelize from './config/sequelize.js';

// Import all models so that associations are registered before sync:
import Hotel from './models/Hotel.js';
import Room from './models/Room.js';
import Guest from './models/Guest.js';
import User from './models/User.js';
import Booking from './models/Booking.js';
import RoomBlock from './models/RoomBlock.js';      // <-- new
// Note: Hotel, Room, Guest, User, Booking are already being imported in their controllers/models.
// By importing RoomBlock here, Sequelize knows about the associations on sync.

import authRoutes from './routes/authRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import guestRoutes from './routes/guestRoutes.js';
import hotelRoutes from './routes/hotelRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import blockRoutes from './routes/blockRoutes.js'; // <-- new

import errorHandler from './middlewares/errorHandler.js';

dotenv.config();

const app = express();

// Sync database (creates tables / applies associations)
await sequelize.sync({ alter: true });
console.log('✅ Sequelize connected and synced');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static assets
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../public')));

// EJS + layouts
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');  // uses views/layout.ejs

// API routes
app.use('/api/auth',     authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/guests',   guestRoutes);
app.use('/api/hotels',   hotelRoutes);
app.use('/api/rooms',    roomRoutes);
app.use('/api/blocks',   blockRoutes); // <-- new

// Page (EJS) routes – now with explicit titles
app.get('/', (req, res) =>
  res.redirect('/admin/dashboard')
);

app.get('/admin/dashboard', (req, res) =>
  res.render('admin/dashboard', { title: 'Admin Dashboard' })
);

app.get('/admin/hotels', (req, res) =>
  res.render('admin/hotels', { title: 'Manage Hotels' })
);

app.get('/admin/calendar', (req, res) =>
  res.render('admin/calendar', { title: 'Booking Calendar' })
);

app.get('/login', (req, res) =>
  res.render('auth/login', { title: 'Login' })
);

app.get('/register', (req, res) =>
  res.render('auth/register', { title: 'Register' })
);

// Error handler (last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
