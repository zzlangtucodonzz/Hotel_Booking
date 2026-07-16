import { Router } from 'express';
import { validateCoupon } from '../controllers/couponController.js';

const router = Router();

// POST /api/coupons/validate
router.post('/validate', validateCoupon);

export default router;
