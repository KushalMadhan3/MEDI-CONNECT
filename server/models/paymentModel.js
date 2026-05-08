/**
 * Payment Model
 * Stores payment information for appointments
 */

import { getDB } from '../config/mongodb.js';

/**
 * Get payments collection
 */
export function getPaymentsCollection() {
  const db = getDB();
  return db.collection('payments');
}

/**
 * Create a new payment record
 * @param {Object} paymentData - Payment data
 * @returns {Promise<Object>} Created payment record
 */
export async function createPayment(paymentData) {
  const collection = getPaymentsCollection();
  const payment = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    appointmentId: paymentData.appointmentId,
    patientId: paymentData.patientId,
    doctorId: paymentData.doctorId,
    amount: paymentData.amount,
    consultationFee: paymentData.consultationFee,
    paymentType: paymentData.paymentType, // 'advance' or 'full' or 'remaining'
    paymentMethod: paymentData.paymentMethod, // 'razorpay', 'stripe', 'cash', 'card'
    paymentStatus: paymentData.paymentStatus || 'pending', // pending, success, failed, refunded
    transactionId: paymentData.transactionId || null,
    razorpayOrderId: paymentData.razorpayOrderId || null,
    razorpayPaymentId: paymentData.razorpayPaymentId || null,
    razorpaySignature: paymentData.razorpaySignature || null,
    currency: paymentData.currency || 'INR',
    metadata: paymentData.metadata || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  await collection.insertOne(payment);
  return payment;
}

/**
 * Get payment by ID
 * @param {string} paymentId - Payment ID
 * @returns {Promise<Object|null>} Payment or null
 */
export async function getPaymentById(paymentId) {
  const collection = getPaymentsCollection();
  return await collection.findOne({ id: paymentId });
}

/**
 * Get payment by appointment ID
 * @param {string} appointmentId - Appointment ID
 * @returns {Promise<Array>} Array of payments
 */
export async function getPaymentsByAppointmentId(appointmentId) {
  const collection = getPaymentsCollection();
  return await collection.find({ appointmentId }).toArray();
}

/**
 * Get payments by patient ID
 * @param {string} patientId - Patient ID
 * @returns {Promise<Array>} Array of payments
 */
export async function getPaymentsByPatientId(patientId) {
  const collection = getPaymentsCollection();
  return await collection.find({ patientId }).sort({ createdAt: -1 }).toArray();
}

/**
 * Update payment status
 * @param {string} paymentId - Payment ID
 * @param {string} status - New payment status
 * @param {Object} updateData - Additional data to update
 * @returns {Promise<Object|null>} Updated payment or null
 */
export async function updatePaymentStatus(paymentId, status, updateData = {}) {
  const collection = getPaymentsCollection();
  
  const update = {
    $set: {
      paymentStatus: status,
      updatedAt: new Date().toISOString(),
      ...updateData
    }
  };
  
  const result = await collection.findOneAndUpdate(
    { id: paymentId },
    update,
    { returnDocument: 'after' }
  );
  
  return result;
}

/**
 * Get total amount paid for appointment
 * @param {string} appointmentId - Appointment ID
 * @returns {Promise<number>} Total amount paid
 */
export async function getTotalPaidForAppointment(appointmentId) {
  const collection = getPaymentsCollection();
  
  const payments = await collection.find({
    appointmentId,
    paymentStatus: 'success'
  }).toArray();
  
  return payments.reduce((total, payment) => total + payment.amount, 0);
}

/**
 * Check if appointment has advance payment
 * @param {string} appointmentId - Appointment ID
 * @returns {Promise<boolean>} True if advance payment exists
 */
export async function hasAdvancePayment(appointmentId) {
  const collection = getPaymentsCollection();
  
  const payment = await collection.findOne({
    appointmentId,
    paymentType: 'advance',
    paymentStatus: 'success'
  });
  
  return !!payment;
}

/**
 * Get payment summary for patient
 * @param {string} patientId - Patient ID
 * @returns {Promise<Object>} Payment summary
 */
export async function getPatientPaymentSummary(patientId) {
  const collection = getPaymentsCollection();
  
  const payments = await collection.find({ patientId }).toArray();
  
  const summary = {
    totalPayments: payments.length,
    totalAmountPaid: payments
      .filter(p => p.paymentStatus === 'success')
      .reduce((total, p) => total + p.amount, 0),
    pendingPayments: payments.filter(p => p.paymentStatus === 'pending').length,
    failedPayments: payments.filter(p => p.paymentStatus === 'failed').length,
    successPayments: payments.filter(p => p.paymentStatus === 'success').length
  };
  
  return summary;
}
