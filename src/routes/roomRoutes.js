import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middlewares/auth.js';
import {
  createRoom,
  getRooms,
  getRoom,
  updateRoom,
  deleteRoom,
  reorderRooms    // if you still use reorder
} from '../controllers/roomController.js';

const router = express.Router();

// All room-management routes require admin
router.use(protect, authorize('admin'));

// Create a room
router.post(
  '/',
  [
    body('hotel',    'Hotel is required').notEmpty(),
    body('number',   'Room number is required').notEmpty(),
    body('type',     'Room type is required').notEmpty(),
    body('price',    'Price must be a decimal').isDecimal(),
    body('status').optional().isIn(['available','booked']),
    body('visible').optional().isBoolean()    // ← NEW
  ],
  createRoom
);

// List & single fetch
router.get('/',    getRooms);
router.get('/:id', getRoom);

// Update a room
router.put(
  '/:id',
  [
    body('hotel').optional().notEmpty(),
    body('number').optional().notEmpty(),
    body('type').optional().notEmpty(),
    body('price').optional().isDecimal(),
    body('status').optional().isIn(['available','booked']),
    body('visible').optional().isBoolean()    // ← NEW
  ],
  updateRoom
);

// Delete
router.delete('/:id', deleteRoom);

// Reorder (if still used)
router.post('/reorder',
  [ body('order').isArray().withMessage('Order must be an array of IDs') ],
  reorderRooms
);

export default router;
