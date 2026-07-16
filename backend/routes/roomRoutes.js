import express from 'express';
import {
    getRoomsByType,
    getRoomsByHotel,
    createRoom,
    bulkCreateRooms,
    updateRoom,
    deleteRoom
} from '../controllers/roomController.js';

const router = express.Router();

router.get('/', getRoomsByType);
router.get('/hotel/:hotelId', getRoomsByHotel);
router.post('/', createRoom);
router.post('/bulk', bulkCreateRooms);
router.put('/:id', updateRoom);
router.delete('/:id', deleteRoom);

export default router;
