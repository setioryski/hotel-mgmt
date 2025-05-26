import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Protect routes by verifying JWT from Authorization header or cookie.
 */
export const protect = async (req, res, next) => {
  let token;

  // 1) Check for Bearer token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 2) Fallback to token cookie (HttpOnly)
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ msg: 'Not authenticated' });
  }

  try {
    // Verify and decode
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach user to request, excluding password
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ msg: 'User not found' });
    }
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ msg: 'Token invalid' });
  }
};

/**
 * Authorize based on user role.
 * Usage: authorize('admin') or authorize('guest')
 */
export const authorize = (role) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ msg: 'Not authenticated' });
  }
  if (req.user.role !== role) {
    return res.status(403).json({ msg: 'Forbidden' });
  }
  next();
};
