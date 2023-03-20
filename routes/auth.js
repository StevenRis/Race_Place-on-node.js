import express from 'express';
import { loginGet, loginPost, logout } from '../controllers/auth.js';

const router = express.Router();

router.get('/', loginGet);
router.post('/', loginPost);
router.post('/', logout);

export default router;
