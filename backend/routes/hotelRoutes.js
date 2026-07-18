/* ================================================================
   Hotel Routes — RESTful API endpoints for Hotels CRUD
   ================================================================
   Mounted at /api/hotels in server.js
   ================================================================ */

import { Router } from 'express';
import {
  getAllHotels,
  getHotelById,
  createHotel,
  updateHotel,
  deleteHotel,
  getFormDropdowns,
  upload,
  getHotelRoomTypes,
} from '../controllers/hotelController.js';

const router = Router();

// GET  /api/hotels/meta/dropdowns  → Locations & PropertyTypes for form selects
// (must be defined BEFORE /:id to avoid route collision)
router.get('/meta/dropdowns', getFormDropdowns);

// GET  /api/hotels                 → list all hotels (with optional ?search= & ?status=)
router.get('/', getAllHotels);

// GET  /api/hotels/:id             → single hotel with images
router.get('/:id', getHotelById);

// GET  /api/hotels/:id/room-types  → room types and amenities for hotel
router.get('/:id/room-types', getHotelRoomTypes);

// POST /api/hotels                 → create hotel (multipart/form-data with image)
router.post('/', upload.single('image'), createHotel);

// PUT  /api/hotels/:id             → update hotel (multipart/form-data with optional image)
router.put('/:id', upload.single('image'), updateHotel);

// DELETE /api/hotels/:id           → delete hotel
router.delete('/:id', deleteHotel);

export default router;
