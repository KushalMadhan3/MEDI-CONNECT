/**
 * Metrics Service
 * Aggregates system-wide metrics for analytics dashboard
 */

import { getDB } from '../config/mongodb.js';

/**
 * Get user growth metrics
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 * @returns {Promise<Array>} Array of { date, count }
 */
export async function getUserGrowthMetrics(fromDate, toDate) {
  const db = getDB();
  const usersCollection = db.collection('users');
  
  const users = await usersCollection.find({
    createdAt: {
      $gte: fromDate.toISOString(),
      $lte: toDate.toISOString()
    }
  }).toArray();
  
  // Group by date
  const countsByDate = {};
  users.forEach(user => {
    const date = user.createdAt ? user.createdAt.split('T')[0] : new Date().toISOString().split('T')[0];
    countsByDate[date] = (countsByDate[date] || 0) + 1;
  });
  
  // Convert to array
  return Object.entries(countsByDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get users by role
 * @returns {Promise<Object>} Object with role counts
 */
export async function getUsersByRole() {
  const db = getDB();
  const usersCollection = db.collection('users');
  
  const result = await usersCollection.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ]).toArray();
  
  const usersByRole = {};
  result.forEach(item => {
    usersByRole[item._id || 'unknown'] = item.count;
  });
  
  return usersByRole;
}

/**
 * Get new users by day
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 * @returns {Promise<Array>} Array of { date, count }
 */
export async function getNewUsersByDay(fromDate, toDate) {
  const db = getDB();
  const usersCollection = db.collection('users');
  
  const result = await usersCollection.aggregate([
    {
      $match: {
        createdAt: {
          $gte: fromDate.toISOString(),
          $lte: toDate.toISOString()
        }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: { $dateFromString: { dateString: '$createdAt' } } } },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]).toArray();
  
  return result.map(item => ({
    date: item._id,
    count: item.count
  }));
}

/**
 * Get appointments by status
 * @returns {Promise<Object>} Object with status counts
 */
export async function getAppointmentsByStatus() {
  const db = getDB();
  const appointmentsCollection = db.collection('appointments');
  
  const result = await appointmentsCollection.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]).toArray();
  
  const appointmentsByStatus = {};
  result.forEach(item => {
    appointmentsByStatus[item._id || 'unknown'] = item.count;
  });
  
  return appointmentsByStatus;
}

/**
 * Get revenue by day
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 * @returns {Promise<Array>} Array of { date, amount }
 */
export async function getRevenueByDay(fromDate, toDate) {
  const db = getDB();
  const appointmentsCollection = db.collection('appointments');
  
  const appointments = await appointmentsCollection.find({
    status: 'completed',
    $or: [
      { 'payment.status': 'paid' },
      { paymentStatus: 'paid' }
    ],
    createdAt: {
      $gte: fromDate.toISOString(),
      $lte: toDate.toISOString()
    }
  }).toArray();
  
  // Group by date
  const revenueByDate = {};
  appointments.forEach(apt => {
    const date = apt.createdAt ? apt.createdAt.split('T')[0] : apt.date || new Date().toISOString().split('T')[0];
    const paidAmount = apt.payment?.paidAmount || apt.payment?.amount || (apt.paymentStatus === 'paid' ? 500 : 0);
    
    revenueByDate[date] = (revenueByDate[date] || 0) + paidAmount;
  });
  
  // Convert to array
  return Object.entries(revenueByDate)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get low stock items
 * @param {number} threshold - Low stock threshold (default: 10)
 * @returns {Promise<Array>} Array of low stock items
 */
export async function getLowStockItems(threshold = 10) {
  const db = getDB();
  const medicinesCollection = db.collection('medicines');
  
  const lowStockItems = await medicinesCollection.find({
    stock: { $lte: threshold }
  }).toArray();
  
  return lowStockItems.map(item => ({
    id: item._id || item.id,
    name: item.name,
    stock: item.stock,
    price: item.price,
    category: item.category
  }));
}

/**
 * Get revenue summary
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 * @returns {Promise<Object>} Revenue summary
 */
export async function getRevenueSummary(fromDate, toDate) {
  const db = getDB();
  const appointmentsCollection = db.collection('appointments');
  
  const appointments = await appointmentsCollection.find({
    status: 'completed',
    $or: [
      { 'payment.status': 'paid' },
      { paymentStatus: 'paid' }
    ],
    createdAt: {
      $gte: fromDate.toISOString(),
      $lte: toDate.toISOString()
    }
  }).toArray();
  
  let totalRevenue = 0;
  let totalTransactions = 0;
  const revenueByMethod = {};
  
  appointments.forEach(apt => {
    const paidAmount = apt.payment?.paidAmount || apt.payment?.amount || (apt.paymentStatus === 'paid' ? 500 : 0);
    const method = apt.payment?.method || apt.paymentMethod || 'unknown';
    
    totalRevenue += paidAmount;
    totalTransactions += 1;
    revenueByMethod[method] = (revenueByMethod[method] || 0) + paidAmount;
  });
  
  return {
    totalRevenue,
    totalTransactions,
    averageTransaction: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
    revenueByMethod
  };
}

/**
 * Get system metrics
 * @param {Object} options - Options (from, to, etc.)
 * @returns {Promise<Object>} System metrics
 */
export async function getSystemMetrics(options = {}) {
  const fromDate = options.from ? new Date(options.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = options.to ? new Date(options.to) : new Date();
  
  const [
    usersByRole,
    newUsersByDay,
    appointmentsByStatus,
    revenueByDay,
    lowStockItems,
    revenueSummary
  ] = await Promise.all([
    getUsersByRole(),
    getNewUsersByDay(fromDate, toDate),
    getAppointmentsByStatus(),
    getRevenueByDay(fromDate, toDate),
    getLowStockItems(options.lowStockThreshold || 10),
    getRevenueSummary(fromDate, toDate)
  ]);
  
  return {
    usersByRole,
    newUsersByDay,
    appointmentsByStatus,
    revenueByDay,
    lowStockItems,
    revenueSummary
  };
}









