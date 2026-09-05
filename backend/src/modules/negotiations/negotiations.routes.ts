import { Router } from 'express';
import { submitCounterOffer, respondToCounterOffer } from './negotiations.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

// Customer can submit counter offer
router.post('/counter', requireAuth, submitCounterOffer);

// Seller rep / manager responds to counter offer
router.post('/:negotiationId/respond', requireAuth, respondToCounterOffer);

export default router;
