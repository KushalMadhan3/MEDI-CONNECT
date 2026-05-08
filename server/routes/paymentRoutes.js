/**
 * Payment Routes
 * Handles payment-related endpoints for appointments
 */

import express from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { createPayment, getPaymentById, updatePaymentStatus } from '../models/paymentModel.js';
import { getDB } from '../config/mongodb.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/payment/create-order
 * Create a payment order for appointment booking
 */
router.post('/create-order', requireRole('patient'), async (req, res) => {
  try {
    const { doctorId, amount, consultationFee, paymentMethod } = req.body;

    if (!doctorId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID, amount, and payment method are required'
      });
    }

    const validPaymentMethods = ['upi', 'card', 'netbanking'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method. Must be: upi, card, or netbanking'
      });
    }

    // Create payment order (in real app, integrate with Razorpay/Stripe)
    const paymentOrder = {
      orderId: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount,
      consultationFee: consultationFee || amount,
      paymentMethod,
      currency: 'INR',
      status: 'created',
      createdAt: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      message: 'Payment order created successfully',
      data: paymentOrder
    });
  } catch (error) {
    console.error('Create payment order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order'
    });
  }
});

/**
 * POST /api/payment/verify
 * Verify payment completion
 */
router.post('/verify', requireRole('patient'), async (req, res) => {
  try {
    const { orderId, paymentId, paymentMethod } = req.body;

    if (!orderId || !paymentId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Order ID, payment ID, and payment method are required'
      });
    }

    // In real app, verify payment with payment gateway (Razorpay/Stripe)
    // For now, we'll simulate successful verification
    const verificationResult = {
      verified: true,
      paymentId,
      orderId,
      paymentMethod,
      paymentStatus: 'paid',
      transactionTime: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: verificationResult
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment'
    });
  }
});

/**
 * GET /api/payment/:paymentId
 * Get payment details by ID
 */
router.get('/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await getPaymentById(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment details'
    });
  }
});

export default router;