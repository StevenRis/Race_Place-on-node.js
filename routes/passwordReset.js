import express from 'express';
import { resetGet, resetPost } from '../controllers/passwordReset.js';

const router = express.Router();

router.get('/', resetGet);
router.post('/', resetPost);

export default router;
