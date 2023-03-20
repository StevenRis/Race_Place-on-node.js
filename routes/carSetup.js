import express from 'express';
import { carSetup } from '../controllers/carSetup.js';

const router = express.Router();

router.get('/cars/:model/:location', carSetup);

export default router;
