// src/middlewares/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * @description Protect routes by verifying JWT token.
 * Attaches the user to req.user and to res.locals.user for EJS.
 */
export const protect = async (req, res, next) => {
  let token;

  // 1) Look for Bearer token in headers (API) or HttpOnly cookie (web)
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  // 2) If no token, block access
  if (!token) {
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(401).json({ success: false, msg: 'Not authorized, no token' });
    }
    return res.redirect('/login');
  }

  try {
    // 3) Verify & decode
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4) Look up user, exclude password
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // 5) Attach to req and make available to EJS
    req.user = user;
    res.locals.user = user;

    next();
  } catch (err) {
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(401).json({ success: false, msg: 'Not authorized, token failed' });
    }
    // clear bad cookie and force login
    res.clearCookie('token');
    return res.redirect('/login');
  }
};

/**
 * @description Grant access to specific roles.
 * Must run *after* protect.
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      // For API endpoints:
      if (req.originalUrl.startsWith('/api/')) {
        return res.status(403).json({
          success: false,
          msg: `Forbidden. Role '${req.user?.role}' not permitted.`,
        });
      }
      // For web pages:
      return res.status(403).render('error', {
        message: 'Forbidden: you do not have access to this page.',
      });
    }
    next();
  };
};
