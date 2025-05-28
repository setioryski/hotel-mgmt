import express from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import * as ctrl from '../controllers/hotelController.js';
import { body, param } from 'express-validator';

const router = express.Router();
router.use(protect, authorize('admin'));

router.route('/')
  .get(ctrl.getHotels)
  .post(
    [
      body('name').notEmpty().withMessage('Name is required'),
      body('basePrice').isNumeric()
    ],
    ctrl.createHotel
  );

router.route('/:id')
  .get([ param('id').isString() ], ctrl.getHotel)
  .put([ param('id').isString() ], ctrl.updateHotel)
  .delete([ param('id').isString() ], ctrl.deleteHotel);

export default router;
