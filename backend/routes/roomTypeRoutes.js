import express from 'express';
import {
    getRoomTypesByHotel,
    createRoomType,
    updateRoomType,
    deleteRoomType
} from '../controllers/roomTypeController.js';
import { verifyToken, verifyAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getRoomTypesByHotel);
router.post('/', verifyToken, verifyAdmin, createRoomType);
router.put('/:id', verifyToken, verifyAdmin, updateRoomType);
router.delete('/:id', verifyToken, verifyAdmin, deleteRoomType);

export default router;
