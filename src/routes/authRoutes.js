import express from 'express';
import { registerGuest, login } from '../controllers/authController.js';
import { body } from 'express-validator';

const router = express.Router();
router.post(
  '/register',
  [ body('email').isEmail(), body('password').isLength({ min: 6 }) ],
  registerGuest
);
router.post(
  '/login',
  [ body('email').isEmail(), body('password').exists() ],
  login
);

export default router;
