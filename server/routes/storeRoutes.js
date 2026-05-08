/**
 * Store Routes
 */

import express from 'express';
import { getUserCart, addToCart, removeFromCart } from '../controllers/storeController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/cart', getUserCart);
router.post('/cart', addToCart);
router.delete('/cart/:itemId', removeFromCart);

export default router;
