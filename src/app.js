import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import expressLayouts from 'express-ejs-layouts';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import authRoutes    from './routes/authRoutes.js';
import hotelRoutes   from './routes/hotelRoutes.js';
import roomRoutes    from './routes/roomRoutes.js';
import guestRoutes   from './routes/guestRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';

import errorHandler from './middlewares/errorHandler.js';
import { protect, authorize } from './middlewares/auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

// ─── Middleware ────────────────────────────────────────────────────────────────
// parse cookies
app.use(cookieParser());
// parse JSON bodies
app.use(express.json());
// parse URL-encoded bodies (for login/register forms)
app.use(express.urlencoded({ extended: true }));
// serve everything in /public at the web root (so /js/calendar.js works)
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── View Engine ───────────────────────────────────────────────────────────────
app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layout');

// ─── Public Pages ─────────────────────────────────────────────────────────────
app.get('/',       (req, res) => res.redirect('/login'));
app.get('/login',    (req, res) => res.render('auth/login',    { user: null }));
app.get('/register', (req, res) => res.render('auth/register', { user: null }));

// ─── After Login Redirect ───────────────────────────────────────────────────────
app.get('/dashboard', protect, (req, res) => {
  if (req.user.role === 'admin') return res.redirect('/admin/dashboard');
  res.redirect('/guest/dashboard');
});

// ─── Admin Pages ───────────────────────────────────────────────────────────────
app.get('/admin/dashboard', protect, authorize('admin'),
  (req, res) => res.render('admin/dashboard', { user: req.user }));
app.get('/admin/hotels', protect, authorize('admin'),
  (req, res) => res.render('admin/hotels', { user: req.user }));
app.get('/admin/calendar', protect, authorize('admin'),
  (req, res) => res.render('admin/calendar', { user: req.user }));

// ─── Guest Pages ───────────────────────────────────────────────────────────────
app.get('/guest/dashboard', protect, authorize('guest'),
  (req, res) => res.render('guest/dashboard', { user: req.user }));
app.get('/guest/profile', protect, authorize('guest'),
  (req, res) => res.render('guest/profile', { user: req.user }));

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/hotels',   hotelRoutes);
app.use('/api/rooms',    roomRoutes);
app.use('/api/guests',   guestRoutes);
app.use('/api/bookings', bookingRoutes);

// ─── 404 Handling ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ msg: 'Not Found' });
  }
  res.status(404).render('404', { user: req.user || null });
});

// ─── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser:    true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected');
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});
