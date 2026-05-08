/**
 * Marketplace Routes
 */

import express from 'express';
import {
    getMedicines,
    getMedicine,
    placeOrder,
    getUserOrders
} from '../controllers/marketplaceController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/medicines', getMedicines);
router.get('/medicines/:id', getMedicine);

// Protected routes
router.post('/order', authenticateToken, placeOrder);
router.get('/orders', authenticateToken, getUserOrders);

export default router;
