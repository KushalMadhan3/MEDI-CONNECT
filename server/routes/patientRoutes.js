/**
 * Patient Routes
 */

import express from 'express';
import {
    getAllDoctors,
    bookAppointment,
    getPatientAppointments,
    getPatientNotifications,
    markPatientNotificationAsRead,
    markAllPatientNotificationsAsRead,
    updatePatientProfile,
    changePassword,
    cancelPatientAppointment,
    reschedulePatientAppointment,
    getPatientMedicalRecords,
    getPatientProfile,
    exportMedicalRecords
} from '../controllers/patientController.js';
import { getAvailableSlots } from '../controllers/doctorController.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route for browsing doctors (no authentication required)
// This must be defined BEFORE the authenticateToken middleware
console.log('📋 Registering public doctors route: GET /doctors/public');
router.get('/doctors/public', async (req, res, next) => {
    try {
        console.log('✅ Public doctors endpoint accessed:', {
            url: req.originalUrl,
            method: req.method,
            query: req.query,
            timestamp: new Date().toISOString()
        });
        await getAllDoctors(req, res);
    } catch (error) {
        console.error('❌ Error in public doctors endpoint:', error);
        next(error);
    }
});

// All other routes require authentication
router.use(authenticateToken);

// Doctor browsing (for authenticated users)
router.get('/doctors', getAllDoctors);
router.get('/doctors/:id/slots', getAvailableSlots);

// Appointments (with 50% advance payment)
router.get('/appointments', requireRole('patient'), getPatientAppointments);
router.post('/appointments', requireRole('patient'), bookAppointment);
router.put('/appointments/:id/cancel', requireRole('patient'), cancelPatientAppointment);
router.put('/appointments/:id/reschedule', requireRole('patient'), reschedulePatientAppointment);

// Medical Records
router.get('/medical-records', requireRole('patient'), getPatientMedicalRecords);
router.get('/medical-records/export', requireRole('patient'), exportMedicalRecords);

// Notifications
router.get('/notifications', requireRole('patient'), getPatientNotifications);
router.put('/notifications/:id/read', requireRole('patient'), markPatientNotificationAsRead);
router.put('/notifications/read-all', requireRole('patient'), markAllPatientNotificationsAsRead);

// Profile
router.get('/profile', requireRole('patient'), getPatientProfile);
router.put('/profile', requireRole('patient'), updatePatientProfile);
router.put('/password', requireRole('patient'), changePassword);

export default router;