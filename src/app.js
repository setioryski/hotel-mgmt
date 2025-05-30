// src/app.js

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import expressLayouts from 'express-ejs-layouts';
import { fileURLToPath } from 'url';

import sequelize from './config/sequelize.js';
import authRoutes from './routes/authRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import guestRoutes from './routes/guestRoutes.js';
import hotelRoutes from './routes/hotelRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import errorHandler from './middlewares/errorHandler.js';

dotenv.config();

const app = express();

// Sync database
await sequelize.sync({ alter: true });
console.log('✅ Sequelize connected and synced');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static assets
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
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
