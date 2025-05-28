import express from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import * as ctrl from '../controllers/guestController.js';
import { body, param } from 'express-validator';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(authorize('admin'), ctrl.getGuests)
  .post(
    authorize('admin'),
    [ body('email').isEmail() ],
    ctrl.createGuest
  );

router.route('/:id')
  .get(ctrl.getGuest)
  .put([ param('id').isString() ], ctrl.updateGuest)
  .delete([ param('id').isString() ], ctrl.deleteGuest);

export default router;
