import { Router } from 'express';
import { registerUser, loginUser } from '../controllers/authController.js';

const router = Router();

// POST /api/auth/register → create a new user account
router.post('/register', registerUser);

// POST /api/auth/login → authenticate user, return JWT + redirect URL
router.post('/login', loginUser);

export default router;
