// src/routes/hotelRoutes.js

import express from 'express';
import { body, param } from 'express-validator';
import { protect, authorize } from '../middlewares/auth.js';
import {
  getHotels,
  getHotel,
  createHotel,
  updateHotel,
  deleteHotel
} from '../controllers/hotelController.js';

const router = express.Router();

// All hotel‐management routes require admin privileges
router.use(protect, authorize('admin'));

// @route   GET /api/hotels
// @desc    List all hotels
// @access  Admin
router.get('/', getHotels);

// @route   POST /api/hotels
// @desc    Create a new hotel
// @access  Admin
router.post(
  '/',
  [
    body('name')
      .notEmpty().withMessage('Name is required'),
    body('address')
      .optional()
      .isString().withMessage('Address must be a string'),
    body('contact')
      .optional()
      .isString().withMessage('Contact must be a string'),
  ],
  createHotel
);

// @route   GET /api/hotels/:id
// @desc    Get a single hotel
// @access  Admin
router.get(
  '/:id',
  [
    param('id')
      .isInt().withMessage('Invalid hotel ID'),
  ],
  getHotel
);

// @route   PUT /api/hotels/:id
// @desc    Update an existing hotel
// @access  Admin
router.put(
  '/:id',
  [
    param('id')
      .isInt().withMessage('Invalid hotel ID'),
    body('name')
      .optional()
      .notEmpty().withMessage('Name cannot be empty'),
    body('address')
      .optional()
      .isString().withMessage('Address must be a string'),
    body('contact')
      .optional()
      .isString().withMessage('Contact must be a string'),
  ],
  updateHotel
);

// @route   DELETE /api/hotels/:id
// @desc    Delete a hotel
// @access  Admin
router.delete(
  '/:id',
  [
    param('id')
      .isInt().withMessage('Invalid hotel ID'),
  ],
  deleteHotel
);

export default router;
