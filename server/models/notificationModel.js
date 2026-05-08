/**
 * Notification Model
 * Stores notifications for doctors and other users
 */

import { getDB } from '../config/mongodb.js';

/**
 * Get notifications collection
 */
export function getNotificationsCollection() {
  const db = getDB();
  return db.collection('notifications');
}

/**
 * Create a new notification
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Created notification
 */
export async function createNotification(notificationData) {
  const collection = getNotificationsCollection();
  const notification = {
    _id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: notificationData.userId, // Doctor ID or Patient ID
    userRole: notificationData.userRole || 'doctor',
    type: notificationData.type, // appointment, prescription, system, etc.
    title: notificationData.title,
    message: notificationData.message,
    relatedId: notificationData.relatedId || null, // Appointment ID, Prescription ID, etc.
    isRead: false,
    createdAt: new Date().toISOString()
  };
  
  await collection.insertOne(notification);
  return notification;
}

/**
 * Get notifications by user ID
 * @param {string} userId - User ID
 * @param {Object} options - Query options (limit, unreadOnly, etc.)
 * @returns {Promise<Array>} Array of notifications
 */
export async function getNotificationsByUserId(userId, options = {}) {
  const collection = getNotificationsCollection();
  const query = { userId };
  
  if (options.unreadOnly) {
    query.isRead = false;
  }
  
  const limit = options.limit || 50;
  
  return await collection
    .find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<boolean>} Success status
 */
export async function markNotificationAsRead(notificationId) {
  const { ObjectId } = await import('mongodb');
  const collection = getNotificationsCollection();
  
  // Try both string and ObjectId
  let query;
  try {
    if (ObjectId.isValid(notificationId)) {
      query = { _id: new ObjectId(notificationId) };
    } else {
      query = { _id: notificationId };
    }
  } catch (e) {
    query = { _id: notificationId };
  }
  
  const result = await collection.updateOne(
    query,
    { $set: { isRead: true } }
  );
  return result.modifiedCount > 0;
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of notifications marked as read
 */
export async function markAllNotificationsAsRead(userId) {
  const collection = getNotificationsCollection();
  const result = await collection.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true } }
  );
  return result.modifiedCount;
}

/**
 * Count unread notifications for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Count of unread notifications
 */
export async function countUnreadNotifications(userId) {
  const collection = getNotificationsCollection();
  return await collection.countDocuments({ userId, isRead: false });
}

/**
 * Get admin notifications
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of admin notifications
 */
export async function getAdminNotifications(options = {}) {
  const collection = getNotificationsCollection();
  const query = { userRole: 'admin' };
  
  if (options.unreadOnly) {
    query.isRead = false;
  }
  
  const limit = options.limit || 50;
  
  return await collection
    .find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}