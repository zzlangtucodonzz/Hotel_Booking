import { Router } from 'express';
import {
  getAllProperties,
  getPropertyById,
  searchProperties,
} from '../controllers/propertyController.js';


const router = Router();

// GET /api/properties         → list all properties
router.get('/', getAllProperties);

// GET /api/properties/search?q= → search by name / city / country
router.get('/search', searchProperties);

// GET /api/properties/:id     → single property with details
router.get('/:id', getPropertyById);


export default router;
