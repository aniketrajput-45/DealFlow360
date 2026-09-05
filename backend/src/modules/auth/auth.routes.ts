import { Router } from 'express';
import { login, register, getMe, getDemoAccounts } from './auth.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.get('/me', requireAuth, getMe);
router.get('/demo-accounts', getDemoAccounts);

export default router;
