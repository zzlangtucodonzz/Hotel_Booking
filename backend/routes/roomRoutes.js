import express from 'express';
import {
    getRoomsByType,
    getRoomsByHotel,
    createRoom,
    bulkCreateRooms,
    updateRoom,
    deleteRoom
} from '../controllers/roomController.js';
import { verifyToken, verifyAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getRoomsByType);
router.get('/hotel/:hotelId', getRoomsByHotel);
router.post('/', verifyToken, verifyAdmin, createRoom);
router.post('/bulk', verifyToken, verifyAdmin, bulkCreateRooms);
router.put('/:id', verifyToken, verifyAdmin, updateRoom);
router.delete('/:id', verifyToken, verifyAdmin, deleteRoom);

export default router;
