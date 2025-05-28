// src/app.js
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';

import sequelize from './config/sequelize.js';
import authRoutes from './routes/authRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import guestRoutes from './routes/guestRoutes.js';
import hotelRoutes from './routes/hotelRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import errorHandler from './middlewares/errorHandler.js';
import { protect, authorize } from './middlewares/auth.js';

dotenv.config();

const app = express();

// Sync Sequelize DB
await sequelize.sync({ alter: true });
console.log('✅ Sequelize connected and synced');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files and EJS views
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../public')));
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/rooms', roomRoutes);

// View Routes (protected)
app.get('/', (req, res) => res.redirect('/admin/dashboard'));

app.get('/admin/dashboard', protect, authorize('admin'), (req, res) =>
  res.render('admin/dashboard', { user: req.user })
);

app.get('/admin/calendar', protect, authorize('admin'), (req, res) =>
  res.render('admin/calendar', { user: req.user })
);

app.get('/admin/hotels', protect, authorize('admin'), (req, res) =>
  res.render('admin/hotels', { user: req.user })
);

// Public Auth Views
app.get('/login', (req, res) => res.render('auth/login'));
app.get('/register', (req, res) => res.render('auth/register'));

// Error Handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
