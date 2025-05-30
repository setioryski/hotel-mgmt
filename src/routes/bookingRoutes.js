// src/routes/bookingRoutes.js

import express           from 'express';
import { protect,
         authorize }      from '../middlewares/auth.js';
import { body,
         param,
         query }         from 'express-validator';
import * as ctrl         from '../controllers/bookingController.js';

const router = express.Router();

// all booking routes require an authenticated admin
router.use(protect, authorize('admin'));

// list & filter
router.get(
  '/',
  [
    query('hotel')
      .optional()
      .isString()
      .withMessage('Invalid hotel ID')
  ],
  ctrl.getBookings
);

// create
router.post(
  '/',
  [
    body('room')
      .isString()
      .withMessage('Room ID must be a string'),
    body('guest')
      .isString()
      .withMessage('Guest ID must be a string'),
    body('startDate')
      .isISO8601()
      .withMessage('Invalid check-in date'),
    body('endDate')
      .isISO8601()
      .withMessage('Invalid check-out date')
  ],
  ctrl.createBooking
);

// fetch one, update or cancel
router
  .route('/:id')
  .get(
    [
      param('id')
        .isString()
        .withMessage('Invalid booking ID')
    ],
    ctrl.getBooking
  )
  .put(
    [
      param('id')
        .isString()
        .withMessage('Invalid booking ID')
    ],
    ctrl.updateBooking
  )
  .delete(
    [
      param('id')
        .isString()
        .withMessage('Invalid booking ID')
    ],
    ctrl.cancelBooking
  );

export default router;
