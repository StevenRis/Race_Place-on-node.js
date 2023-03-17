import express from 'express';
import { favSetups } from '../controllers/favSetups.js';

const router = express.Router();

router.get('/account/favorite_setup/:setup_id/:model/:location', favSetups);

export default router;
