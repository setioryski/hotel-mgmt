import express from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { body, param, query } from 'express-validator';
import * as ctrl from '../controllers/bookingController.js';

const router = express.Router();

router.use(protect, authorize('admin'));

router.get(
  '/',
  [ query('hotel').optional().isString().withMessage('Invalid hotel ID') ],
  ctrl.getBookings
);

router.post(
  '/',
  [
    body('room').isString().withMessage('Room ID must be a string'),
    body('guest').isString().withMessage('Guest ID must be a string'),
    body('startDate').isISO8601(),
    body('endDate').isISO8601()
  ],
  ctrl.createBooking
);

router
  .route('/:id')
  .put(
    [ param('id').isString().withMessage('Invalid booking ID') ],
    ctrl.updateBooking
  )
  .delete(
    [ param('id').isString().withMessage('Invalid booking ID') ],
    ctrl.cancelBooking
  );

export default router;
