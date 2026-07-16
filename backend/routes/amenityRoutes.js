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

const router = express.Router();

// Master Catalog Routes
router.get('/', getAllAmenities);
router.post('/', createAmenity);
router.put('/:id', updateAmenity);
router.delete('/:id', deleteAmenity);

// Assignment Routes (could alternatively be nested under hotels/room-types routes, but placing here for cohesion)
router.get('/hotel/:hotelId', getHotelAmenities);
router.post('/hotel/:hotelId', syncHotelAmenities);

router.get('/room-type/:roomTypeId', getRoomTypeAmenities);
router.post('/room-type/:roomTypeId', syncRoomTypeAmenities);

export default router;
