import express from 'express';
import { addToFav } from '../controllers/addToFav.js';

const router = express.Router();

router.post('/', addToFav);

export default router;
