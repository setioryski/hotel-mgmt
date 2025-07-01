import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const { JWT_SECRET, JWT_EXPIRES_IN } = process.env;

// Helper to calculate cookie expiration from a string like "1d" or "3600s"
const cookieMaxAge = (expiresIn) => {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1), 10);
    if (isNaN(value)) return 86400000; // Default to 1 day in ms

    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 86400000;
    }
};

// DRY function to set cookies and send token response
const sendTokenResponse = (user, statusCode, res) => {
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN || '1d'
    });

    const maxAgeMs = cookieMaxAge(JWT_EXPIRES_IN || '1d');

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: maxAgeMs,
    };

    res.cookie('token', token, cookieOptions);

    res.status(statusCode).json({
        success: true,
        role: user.role,
        token, // Optionally send token in body for stateless clients
    });
};

// Register a user with the 'guest' role
export const registerGuest = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword, role: 'guest' });
        sendTokenResponse(user, 201, res);
    } catch (err) {
        // Handle potential duplicate email error
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ success: false, msg: 'Email already exists.' });
        }
        next(err);
    }
};

// Login for any user
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, msg: 'Please provide an email and password' });
        }

        const user = await User.findOne({ where: { email } });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, msg: 'Invalid credentials' });
        }

        sendTokenResponse(user, 200, res);
    } catch (err) {
        next(err);
    }
};

// Logout user by clearing the cookie
export const logout = (req, res, next) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true,
    });
    res.status(200).json({ success: true, data: {} });
};