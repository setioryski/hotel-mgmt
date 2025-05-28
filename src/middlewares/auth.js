import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const isDevBypass = process.env.NODE_ENV !== 'production';

export const protect = async (req, res, next) => {
  if (isDevBypass) {
    // 🔓 DEV MODE BYPASS — Always inject fake admin
    req.user = {
      id: 1,
      name: 'Dev Admin',
      email: 'admin@hotel.com',
      role: 'admin'
    };
    return next();
  }

  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    if (!req.originalUrl.startsWith('/api/')) return res.redirect('/login');
    return res.status(401).json({ msg: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findByPk(decoded.id);
    if (!req.user) throw new Error('User not found');
    next();
  } catch (err) {
    res.clearCookie('token');
    if (!req.originalUrl.startsWith('/api/')) return res.redirect('/login');
    return res.status(401).json({ msg: 'Invalid token' });
  }
};

export const authorize = role => (req, res, next) => {
  if (req.user?.role !== role) {
    if (!req.originalUrl.startsWith('/api/')) {
      return res.status(403).render('error', { msg: 'Access denied', user: req.user });
    }
    return res.status(403).json({ msg: 'Forbidden' });
  }
  next();
};
