import express from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import * as ctrl from '../controllers/roomController.js';
import { body } from 'express-validator';

const router = express.Router();
router.use(protect, authorize('admin'));

router.route('/')
  .post(
    [ body('number').exists(), body('hotel').isMongoId() ],
    ctrl.createRoom
  )
  .get(ctrl.getRooms);

router.route('/:id')
  .get(ctrl.getRoom)
  .put(ctrl.updateRoom)
  .delete(ctrl.deleteRoom);

export default router;
