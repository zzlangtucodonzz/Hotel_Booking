import express from 'express';
import { createPaymentLink, handlePayOSWebhook } from '../controllers/paymentController.js';

const router = express.Router();

// POST /api/payments/create
// Creates a new payOS checkout link
router.post('/create', createPaymentLink);

// POST /api/payments/webhook
// Securely handles webhook notifications from payOS
router.post('/webhook', handlePayOSWebhook);

export default router;
