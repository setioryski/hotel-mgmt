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
import RoomBlock from './models/RoomBlock.js';
import AccountingEntry from './models/AccountingEntry.js';  // ← new

// Import API routes
import authRoutes from './routes/authRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import guestRoutes from './routes/guestRoutes.js';
import hotelRoutes from './routes/hotelRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import blockRoutes from './routes/blockRoutes.js';
import accountingRoutes from './routes/accountingRoutes.js'; // ← new

// Import auth middlewares
import { protect, authorize } from './middlewares/auth.js';
import errorHandler from './middlewares/errorHandler.js';

dotenv.config();

const app = express();

// Sync database (creates tables / applies associations)
await sequelize.sync({ alter: true });
console.log('✅ Sequelize connected and synced');

// Body + Cookie parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static assets
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../public')));

// EJS + layouts
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');

// --- API routes ---
app.use('/api/auth',     authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/guests',   guestRoutes);
app.use('/api/hotels',   hotelRoutes);
app.use('/api/rooms',    roomRoutes);
app.use('/api/blocks',   blockRoutes);

// --- Page routes (EJS) ---
app.get('/', (req, res) =>
  res.redirect('/admin/dashboard')
);

app.get('/admin/dashboard',
  protect,
  authorize('admin'),
  (req, res) =>
    res.render('admin/dashboard', { title: 'Admin Dashboard' })
);

app.get(
  '/admin/hotels',
  protect,
  authorize('admin'),
  (req, res) =>
    res.render('admin/hotels', { title: 'Manage Hotels' })
);

// — New: Manage this hotel’s rooms —
app.get(
  '/admin/hotels/:hotelId/rooms',
  protect,
  authorize('admin'),
  (req, res) =>
    res.render('admin/hotel_rooms', {
      title: 'Manage Rooms',
      hotelId: req.params.hotelId
    })
);

// — New: Manage this hotel’s guests —
app.get(
  '/admin/hotels/:hotelId/guests',
  protect,
  authorize('admin'),
  (req, res) =>
    res.render('admin/hotel_guests', {
      title: 'Manage Guests',
      hotelId: req.params.hotelId
    })
);

app.get(
  '/admin/hotels/:hotelId/calendar',
  protect,
  authorize('admin'),
  async (req, res, next) => {
    try {
      // look up the hotel
      const hotel = await Hotel.findByPk(req.params.hotelId);
      if (!hotel) {
        // render your 404 view if not found
        return res.status(404).render('404', { title: 'Not Found' });
      }
      // pass both hotelId and hotelName
      res.render('admin/hotel_calendar', {
        title:     'Booking Calendar',
        hotelId:   hotel.id,
        hotelName: hotel.name,
      });
    } catch (err) {
      next(err);
    }
  }
);

app.get(
  '/admin/hotels/:hotelId/accounting',
  protect,
  authorize('admin'),
  async (req, res, next) => {
    const hotel = await Hotel.findByPk(req.params.hotelId);
    if (!hotel) return res.status(404).render('404');
    res.render('admin/hotel_accounting', {
      hotelId:   hotel.id,
      hotelName: hotel.name,
    });
  }
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
