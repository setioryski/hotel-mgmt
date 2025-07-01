import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * @description Protect routes by verifying JWT token.
 * Attaches the user to the request object (req.user).
 */
export const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header (for APIs) or cookies (for web)
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  // Ensure token exists
  if (!token) {
    // For API requests, send JSON. For browser requests, redirect.
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ success: false, msg: 'Not authorized, no token' });
    }
    return res.redirect('/login');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID from token payload and attach to request
    // Exclude password from the user object
    req.user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
    });

    if (!req.user) {
        throw new Error('User not found');
    }

    next();
  } catch (err) {
    // For API requests, send JSON. For browser requests, redirect.
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ success: false, msg: 'Not authorized, token failed' });
    }
    // Clear cookie and redirect on failure
    res.clearCookie('token');
    return res.redirect('/login');
  }
};

/**
 * @description Grant access to specific roles.
 * This middleware must run *after* the `protect` middleware.
 * @param {...string} roles - List of roles allowed to access the route.
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, msg: `Forbidden. User role '${req.user.role}' is not authorized to access this route.` });
    }
    next();
  };
};