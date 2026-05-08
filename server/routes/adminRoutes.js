import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  bulkUpdateUsers,
  getAllAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  getAllPayments,
  getPharmacyInventory,
  updatePharmacyInventory,
  getSystemAnalytics,
  getActivityLogs,
  exportReport,
  getPendingDoctors,
  verifyDoctor,
  updateSystemConfig,
  getAdminNotificationsHandler,
  markAdminNotificationAsRead,
  markAllAdminNotificationsAsRead
} from '../controllers/adminController.js';

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

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireRole('admin'));

// User Management
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserById);
router.put('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);
router.post('/users/bulk', bulkUpdateUsers);

// Doctor Approval
router.get('/doctors/pending', getPendingDoctors);
router.put('/doctors/:id/verify', verifyDoctor);
// Legacy route for backward compatibility
router.post('/doctors/:doctorId/approve', async (req, res) => {
  req.params.id = req.params.doctorId;
  req.body.action = 'approve';
  return verifyDoctor(req, res);
});

// Appointments Management
router.get('/appointments', getAllAppointments);
router.get('/appointments/:appointmentId', getAppointmentById);
router.put('/appointments/:appointmentId/status', updateAppointmentStatus);

// Payments Management
router.get('/payments', getAllPayments);

// Pharmacy Inventory Management
router.get('/pharmacy/inventory', getPharmacyInventory);
router.put('/pharmacy/inventory/:itemId', updatePharmacyInventory);

// System Analytics (rate limited)
router.get('/analytics', analyticsRateLimit, getSystemAnalytics);

// Activity Logs
router.get('/activity-logs', getActivityLogs);

// Export Reports (rate limited)
router.get('/export', exportRateLimit, exportReport);

// System Configuration
router.put('/system/config', updateSystemConfig);

// Notifications
router.get('/notifications', getAdminNotificationsHandler);
router.put('/notifications/:id/read', markAdminNotificationAsRead);
router.put('/notifications/read-all', markAllAdminNotificationsAsRead);

export default router;