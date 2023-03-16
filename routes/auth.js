import express from 'express';
import { loginGet, loginPost } from '../controllers/auth.js';

const router = express.Router();

router.get('/', loginGet);
router.post('/', loginPost);

export default router;
