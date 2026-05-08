/**
 * Payment Service
 * Handles payment gateway integration (Razorpay mock implementation)
 * For production, install razorpay package: npm install razorpay
 */

import { getDB } from '../config/mongodb.js';
import crypto from 'crypto';

/**
 * Create Razorpay order (Mock implementation)
 * In production, use: const Razorpay = require('razorpay');
 * @param {Object} orderData - Order data
 * @returns {Promise<Object>} Order details
 */
export async function createRazorpayOrder(orderData) {
  try {
    // MOCK IMPLEMENTATION
    // For production, uncomment and configure:
    /*
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    
    const options = {
      amount: orderData.amount * 100, // amount in paise
      currency: orderData.currency || 'INR',
      receipt: orderData.receipt,
      notes: orderData.notes || {}
    };
    
    const order = await razorpay.orders.create(options);
    return order;
    */
    
    // MOCK ORDER for development
    const mockOrder = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entity: 'order',
      amount: orderData.amount * 100,
      amount_paid: 0,
      amount_due: orderData.amount * 100,
      currency: orderData.currency || 'INR',
      receipt: orderData.receipt,
      status: 'created',
      attempts: 0,
      notes: orderData.notes || {},
      created_at: Math.floor(Date.now() / 1000)
    };
    
    console.log('🔔 MOCK Razorpay Order Created:', mockOrder);
    return mockOrder;
    
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    throw new Error('Failed to create payment order');
  }
}

/**
 * Verify Razorpay payment signature
 * @param {Object} paymentData - Payment verification data
 * @returns {boolean} True if signature is valid
 */
export function verifyRazorpaySignature(paymentData) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;
    
    // MOCK VERIFICATION for development
    // For production, uncomment:
    /*
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');
    
    return expectedSignature === razorpay_signature;
    */
    
    // MOCK: Always return true for development
    console.log('🔔 MOCK Razorpay Signature Verified');
    return true;
    
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Calculate advance payment amount (50% of consultation fee)
 * @param {number} consultationFee - Total consultation fee
 * @returns {number} Advance payment amount
 */
export function calculateAdvancePayment(consultationFee) {
  return Math.round(consultationFee * 0.5);
}

/**
 * Calculate remaining payment amount
 * @param {number} consultationFee - Total consultation fee
 * @param {number} amountPaid - Amount already paid
 * @returns {number} Remaining payment amount
 */
export function calculateRemainingPayment(consultationFee, amountPaid) {
  const remaining = consultationFee - amountPaid;
  return remaining > 0 ? remaining : 0;
}

/**
 * Get payment status for appointment
 * @param {number} consultationFee - Total consultation fee
 * @param {number} amountPaid - Amount paid
 * @returns {string} Payment status (pending, partial, completed)
 */
export function getPaymentStatus(consultationFee, amountPaid) {
  if (amountPaid === 0) return 'pending';
  if (amountPaid >= consultationFee) return 'completed';
  return 'partial';
}

/**
 * Create payment order for appointment
 * @param {Object} appointmentData - Appointment data
 * @returns {Promise<Object>} Payment order details
 */
export async function createAppointmentPaymentOrder(appointmentData) {
  const { appointmentId, consultationFee, patientId, doctorId } = appointmentData;
  
  const advanceAmount = calculateAdvancePayment(consultationFee);
  
  const orderData = {
    amount: advanceAmount,
    currency: 'INR',
    receipt: `apt_${appointmentId}`,
    notes: {
      appointmentId,
      patientId,
      doctorId,
      paymentType: 'advance',
      consultationFee
    }
  };
  
  const order = await createRazorpayOrder(orderData);
  
  return {
    orderId: order.id,
    amount: advanceAmount,
    currency: order.currency,
    consultationFee,
    advancePayment: advanceAmount,
    remainingPayment: calculateRemainingPayment(consultationFee, advanceAmount)
  };
}

/**
 * Process payment success
 * @param {Object} paymentData - Payment data from gateway
 * @returns {Object} Payment result
 */
export async function processPaymentSuccess(paymentData) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;
  
  // Verify signature
  const isValid = verifyRazorpaySignature(paymentData);
  
  if (!isValid) {
    throw new Error('Invalid payment signature');
  }
  
  return {
    success: true,
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature
  };
}

/**
 * Refund payment (Mock implementation)
 * @param {Object} refundData - Refund data
 * @returns {Promise<Object>} Refund details
 */
export async function initiateRefund(refundData) {
  try {
    // MOCK REFUND for development
    // For production, use Razorpay refund API
    
    const mockRefund = {
      id: `rfnd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entity: 'refund',
      amount: refundData.amount * 100,
      currency: 'INR',
      payment_id: refundData.paymentId,
      status: 'processed',
      created_at: Math.floor(Date.now() / 1000)
    };
    
    console.log('🔔 MOCK Refund Initiated:', mockRefund);
    return mockRefund;
    
  } catch (error) {
    console.error('Refund error:', error);
    throw new Error('Failed to process refund');
  }
}

export default {
  createRazorpayOrder,
  verifyRazorpaySignature,
  calculateAdvancePayment,
  calculateRemainingPayment,
  getPaymentStatus,
  createAppointmentPaymentOrder,
  processPaymentSuccess,
  initiateRefund
};
