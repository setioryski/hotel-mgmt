import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config();

// Simple bypass for development: skip JWT and use role cookie
export const protect = (req, res, next) => {
  req.user = { role: req.cookies.role || 'guest' };
  next();
};

// No-op authorization
export const authorize = role => (req, res, next) => {
  next();
};