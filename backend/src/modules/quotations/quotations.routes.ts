import { Router } from 'express';
import {
  evaluateQuotePreview,
  createQuotation,
  getQuotations,
  getQuotationById,
  addQuoteComment,
} from './quotations.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

// Evaluate quote live
router.post('/evaluate', requireAuth, evaluateQuotePreview);

// Quotes CRUD
router.get('/', requireAuth, getQuotations);
router.post('/', requireAuth, createQuotation);
router.get('/:id', requireAuth, getQuotationById);
router.post('/:id/comments', requireAuth, addQuoteComment);

export default router;
