import express from 'express';
import {
    getAllAmenities,
    createAmenity,
    updateAmenity,
    deleteAmenity,
    getHotelAmenities,
    syncHotelAmenities,
    getRoomTypeAmenities,
    syncRoomTypeAmenities
} from '../controllers/amenityController.js';
import { verifyToken, verifyAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Master Catalog Routes
router.get('/', getAllAmenities);
router.post('/', verifyToken, verifyAdmin, createAmenity);
router.put('/:id', verifyToken, verifyAdmin, updateAmenity);
router.delete('/:id', verifyToken, verifyAdmin, deleteAmenity);

// Assignment Routes (could alternatively be nested under hotels/room-types routes, but placing here for cohesion)
router.get('/hotel/:hotelId', getHotelAmenities);
router.post('/hotel/:hotelId', verifyToken, verifyAdmin, syncHotelAmenities);

router.get('/room-type/:roomTypeId', getRoomTypeAmenities);
router.post('/room-type/:roomTypeId', verifyToken, verifyAdmin, syncRoomTypeAmenities);

export default router;
