import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import expressLayouts from 'express-ejs-layouts';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import hotelRoutes from './routes/hotelRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import guestRoutes from './routes/guestRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';

import errorHandler from './middlewares/errorHandler.js';
import { protect, authorize } from './middlewares/auth.js';

dotenv.config();

// __dirname helper for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────────
// parse cookies (for JWT fallback) and JSON bodies
app.use(cookieParser());
app.use(express.json());

// serve static assets from /public, disable default index.html
app.use(
  express.static(path.join(__dirname, '..', 'public'), {
    index: false
  })
);

// ─── VIEW ENGINE ────────────────────────────────────────────────────────────────
app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');

// ─── PAGE ROUTES ────────────────────────────────────────────────────────────────
// Redirect root to login
app.get('/', (req, res) => res.redirect('/login'));

// Public auth pages
app.get('/login',    (req, res) => res.render('auth/login',    { user: null }));
app.get('/register', (req, res) => res.render('auth/register', { user: null }));

// After login, redirect based on role
app.get('/dashboard', protect, (req, res) => {
  if (req.user.role === 'admin') {
    return res.redirect('/admin/dashboard');
  }
  res.redirect('/guest/dashboard');
});

// Admin pages (protected + admin-only)
app.get(
  '/admin/dashboard',
  protect,
  authorize('admin'),
  (req, res) => res.render('admin/dashboard', { user: req.user })
);
app.get(
  '/admin/hotels',
  protect,
  authorize('admin'),
  (req, res) => res.render('admin/hotels', { user: req.user })
);
app.get(
  '/admin/rooms',
  protect,
  authorize('admin'),
  (req, res) => res.render('admin/rooms', { user: req.user })
);
app.get(
  '/admin/guests',
  protect,
  authorize('admin'),
  (req, res) => res.render('admin/guests', { user: req.user })
);
app.get(
  '/admin/calendar',
  protect,
  authorize('admin'),
  (req, res) => res.render('admin/calendar', { user: req.user })
);

// Guest pages (protected + guest-only)
app.get(
  '/guest/dashboard',
  protect,
  authorize('guest'),
  (req, res) => res.render('guest/dashboard', { user: req.user })
);
app.get(
  '/guest/profile',
  protect,
  authorize('guest'),
  (req, res) => res.render('guest/profile', { user: req.user })
);

// ─── API ROUTES ────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/hotels',   hotelRoutes);
app.use('/api/rooms',    roomRoutes);
app.use('/api/guests',   guestRoutes);
app.use('/api/bookings', bookingRoutes);

// ─── 404 HANDLER ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ msg: 'Not Found' });
  }
  res.status(404).render('404', { user: req.user || null });
});

// ─── GLOBAL ERROR HANDLER ──────────────────────────────────────────────────────
app.use(errorHandler);

// ─── CONNECT TO MONGODB & START SERVER ────────────────────────────────────────
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser:    true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });
