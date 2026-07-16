import express from 'express';
import {
    getRoomTypesByHotel,
    createRoomType,
    updateRoomType,
    deleteRoomType
} from '../controllers/roomTypeController.js';

const router = express.Router();

router.get('/', getRoomTypesByHotel);
router.post('/', createRoomType);
router.put('/:id', updateRoomType);
router.delete('/:id', deleteRoomType);

export default router;
