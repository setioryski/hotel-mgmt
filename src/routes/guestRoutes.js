// src/routes/guestRoutes.js
import { Router } from 'express';
import * as ctrl from '../controllers/guestController.js';

const router = Router();

// Create new guest, or fetch all guests
router.route('/')
  .post(ctrl.createGuest)
  .get(ctrl.getGuests);

// Operations on a single guest by ID
router.route('/:id')
  .get(ctrl.getGuest)
  .put(ctrl.updateGuest)
  .delete(ctrl.deleteGuest);

export default router;
