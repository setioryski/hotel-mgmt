// src/routes/roomRoutes.js

import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middlewares/auth.js';
import {
  createRoom,
  getRooms,
  getRoom,
  updateRoom,
  deleteRoom,
} from '../controllers/roomController.js';

const router = express.Router();

// All room-management routes require admin privileges
router.use(protect, authorize('admin'));

// Create
router.post(
  '/',
  [
    body('hotel', 'Hotel is required').notEmpty(),
    body('number', 'Room number is required').notEmpty(),
    body('type', 'Room type is required').notEmpty(),
    body('price', 'Price must be a decimal').isDecimal(),
    body('status').optional().isIn(['available', 'booked']),
  ],
  createRoom
);

// Read list + single
router.get('/', getRooms);
router.get('/:id', getRoom);

// Update
router.put(
  '/:id',
  [
    body('hotel').optional().notEmpty(),
    body('number').optional().notEmpty(),
    body('type').optional().notEmpty(),
    body('price').optional().isDecimal(),
    body('status').optional().isIn(['available', 'booked']),
  ],
  updateRoom
);

// Delete
router.delete('/:id', deleteRoom);

export default router;
