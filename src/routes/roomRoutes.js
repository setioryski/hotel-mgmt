import express from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { body, query } from 'express-validator';
import * as ctrl from '../controllers/roomController.js';

const router = express.Router();

// all room routes require authentication + admin role
router.use(protect, authorize('admin'));

// GET /api/rooms?hotel=<hotelId>  → list rooms, optionally filtered by hotel
router.get(
  '/',
  [ query('hotel').optional().isMongoId().withMessage('Invalid hotel ID') ],
  ctrl.getRooms
);

// POST /api/rooms  → create new room
router.post(
  '/',
  [
    body('number').notEmpty().withMessage('Room number is required'),
    body('hotel').isMongoId().withMessage('Hotel ID must be a valid Mongo ID')
  ],
  ctrl.createRoom
);

// GET, PUT, DELETE a specific room by ID
router.route('/:id')
  .get(ctrl.getRoom)
  .put(ctrl.updateRoom)
  .delete(ctrl.deleteRoom);

export default router;
