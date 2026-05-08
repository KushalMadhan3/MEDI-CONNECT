/**
 * Audit Log Model
 * Tracks all admin actions and important system events for compliance
 */

import { getDB } from '../config/mongodb.js';

/**
 * Get audit logs collection
 */
export function getAuditLogsCollection() {
  const db = getDB();
  return db.collection('auditLogs');
}

/**
 * Create an audit log entry
 * @param {Object} logData - Audit log data
 * @returns {Promise<Object>} Created audit log
 */
export async function createAuditLog(logData) {
  const collection = getAuditLogsCollection();
  
  const auditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    actorId: logData.actorId,
    actorRole: logData.actorRole || 'admin',
    action: logData.action, // e.g., 'user.updated', 'doctor.approved', 'bulk.users.updated'
    targetType: logData.targetType, // e.g., 'user', 'appointment', 'doctor', 'system'
    targetId: logData.targetId || null,
    details: logData.details || {},
    ip: logData.ip || null,
    userAgent: logData.userAgent || null,
    timestamp: new Date().toISOString(),
    // Retention: logs older than 1 year will be archived (handled by cleanup job)
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year TTL
  };
  
  await collection.insertOne(auditLog);
  return auditLog;
}

/**
 * Get audit logs with filters and pagination
 * @param {Object} filters - Filter criteria
 * @param {Object} options - Pagination and sorting options
 * @returns {Promise<Object>} Audit logs with pagination metadata
 */
export async function getAuditLogs(filters = {}, options = {}) {
  const collection = getAuditLogsCollection();
  
  const {
    page = 1,
    limit = 50,
    sortBy = 'timestamp',
    sortOrder = 'desc'
  } = options;
  
  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
  
  // Build query
  const query = {};
  if (filters.actorId) query.actorId = filters.actorId;
  if (filters.actorRole) query.actorRole = filters.actorRole;
  if (filters.action) query.action = { $regex: filters.action, $options: 'i' };
  if (filters.targetType) query.targetType = filters.targetType;
  if (filters.targetId) query.targetId = filters.targetId;
  if (filters.fromDate || filters.toDate) {
    query.timestamp = {};
    if (filters.fromDate) query.timestamp.$gte = filters.fromDate;
    if (filters.toDate) query.timestamp.$lte = filters.toDate;
  }
  
  const logs = await collection.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .toArray();
  
  const total = await collection.countDocuments(query);
  
  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

/**
 * Get audit logs for a specific target
 * @param {string} targetType - Type of target
 * @param {string} targetId - Target ID
 * @returns {Promise<Array>} Array of audit logs
 */
export async function getAuditLogsByTarget(targetType, targetId) {
  const collection = getAuditLogsCollection();
  return await collection.find({
    targetType,
    targetId
  })
    .sort({ timestamp: -1 })
    .toArray();
}

/**
 * Clean up expired audit logs (run via cron job)
 * @returns {Promise<number>} Number of deleted logs
 */
export async function cleanupExpiredAuditLogs() {
  const collection = getAuditLogsCollection();
  const result = await collection.deleteMany({
    expiresAt: { $lt: new Date().toISOString() }
  });
  return result.deletedCount;
}









