import express from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import * as ctrl from '../controllers/bookingController.js';
import { body } from 'express-validator';

const router = express.Router();
router.use(protect, authorize('admin'));

router.route('/')
  .post(
    [
      body('room').isMongoId(),
      body('guestEmail').isEmail(),
      body('startDate').isISO8601(),
      body('endDate').isISO8601()
    ],
    ctrl.createBooking
  )
  .get(ctrl.getBookings);

router.route('/:id')
  .put(ctrl.updateBooking)
  .delete(ctrl.cancelBooking);

export default router;
