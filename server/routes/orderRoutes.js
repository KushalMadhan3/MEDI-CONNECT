/**
 * Order Routes
 */

import express from 'express';
import { createOrder, getUserOrders, trackOrder, cancelOrder, deleteOrder } from '../controllers/orderController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

console.log('Loading order routes');

const router = express.Router();

router.use(authenticateToken);

console.log('📋 Registering checkout route: POST /checkout');
router.post('/checkout', async (req, res, next) => {
    try {
        console.log('✅ Checkout endpoint accessed:', {
            url: req.originalUrl,
            method: req.method,
            userId: req.user?.userId,
            itemsCount: req.body?.items?.length,
            timestamp: new Date().toISOString()
        });
        await createOrder(req, res);
    } catch (error) {
        console.error('❌ Error in checkout endpoint:', error);
        console.error('Error stack:', error.stack);
        // If response hasn't been sent yet, send error response
        if (!res.headersSent) {
            res.status(500).json({ 
                success: false, 
                message: error.message || 'Checkout failed',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } else {
        next(error);
        }
    }
});
router.get('/', getUserOrders);
router.get('/:id/track', trackOrder);
router.put('/:id/cancel', cancelOrder);
router.delete('/:id', deleteOrder);
router.put('/:id/delivered', async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const { getDB } = await import('../config/mongodb.js');
    const db = getDB();
    const { createNotification } = await import('../models/notificationModel.js');
    
    const order = await db.collection('orders').findOne({ id: orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    await db.collection('orders').updateOne(
      { id: orderId },
      { $set: { status: 'delivered', deliveredAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }
    );
    
    // Notify patient
    await createNotification({
      userId: order.userId,
      userRole: 'patient',
      type: 'order',
      title: 'Order Delivered',
      message: `Your order #${orderId} has been delivered successfully.`,
      relatedId: orderId
    });
    
    // Notify admin
    await createNotification({
      userId: 'admin',
      userRole: 'admin',
      type: 'order',
      title: 'Order Delivered',
      message: `Order #${orderId} has been delivered to customer.`,
      relatedId: orderId
    });
    
    res.json({ success: true, message: 'Order marked as delivered' });
  } catch (error) {
    console.error('Mark order delivered error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark order as delivered' });
  }
});

console.log('Order routes loaded:', router.stack.length, 'routes');

export default router;