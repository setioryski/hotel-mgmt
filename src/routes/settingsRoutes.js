import express from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import * as settingsController from '../controllers/settingsController.js';

const router = express.Router({ mergeParams: true });

// Semua rute di sini memerlukan otentikasi admin
router.use(protect, authorize('admin'));

// GET /api/settings/:hotelId/invoice
router.get('/:hotelId/invoice', settingsController.getInvoiceSettings);

// PUT /api/settings/:hotelId/invoice
router.put('/:hotelId/invoice', settingsController.updateInvoiceSettings);

export default router;