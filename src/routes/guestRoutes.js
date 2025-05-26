import express from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import * as ctrl from '../controllers/guestController.js';
import { body } from 'express-validator';

const router = express.Router();
router.use(protect);

router.route('/')
  .post(authorize('admin'), [ body('email').isEmail() ], ctrl.createGuest)
  .get(authorize('admin'), ctrl.getGuests);

router.route('/:id')
  .get(ctrl.getGuest)
  .put(ctrl.updateGuest)
  .delete(ctrl.deleteGuest);

export default router;
