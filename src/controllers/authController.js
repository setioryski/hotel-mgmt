import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const { JWT_SECRET, JWT_EXPIRES_IN } = process.env;

// Convert JWT_EXPIRES_IN (in seconds) into milliseconds for cookie maxAge
const cookieMaxAge = () => {
  const secs = parseInt(JWT_EXPIRES_IN, 10);
  return Number.isNaN(secs) ? 24 * 60 * 60 * 1000 : secs * 1000;
};

// ─── REGISTER GUEST ────────────────────────────────────────────────────────────
export const registerGuest = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hash,
      role: 'guest'
    });
    res.status(201).json({ msg: 'Registered', id: user._id });
  } catch (err) {
    next(err);
  }
};

// ─── LOGIN ──────────────────────────────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    // Create JWT payload with user ID and role
    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Log for debugging
    console.log('🌟 login controller: setting cookie for', user.email);

    // Set cookie so protect middleware can read it on page loads
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge()
    });

    // Also return the token in JSON if you need it for API calls
    res.json({ token });
  } catch (err) {
    next(err);
  }
};

// ─── LOGOUT ─────────────────────────────────────────────────────────────────────
export const logout = (req, res) => {
  // Clear the cookie client-side
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  res.json({ msg: 'Logged out' });
};
