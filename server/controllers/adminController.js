import { getDB } from '../config/mongodb.js';
import { getAllAppointments as getAllAppointmentsFromModel, getAppointmentById as getAppointmentFromModel } from '../models/appointmentModel.js';
import { createAuditLog, getAuditLogs } from '../models/auditLogModel.js';
import { getSystemMetrics } from '../services/metricsService.js';
import {
  exportUsersReport,
  exportAppointmentsReport,
  exportPaymentsReport,
  exportActivityLogsReport,
  exportAnalyticsReport
} from '../services/reportService.js';
import { notify } from '../services/notificationService.js';
import { 
  getAdminNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  countUnreadNotifications 
} from '../models/notificationModel.js';

// In-memory storage for demo data (in production, use MongoDB)
const inMemoryData = {
  appointments: [],
  pharmacyInventory: [],
  analytics: {
    totalUsers: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    activeDoctors: 0,
    pendingDoctors: 0
  }
};

// Initialize with some sample data
function initializeSampleData() {
  if (inMemoryData.appointments.length === 0) {
    inMemoryData.appointments = [
      {
        id: 'apt_1',
        patientName: 'John Doe',
        patientEmail: 'john@example.com',
        doctorName: 'Dr. Sarah Johnson',
        doctorEmail: 'sarah@example.com',
        specialty: 'Cardiology',
        date: '2024-11-28',
        time: '10:00 AM',
        status: 'scheduled',
        location: 'Somajiguda',
        createdAt: new Date().toISOString()
      },
      {
        id: 'apt_2',
        patientName: 'Jane Smith',
        patientEmail: 'jane@example.com',
        doctorName: 'Dr. Michael Brown',
        doctorEmail: 'michael@example.com',
        specialty: 'Dermatology',
        date: '2024-11-29',
        time: '2:00 PM',
        status: 'completed',
        location: 'Malakpet',
        createdAt: new Date().toISOString()
      }
    ];
  }

  if (inMemoryData.pharmacyInventory.length === 0) {
    inMemoryData.pharmacyInventory = [
      {
        id: 'med_1',
        name: 'Amoxicillin 500mg',
        type: 'Antibiotic',
        price: 120,
        stock: 150,
        supplier: 'PharmaCorp',
        expiryDate: '2025-12-31',
        status: 'in_stock'
      },
      {
        id: 'med_2',
        name: 'Paracetamol 650mg',
        type: 'Pain Relief',
        price: 45,
        stock: 500,
        supplier: 'MedSupply',
        expiryDate: '2026-06-30',
        status: 'in_stock'
      },
      {
        id: 'med_3',
        name: 'Vitamin D3 Tablets',
        type: 'Supplement',
        price: 280,
        stock: 80,
        supplier: 'HealthPlus',
        expiryDate: '2025-09-15',
        status: 'low_stock'
      }
    ];
  }
}

// Initialize on first import
initializeSampleData();

/**
 * GET /api/admin/users
 * Get all users with pagination, filtering, and search
 */
export async function getAllUsers(req, res) {
  try {
    const db = getDB();
    const usersCollection = db.collection('users');
    
    const {
      role,
      status,
      q: search,
      page = 1,
      limit = 25,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Build query
    let query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const users = await usersCollection.find(query)
      .project({ password: 0 }) // Exclude password
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .toArray();

    const total = await usersCollection.countDocuments(query);

    // Log audit
    await createAuditLog({
      actorId: req.user.userId,
      actorRole: 'admin',
      action: 'users.list',
      targetType: 'system',
      details: { filters: { role, status, search }, total },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      data: users,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch users'
    });
  }
}

// Get user by ID
export async function getUserById(req, res) {
  try {
    const { userId } = req.params;
    const db = getDB();
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne(
      { id: userId },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user'
    });
  }
}

/**
 * PUT /api/admin/users/:id
 * Update user with validation and audit logging
 */
export async function updateUser(req, res) {
  try {
    const { userId } = req.params;
    const { name, email, mobile, gender, status, role } = req.body;
    const adminId = req.user.userId;
    
    const db = getDB();
    const usersCollection = db.collection('users');
    
    // Check if user exists
    const existingUser = await usersCollection.findOne({ id: userId });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Prevent admin from changing their own role/status
    if (userId === adminId && (role || status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role or status'
      });
    }
    
    // If email is being changed, check if new email already exists
    if (email && email !== existingUser.email) {
      const emailExists = await usersCollection.findOne({ email, id: { $ne: userId } });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered to another user'
        });
      }
    }
    
    // Sanitize inputs
    const updateData = {
      updatedAt: new Date().toISOString()
    };
    
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.trim().toLowerCase();
    if (mobile !== undefined) updateData.mobile = mobile ? mobile.trim() : null;
    if (gender) updateData.gender = gender.trim();
    if (status) updateData.status = status;
    if (role) {
      // Validate role
      if (!['patient', 'doctor', 'admin'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role'
        });
      }
      updateData.role = role;
    }

    const result = await usersCollection.updateOne(
      { id: userId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If doctor status changed, update pending_doctors collection
    if (status === 'active' || status === 'rejected') {
      const pendingCollection = db.collection('pending_doctors');
      await pendingCollection.deleteOne({ doctorId: userId });
    }

    // Get updated user data
    const updatedUser = await usersCollection.findOne(
      { id: userId },
      { projection: { password: 0 } }
    );

    // Log audit
    await createAuditLog({
      actorId: adminId,
      actorRole: 'admin',
      action: 'user.updated',
      targetType: 'user',
      targetId: userId,
      details: {
        changes: updateData,
        previous: {
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
          status: existingUser.status
        }
      },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    // Notify user if status/role changed
    if (status && status !== existingUser.status) {
      await notify({
        toRole: existingUser.role,
        userId: userId,
        title: 'Account Status Updated',
        message: `Your account status has been changed to ${status}.`,
        type: 'account',
        metadata: { status }
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update user'
    });
  }
}

/**
 * POST /api/admin/users/bulk
 * Bulk update users (role/status changes)
 */
export async function bulkUpdateUsers(req, res) {
  try {
    const { userIds, action, value } = req.body;
    const adminId = req.user.userId;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }
    
    if (!action || !['role', 'status'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be "role" or "status"'
      });
    }
    
    if (!value) {
      return res.status(400).json({
        success: false,
        message: 'Value is required'
      });
    }
    
    // Prevent bulk updating self
    if (userIds.includes(adminId)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot bulk update your own account'
      });
    }
    
    const db = getDB();
    const usersCollection = db.collection('users');
    
    // Validate value
    if (action === 'role' && !['patient', 'doctor', 'admin'].includes(value)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }
    
    if (action === 'status' && !['active', 'inactive', 'pending', 'rejected'].includes(value)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    // Update users
    const updateData = {
      [action]: value,
      updatedAt: new Date().toISOString()
    };
    
    const result = await usersCollection.updateMany(
      { id: { $in: userIds } },
      { $set: updateData }
    );
    
    // Log audit
    await createAuditLog({
      actorId: adminId,
      actorRole: 'admin',
      action: 'bulk.users.updated',
      targetType: 'users',
      details: {
        userIds,
        action,
        value,
        updatedCount: result.modifiedCount
      },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    
    // Notify affected users
    const updatedUsers = await usersCollection.find({ id: { $in: userIds } }).toArray();
    for (const user of updatedUsers) {
      await notify({
        toRole: user.role,
        userId: user.id,
        title: 'Account Updated',
        message: `Your account ${action} has been changed to ${value}.`,
        type: 'account',
        metadata: { [action]: value }
      });
    }
    
    res.json({
      success: true,
      message: `Bulk update completed: ${result.modifiedCount} users updated`,
      data: {
        updatedCount: result.modifiedCount,
        totalRequested: userIds.length
      }
    });
  } catch (error) {
    console.error('Bulk update users error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to bulk update users'
    });
  }
}

// Delete user
export async function deleteUser(req, res) {
  try {
    const { userId } = req.params;
    const db = getDB();
    const usersCollection = db.collection('users');
    const pendingCollection = db.collection('pending_doctors');
    
    // Prevent admin from deleting themselves
    const user = await usersCollection.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if trying to delete admin (optional: prevent deleting admin accounts)
    // if (user.role === 'admin' && req.user.userId !== userId) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Cannot delete admin accounts'
    //   });
    // }
    
    // Remove from users collection
    const result = await usersCollection.deleteOne({ id: userId });
    
    // Remove from pending doctors if exists
    await pendingCollection.deleteOne({ doctorId: userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: { deletedUserId: userId }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete user'
    });
  }
}

/**
 * GET /api/admin/appointments
 * Get all appointments with filters
 */
export async function getAllAppointments(req, res) {
  try {
    const {
      status,
      date,
      doctorId,
      patientId,
      fromDate,
      toDate,
      paymentStatus,
      page = 1,
      limit = 50
    } = req.query;
    
    const db = getDB();
    const appointmentsCollection = db.collection('appointments');
    
    // Build query
    const query = {};
    if (status) query.status = status;
    if (doctorId) query.doctorId = doctorId;
    if (patientId) query.patientId = patientId;
    if (paymentStatus) {
      query.$or = [
        { 'payment.status': paymentStatus },
        { paymentStatus: paymentStatus }
      ];
    }
    if (date) {
      query.date = date;
    } else if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = fromDate;
      if (toDate) query.date.$lte = toDate;
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const appointments = await appointmentsCollection.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray();
    
    const total = await appointmentsCollection.countDocuments(query);
    
    // Format appointments
    const formattedAppointments = appointments.map(appointment => ({
      id: appointment.id || appointment._id?.toString() || appointment._id,
      _id: appointment._id,
      doctorId: appointment.doctorId,
      doctorName: appointment.doctorName,
      doctorSpecialization: appointment.doctorSpecialization,
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      patientEmail: appointment.patientEmail,
      patientPhone: appointment.patientPhone || 'N/A',
      date: appointment.date,
      time: appointment.time,
      status: appointment.status,
      payment: appointment.payment || {
        status: appointment.paymentStatus || 'pending',
        method: appointment.paymentMethod || null,
        transactionId: appointment.paymentId || null,
        paidAmount: appointment.payment?.paidAmount || 0
      },
      paymentStatus: appointment.paymentStatus || appointment.payment?.status || 'pending',
      paymentMethod: appointment.paymentMethod || appointment.payment?.method || 'N/A',
      paymentId: appointment.paymentId || appointment.payment?.transactionId || 'N/A',
      transactionTime: appointment.transactionTime || appointment.payment?.timestamp || null,
      notes: appointment.notes || '',
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt
    }));
    
    // Log audit
    await createAuditLog({
      actorId: req.user.userId,
      actorRole: 'admin',
      action: 'appointments.list',
      targetType: 'system',
      details: { filters: req.query, total },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.json({
      success: true,
      data: formattedAppointments,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get all appointments error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch appointments'
    });
  }
}

/**
 * GET /api/admin/payments
 * Get all payments with filters
 */
export async function getAllPayments(req, res) {
  try {
    const {
      status,
      method,
      fromDate,
      toDate,
      page = 1,
      limit = 50
    } = req.query;
    
    const db = getDB();
    const appointmentsCollection = db.collection('appointments');
    
    // Build query for paid appointments
    const query = {
      $or: [
        { 'payment.status': 'paid' },
        { paymentStatus: 'paid' }
      ]
    };
    
    if (status) {
      query.$or = [
        { 'payment.status': status },
        { paymentStatus: status }
      ];
    }
    
    if (method) {
      query.$or = [
        { 'payment.method': method },
        { paymentMethod: method }
      ];
    }
    
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = fromDate;
      if (toDate) query.createdAt.$lte = toDate;
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const appointments = await appointmentsCollection.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray();
    
    const total = await appointmentsCollection.countDocuments(query);
    
    // Format payments
    const payments = appointments.map(apt => ({
      transactionId: apt.payment?.transactionId || apt.paymentId || apt._id || apt.id,
      appointmentId: apt._id || apt.id,
      patientId: apt.patientId,
      patientName: apt.patientName,
      patientEmail: apt.patientEmail,
      amount: apt.payment?.paidAmount || apt.payment?.amount || 500,
      method: apt.payment?.method || apt.paymentMethod || 'unknown',
      status: apt.payment?.status || apt.paymentStatus || 'paid',
      timestamp: apt.payment?.timestamp || apt.transactionTime || apt.createdAt,
      createdAt: apt.createdAt
    }));
    
    res.json({
      success: true,
      data: payments,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch payments'
    });
  }
}

// Get appointment by ID
export async function getAppointmentById(req, res) {
  try {
    const { appointmentId } = req.params;
    const appointment = await getAppointmentFromModel(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      data: appointment
    });
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch appointment'
    });
  }
}

// Update appointment status
export async function updateAppointmentStatus(req, res) {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body;

    // Import the update function from appointment model
    const { updateAppointmentStatus: updateAppointmentStatusInModel } = await import('../models/appointmentModel.js');
    
    const updatedAppointment = await updateAppointmentStatusInModel(appointmentId, status);
    if (!updatedAppointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      data: updatedAppointment
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update appointment'
    });
  }
}

// Get pharmacy inventory
export async function getPharmacyInventory(req, res) {
  try {
    const { status, type, search } = req.query;
    
    let inventory = [...inMemoryData.pharmacyInventory];

    // Filter by status
    if (status) {
      inventory = inventory.filter(item => item.status === status);
    }

    // Filter by type
    if (type) {
      inventory = inventory.filter(item => item.type === type);
    }

    // Search
    if (search) {
      inventory = inventory.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.supplier.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.json({
      success: true,
      data: inventory,
      count: inventory.length
    });
  } catch (error) {
    console.error('Get pharmacy inventory error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch inventory'
    });
  }
}

// Update pharmacy inventory
export async function updatePharmacyInventory(req, res) {
  try {
    const { itemId } = req.params;
    const { stock, price, status } = req.body;

    const item = inMemoryData.pharmacyInventory.find(med => med.id === itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    if (stock !== undefined) item.stock = stock;
    if (price !== undefined) item.price = price;
    if (status) item.status = status;
    item.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      message: 'Inventory updated successfully',
      data: item
    });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update inventory'
    });
  }
}

/**
 * GET /api/admin/analytics
 * Get system-wide analytics
 */
export async function getSystemAnalytics(req, res) {
  try {
    const { from, to } = req.query;
    
    // Get metrics from metrics service
    const metrics = await getSystemMetrics({
      from,
      to,
      lowStockThreshold: 10
    });
    
    // Get additional stats
    const db = getDB();
    const usersCollection = db.collection('users');
    const pendingCollection = db.collection('pending_doctors');
    const appointmentsCollection = db.collection('appointments');
    
    // Active users in last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsers24h = await usersCollection.countDocuments({
      updatedAt: { $gte: yesterday.toISOString() }
    });
    
    // Pending doctors
    const pendingDoctors = await pendingCollection.countDocuments();
    
    // System health (basic check)
    const systemHealth = {
      status: 'healthy',
      checks: {
        database: 'connected',
        rabbitmq: 'unknown', // Would check RabbitMQ connection
        redis: 'unknown' // Would check Redis connection
      }
    };
    
    const analytics = {
      ...metrics,
      activeUsers24h,
      pendingDoctors,
      systemHealth
    };
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch analytics'
    });
  }
}

/**
 * GET /api/admin/activity-logs
 * Get paginated audit logs
 */
export async function getActivityLogs(req, res) {
  try {
    const {
      actorId,
      actorRole,
      action,
      targetType,
      targetId,
      fromDate,
      toDate,
      page = 1,
      limit = 50,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;
    
    const filters = {};
    if (actorId) filters.actorId = actorId;
    if (actorRole) filters.actorRole = actorRole;
    if (action) filters.action = action;
    if (targetType) filters.targetType = targetType;
    if (targetId) filters.targetId = targetId;
    if (fromDate) filters.fromDate = fromDate;
    if (toDate) filters.toDate = toDate;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    };
    
    const result = await getAuditLogs(filters, options);
    
    res.json({
      success: true,
      data: result.logs,
      meta: result.pagination
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch activity logs'
    });
  }
}

/**
 * GET /api/admin/export
 * Export reports (CSV/PDF)
 */
export async function exportReport(req, res) {
  try {
    const { resource, format = 'csv', from, to } = req.query;
    
    if (!resource) {
      return res.status(400).json({
        success: false,
        message: 'Resource is required (users, appointments, payments, logs, analytics)'
      });
    }
    
    const db = getDB();
    let reportData;
    
    switch (resource) {
      case 'users': {
        const usersCollection = db.collection('users');
        const users = await usersCollection.find({})
          .project({ password: 0 })
          .toArray();
        reportData = await exportUsersReport(users, format);
        break;
      }
      case 'appointments': {
        const appointmentsCollection = db.collection('appointments');
        const query = {};
        if (from || to) {
          query.date = {};
          if (from) query.date.$gte = from;
          if (to) query.date.$lte = to;
        }
        const appointments = await appointmentsCollection.find(query).toArray();
        reportData = await exportAppointmentsReport(appointments, format);
        break;
      }
      case 'payments': {
        const appointmentsCollection = db.collection('appointments');
        const query = {
          $or: [
            { 'payment.status': 'paid' },
            { paymentStatus: 'paid' }
          ]
        };
        if (from || to) {
          query.createdAt = {};
          if (from) query.createdAt.$gte = from;
          if (to) query.createdAt.$lte = to;
        }
        const appointments = await appointmentsCollection.find(query).toArray();
        const payments = appointments.map(apt => ({
          transactionId: apt.payment?.transactionId || apt.paymentId || apt._id,
          appointmentId: apt._id || apt.id,
          patientName: apt.patientName,
          amount: apt.payment?.paidAmount || apt.payment?.amount || 500,
          method: apt.payment?.method || apt.paymentMethod || 'unknown',
          status: apt.payment?.status || apt.paymentStatus || 'paid',
          timestamp: apt.payment?.timestamp || apt.transactionTime || apt.createdAt,
          createdAt: apt.createdAt
        }));
        reportData = await exportPaymentsReport(payments, format);
        break;
      }
      case 'logs': {
        const filters = {};
        if (from) filters.fromDate = from;
        if (to) filters.toDate = to;
        const result = await getAuditLogs(filters, { page: 1, limit: 10000 });
        reportData = await exportActivityLogsReport(result.logs, format);
        break;
      }
      case 'analytics': {
        const metrics = await getSystemMetrics({ from, to });
        reportData = await exportAnalyticsReport(metrics, format);
        break;
      }
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid resource'
        });
    }
    
    // Log export
    await createAuditLog({
      actorId: req.user.userId,
      actorRole: 'admin',
      action: 'report.exported',
      targetType: 'system',
      details: { resource, format, from, to },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${resource}-report-${from || 'all'}-${to || 'all'}.csv"`);
      res.send(reportData);
    } else {
      res.json({
        success: true,
        data: reportData
      });
    }
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export report'
    });
  }
}

/**
 * GET /api/admin/doctors/pending
 * Get pending doctor registrations
 */
export async function getPendingDoctors(req, res) {
  try {
    const db = getDB();
    const pendingCollection = db.collection('pending_doctors');
    const usersCollection = db.collection('users');
    
    const pendingDoctors = await pendingCollection.find({}).toArray();
    
    // Enrich with user data
    const enriched = await Promise.all(
      pendingDoctors.map(async (pending) => {
        const user = await usersCollection.findOne(
          { id: pending.doctorId },
          { projection: { password: 0 } }
        );
        return {
          ...pending,
          user: user || null,
          credentials: {
            name: user?.name,
            email: user?.email,
            mobile: user?.mobile,
            specialization: pending.specialization,
            qualifications: pending.qualifications,
            documents: pending.documents || []
          }
        };
      })
    );
    
    res.json({
      success: true,
      data: enriched
    });
  } catch (error) {
    console.error('Get pending doctors error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch pending doctors'
    });
  }
}

/**
 * PUT /api/admin/doctors/:id/verify
 * Approve or reject a doctor
 */
export async function verifyDoctor(req, res) {
  try {
    const { doctorId } = req.params;
    const { action, note } = req.body;
    const adminId = req.user.userId;
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be "approve" or "reject"'
      });
    }
    
    const db = getDB();
    const usersCollection = db.collection('users');
    const pendingCollection = db.collection('pending_doctors');
    
    // Check if doctor exists
    const doctor = await usersCollection.findOne({ id: doctorId, role: 'doctor' });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }
    
    // Get pending record
    const pendingRecord = await pendingCollection.findOne({ doctorId });
    
    // Update user status
    const newStatus = action === 'approve' ? 'active' : 'rejected';
    await usersCollection.updateOne(
      { id: doctorId },
      { $set: { status: newStatus, updatedAt: new Date().toISOString() } }
    );
    
    // Remove from pending
    if (pendingRecord) {
      await pendingCollection.deleteOne({ doctorId });
    }
    
    // Log audit
    const auditLog = await createAuditLog({
      actorId: adminId,
      actorRole: 'admin',
      action: `doctor.${action}d`,
      targetType: 'doctor',
      targetId: doctorId,
      details: {
        action,
        note: note ? note.trim() : null,
        doctorName: doctor.name,
        doctorEmail: doctor.email
      },
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    
    // Notify doctor
    await notify({
      toRole: 'doctor',
      userId: doctorId,
      title: action === 'approve' ? 'Doctor Account Approved' : 'Doctor Account Rejected',
      message: action === 'approve'
        ? 'Your doctor account has been approved. You can now start accepting appointments.'
        : `Your doctor account has been rejected.${note ? ` Reason: ${note}` : ''}`,
      type: 'account',
      metadata: { action, note }
    });
    
    res.json({
      success: true,
      message: `Doctor ${action}d successfully`,
      data: {
        doctorId,
        status: newStatus,
        auditId: auditLog.id
      }
    });
  } catch (error) {
    console.error('Verify doctor error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify doctor'
    });
  }
}

/**
 * PUT /api/admin/system/config
 * Update system configuration
 */
export async function updateSystemConfig(req, res) {
  try {
    const { lowStockThreshold, maintenanceMode } = req.body;
    const adminId = req.user.userId;
    
    const db = getDB();
    const configCollection = db.collection('systemConfig');
    
    const updateData = {
      updatedAt: new Date().toISOString()
    };
    
    if (lowStockThreshold !== undefined) {
      updateData.lowStockThreshold = parseInt(lowStockThreshold);
    }
    
    if (maintenanceMode !== undefined) {
      updateData.maintenanceMode = Boolean(maintenanceMode);
    }
    
    await configCollection.updateOne(
      { id: 'main' },
      { $set: updateData },
      { upsert: true }
    );
    
    // Log audit
    await createAuditLog({
      actorId: adminId,
      actorRole: 'admin',
      action: 'system.config.updated',
      targetType: 'system',
      details: updateData,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.json({
      success: true,
      message: 'System configuration updated',
      data: updateData
    });
  } catch (error) {
    console.error('Update system config error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update system configuration'
    });
  }
}

/**
 * GET /api/admin/notifications
 * Get admin notifications
 */
export async function getAdminNotificationsHandler(req, res) {
  try {
    const { unreadOnly, limit } = req.query;

    const notifications = await getAdminNotifications({
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit) : 50
    });

    // Count unread notifications for admin (all admin notifications)
    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.json({
      success: true,
      data: notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Get admin notifications error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch notifications'
    });
  }
}

/**
 * PUT /api/admin/notifications/:id/read
 * Mark notification as read
 */
export async function markAdminNotificationAsRead(req, res) {
  try {
    const { id } = req.params;
    
    const success = await markNotificationAsRead(id);
    
    if (success) {
      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark notification as read'
    });
  }
}

/**
 * PUT /api/admin/notifications/read-all
 * Mark all admin notifications as read
 */
export async function markAllAdminNotificationsAsRead(req, res) {
  try {
    const adminId = req.user.userId;
    
    // Get all unread admin notifications
    const notifications = await getAdminNotifications({ unreadOnly: true });
    const notificationIds = notifications.map(n => n._id);
    
    // Mark each as read
    let count = 0;
    for (const id of notificationIds) {
      const success = await markNotificationAsRead(id.toString());
      if (success) count++;
    }
    
    res.json({
      success: true,
      message: `${count} notifications marked as read`,
      count
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark all notifications as read'
    });
  }
}







