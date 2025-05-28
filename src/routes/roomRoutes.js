import express from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import * as ctrl from '../controllers/roomController.js';
import { body, query, param } from 'express-validator';

const router = express.Router();
router.use(protect, authorize('admin'));

router.get(
  '/',
  [ query('hotel').optional().isString().withMessage('Invalid hotel ID') ],
  ctrl.getRooms
);

router.post(
  '/',
  [
    body('number').notEmpty().withMessage('Room number is required'),
    body('hotel').notEmpty().withMessage('Hotel ID is required'),
    body('priceOverride').optional().isNumeric(),
    body('status').optional().isIn(['available', 'maintenance']),
    body('type').optional().isIn(['standard', 'deluxe', 'suite'])
  ],
  ctrl.createRoom
);

router.route('/:id')
  .get([ param('id').isString() ], ctrl.getRoom)
  .put([ param('id').isString() ], ctrl.updateRoom)
  .delete([ param('id').isString() ], ctrl.deleteRoom);

export default router;
