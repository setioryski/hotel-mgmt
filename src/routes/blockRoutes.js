// src/routes/blockRoutes.js

import express from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { createBlock, getBlocks, deleteBlock } from '../controllers/blockController.js';

const router = express.Router();

// All block routes require admin role
router.use(protect, authorize('admin'));

router.post('/', createBlock);
router.get('/', getBlocks);
router.delete('/:id', deleteBlock);

export default router;
