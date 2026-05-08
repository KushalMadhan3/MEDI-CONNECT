/**
 * Doctor Routes
 * All routes are protected with JWT authentication and require doctor role
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

// Rate limiting for heavy endpoints
const analyticsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  message: 'Too many analytics requests. Please try again later.'
});

const exportRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 exports per hour
  message: 'Too many export requests. Please try again later.'
});
import {
  getDashboardStats,
  getTodayAppointmentsHandler,
  addPatient,
  prescribeMedicine,
  createPrescriptionHandler,
  updateAppointmentStatusHandler,
  getNotifications,
  getDoctorPatients,
  getDoctorPrescriptions,
  getDoctorScheduleHandler,
  getDoctorEarningsReport,
  createPatientRecord,
  prescribeForAppointment,
  getDoctorAnalyticsHandler,
  exportDoctorReport
} from '../controllers/doctorController.js';
import { generateDoctorImage } from '../services/imageGenerationService.js';

const router = express.Router();

// All doctor routes require authentication and doctor role
router.use(authenticateToken);
router.use(requireRole('doctor'));

// Dashboard stats
router.get('/dashboard-stats', getDashboardStats);

// Today's appointments
router.get('/today-appointments', getTodayAppointmentsHandler);

// Earnings report
router.get('/earnings', getDoctorEarningsReport);

// Add patient
router.post('/add-patient', addPatient);

// Get patients
router.get('/patients', getDoctorPatients);

// Get prescriptions
router.get('/prescriptions', getDoctorPrescriptions);

// Prescribe medicine (create prescription)
router.post('/prescribe/:appointmentId', prescribeMedicine);
router.post('/create-prescription', createPrescriptionHandler);

// Update prescription
router.put('/prescriptions/:prescriptionId', async (req, res) => {
  try {
    const { updatePrescription } = await import('../models/prescriptionModel.js');
    const { prescriptionId } = req.params;
    const updateData = req.body;
    
    const updated = await updatePrescription(prescriptionId, updateData);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Prescription updated successfully',
      data: updated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update prescription'
    });
  }
});

// Delete prescription
router.delete('/prescriptions/:prescriptionId', async (req, res) => {
  try {
    const { deletePrescription } = await import('../models/prescriptionModel.js');
    const { prescriptionId } = req.params;
    
    const deleted = await deletePrescription(prescriptionId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Prescription deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete prescription'
    });
  }
});

// Update appointment status
router.put('/update-appointment-status/:id', updateAppointmentStatusHandler);
router.put('/appointments/:id/status', updateAppointmentStatusHandler);

// Patient records
router.post('/patient-records', createPatientRecord);

// Prescribe for appointment
router.put('/appointments/:id/prescribe', prescribeForAppointment);

// Analytics (rate limited)
router.get('/analytics', analyticsRateLimit, getDoctorAnalyticsHandler);

// Export report (rate limited)
router.get('/report', exportRateLimit, exportDoctorReport);

// Get notifications
router.get('/notifications', getNotifications);

// Mark notification as read
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const { markNotificationAsRead } = await import('../models/notificationModel.js');
    const { id } = req.params;
    const doctorId = req.user.userId;
    
    const success = await markNotificationAsRead(id);
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', async (req, res) => {
  try {
    const { markAllNotificationsAsRead } = await import('../models/notificationModel.js');
    const doctorId = req.user.userId;
    
    const count = await markAllNotificationsAsRead(doctorId);
    
    res.json({
      success: true,
      message: `${count} notifications marked as read`,
      count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark all notifications as read'
    });
  }
});

// Get doctor schedule
router.get('/schedule', getDoctorScheduleHandler);

export default router;