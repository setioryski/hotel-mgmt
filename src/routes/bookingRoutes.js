import express from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { body, query, param } from 'express-validator';
import * as ctrl from '../controllers/bookingController.js';

const router = express.Router();

// All routes require authenticated admin
router.use(protect, authorize('admin'));

// GET /api/bookings?hotel=<hotelId>
router.get(
  '/',
  [
    query('hotel')
      .optional()
      .isMongoId()
      .withMessage('Invalid hotel ID'),
  ],
  ctrl.getBookings
);

// POST /api/bookings
router.post(
  '/',
  [
    body('room')
      .isMongoId()
      .withMessage('Room ID must be valid'),
    body('guest')
      .isMongoId()
      .withMessage('Guest ID must be valid'),
    body('startDate')
      .isISO8601()
      .withMessage('Start date must be ISO-8601'),
    body('endDate')
      .isISO8601()
      .withMessage('End date must be ISO-8601'),
  ],
  ctrl.createBooking
);

// PUT /api/bookings/:id  → update dates/status
// DELETE /api/bookings/:id → cancel booking
router
  .route('/:id')
  .put(
    [
      param('id')
        .isMongoId()
        .withMessage('Invalid booking ID'),
    ],
    ctrl.updateBooking
  )
  .delete(
    [
      param('id')
        .isMongoId()
        .withMessage('Invalid booking ID'),
    ],
    ctrl.cancelBooking
  );

export default router;
