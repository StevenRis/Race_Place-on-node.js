import express from 'express';
import { locations } from '../controllers/locations.js';

const router = express.Router();

router.get('/', locations);

export default router;
