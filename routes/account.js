import express from 'express';
import { accountGet, accountPost } from '../controllers/account.js';

const router = express.Router();

router.get('/', accountGet);
router.post('/', accountPost);

export default router;
