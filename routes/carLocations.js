import express from 'express';
import { carLocations } from '../controllers/carLocations.js';

const router = express.Router();

router.get('/cars/:model', carLocations);

export default router;
