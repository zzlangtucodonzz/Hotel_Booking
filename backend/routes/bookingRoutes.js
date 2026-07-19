import express from 'express';
import {
  getBookings,
  getGuestBookings,
  getBookingDetails,
  updateBookingStatus,
  createBooking,
  syncPaymentStatus,
  verifyPayment,
  getUserRewardHistory
} from '../controllers/bookingController.js';
import { verifyToken, verifyAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/guest', getGuestBookings);
router.get('/users/:userId/reward-history', verifyToken, getUserRewardHistory);
router.get('/', verifyToken, getBookings);
router.get('/:id', verifyToken, getBookingDetails);
router.post('/', createBooking);
router.post('/verify-payment', verifyPayment);
router.put('/sync-payment', verifyToken, syncPaymentStatus);
router.put('/:id/status', verifyToken, verifyAdmin, updateBookingStatus);

export default router;
