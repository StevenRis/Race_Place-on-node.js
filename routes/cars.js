import express from 'express';
import { cars } from '../controllers/cars.js';

const router = express.Router();

router.get('/', cars);

export default router;
