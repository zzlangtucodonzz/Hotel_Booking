import express from 'express';
import {
  getInventoryCalendar,
  addPriceOverride,
  blockRoom
} from '../controllers/inventoryController.js';

const router = express.Router();

router.get('/calendar', getInventoryCalendar);
router.post('/override-price', addPriceOverride);
router.post('/block-room', blockRoom);

export default router;
