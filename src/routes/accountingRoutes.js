// src/routes/accountingRoutes.js

import express from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { query, body, param } from 'express-validator';
import * as ctrl from '../controllers/accountingController.js';

const router = express.Router();

// All routes require admin
router.use(protect, authorize('admin'));

// List entries for a hotel
router.get(
  '/',
  [
    query('hotel').isString().withMessage('Invalid hotel ID'),
    query('startDate').optional().isISO8601().withMessage('Start date must be YYYY-MM-DD'),
    query('endDate').optional().isISO8601().withMessage('End date must be YYYY-MM-DD')
  ],
  ctrl.getEntries
);

// Add manual income/expense
router.post(
  '/',
  [
    query('hotel').isString().withMessage('Invalid hotel ID'),
    body('type').isIn(['income','expense']).withMessage('Type must be income or expense'),
    body('amount').isDecimal().withMessage('Amount must be a decimal'),
    body('date').optional().isISO8601().withMessage('Date must be YYYY-MM-DD'),
    body('description').optional().isString(),
  ],
  ctrl.addEntry
);

// Update an entry
router.put(
  '/:id',
  [
    param('id').isString().withMessage('Invalid entry ID'),
    body('type').optional().isIn(['income','expense']),
    body('amount').optional().isDecimal(),
    body('date').optional().isISO8601(),
    body('description').optional().isString(),
  ],
  ctrl.updateEntry
);

// Delete an entry
router.delete(
  '/:id',
  [ param('id').isString().withMessage('Invalid entry ID') ],
  ctrl.deleteEntry
);

export default router;