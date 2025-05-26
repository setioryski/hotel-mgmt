import express from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import * as ctrl from '../controllers/hotelController.js';
import { body } from 'express-validator';

const router = express.Router();
router.use(protect, authorize('admin'));

router.route('/')
  .post(
    [ body('name').exists(), body('basePrice').isNumeric() ],
    ctrl.createHotel
  )
  .get(ctrl.getHotels);

router.route('/:id')
  .get(ctrl.getHotel)
  .put(ctrl.updateHotel)
  .delete(ctrl.deleteHotel);

export default router;
