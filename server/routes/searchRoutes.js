/**
 * Search Routes
 */

import express from 'express';
import { uploadPrescription, globalSearch } from '../controllers/searchController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/upload-prescription', authenticateToken, uploadPrescription);
router.get('/global', authenticateToken, globalSearch);

export default router;
