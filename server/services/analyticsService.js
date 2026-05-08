/**
 * Analytics Service
 * Computes analytics data for doctors and system
 */

import { getDB } from '../config/mongodb.js';
import { getAppointmentsByDoctorId, countAppointmentsByDateRange } from '../models/appointmentModel.js';

/**
 * Get weekly appointment counts (per day for last 7 days)
 * @param {string} doctorId - Doctor ID
 * @returns {Promise<Array>} Array of { date, count }
 */
export async function getWeeklyAppointmentCounts(doctorId) {
  const db = getDB();
  const appointmentsCollection = db.collection('appointments');
  
  // Get last 7 days
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const startDate = sevenDaysAgo.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];
  
  // Get appointments in date range
  const appointments = await appointmentsCollection.find({
    doctorId,
    date: { $gte: startDate, $lte: endDate },
    status: { $nin: ['cancelled'] }
  }).toArray();
  
  // Group by date
  const countsByDate = {};
  appointments.forEach(apt => {
    const date = apt.date;
    countsByDate[date] = (countsByDate[date] || 0) + 1;
  });
  
  // Generate array for last 7 days
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    result.push({
      date: dateStr,
      count: countsByDate[dateStr] || 0
    });
  }
  
  return result;
}

/**
 * Get monthly revenue grouped by month
 * @param {string} doctorId - Doctor ID
 * @param {number} months - Number of months to include (default: 6)
 * @returns {Promise<Array>} Array of { month, revenue, count }
 */
export async function getMonthlyRevenue(doctorId, months = 6) {
  const db = getDB();
  const appointmentsCollection = db.collection('appointments');
  
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth() - months, 1);
  
  // Get completed appointments with payment
  // Support both payment object and legacy fields
  const appointments = await appointmentsCollection.find({
    doctorId,
    status: 'completed',
    $or: [
      { 'payment.status': 'paid' },
      { paymentStatus: 'paid' }
    ]
  }).toArray();
  
  // Filter by date range (check both createdAt and date fields)
  const filteredAppointments = appointments.filter(apt => {
    const aptDate = apt.createdAt ? new Date(apt.createdAt) : (apt.date ? new Date(apt.date + 'T00:00:00') : null);
    if (!aptDate) return false;
    return aptDate >= startDate;
  });
  
  // Group by month
  const revenueByMonth = {};
  
  filteredAppointments.forEach(apt => {
    const aptDate = apt.createdAt ? new Date(apt.createdAt) : (apt.date ? new Date(apt.date) : new Date());
    const monthKey = `${aptDate.getFullYear()}-${String(aptDate.getMonth() + 1).padStart(2, '0')}`;
    const monthName = aptDate.toLocaleString('default', { month: 'short' });
    
    if (!revenueByMonth[monthKey]) {
      revenueByMonth[monthKey] = {
        month: monthName,
        revenue: 0,
        count: 0
      };
    }
    
    // Get paid amount from payment object or default to 500
    const paidAmount = apt.payment?.paidAmount || apt.payment?.amount || (apt.paymentStatus === 'paid' ? 500 : 0);
    revenueByMonth[monthKey].revenue += paidAmount;
    revenueByMonth[monthKey].count += 1;
  });
  
  // Convert to array and sort
  return Object.values(revenueByMonth).sort((a, b) => {
    const aIndex = Object.keys(revenueByMonth).indexOf(Object.keys(revenueByMonth).find(k => revenueByMonth[k].month === a.month));
    const bIndex = Object.keys(revenueByMonth).indexOf(Object.keys(revenueByMonth).find(k => revenueByMonth[k].month === b.month));
    return aIndex - bIndex;
  });
}

/**
 * Get average appointment duration
 * @param {string} doctorId - Doctor ID
 * @returns {Promise<number>} Average duration in minutes
 */
export async function getAverageAppointmentDuration(doctorId) {
  const db = getDB();
  const appointmentsCollection = db.collection('appointments');
  
  // Get completed appointments
  const appointments = await appointmentsCollection.find({
    doctorId,
    status: 'completed'
  }).toArray();
  
  if (appointments.length === 0) {
    return 0;
  }
  
  // Calculate average (default 30 minutes if no duration field)
  const totalDuration = appointments.reduce((sum, apt) => {
    return sum + (apt.duration || 30); // Default 30 minutes
  }, 0);
  
  return Math.round(totalDuration / appointments.length);
}

/**
 * Get top diagnoses
 * @param {string} doctorId - Doctor ID
 * @param {number} limit - Number of top diagnoses (default: 5)
 * @returns {Promise<Array>} Array of { diagnosis, count }
 */
export async function getTopDiagnoses(doctorId, limit = 5) {
  const db = getDB();
  const medicalRecordsCollection = db.collection('medicalRecords');
  
  // Get medical records for this doctor
  const records = await medicalRecordsCollection.find({
    doctorId
  }).toArray();
  
  // Count diagnoses
  const diagnosisCounts = {};
  records.forEach(record => {
    if (record.diagnosis) {
      diagnosisCounts[record.diagnosis] = (diagnosisCounts[record.diagnosis] || 0) + 1;
    }
  });
  
  // Sort and return top N
  return Object.entries(diagnosisCounts)
    .map(([diagnosis, count]) => ({ diagnosis, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Get doctor analytics
 * @param {string} doctorId - Doctor ID
 * @param {Object} options - Options (dateRange, etc.)
 * @returns {Promise<Object>} Analytics data
 */
export async function getDoctorAnalytics(doctorId, options = {}) {
  const today = new Date().toISOString().split('T')[0];
  
  // Get today's count
  const todayAppointments = await getAppointmentsByDoctorId(doctorId, {
    date: today,
    status: { $nin: ['cancelled'] }
  });
  const todayCount = todayAppointments.length;
  
  // Get weekly counts
  const weekCounts = await getWeeklyAppointmentCounts(doctorId);
  
  // Get monthly revenue
  const monthRevenue = await getMonthlyRevenue(doctorId, 6);
  
  // Get average duration
  const avgAppointmentDuration = await getAverageAppointmentDuration(doctorId);
  
  // Get top diagnoses
  const topDiagnoses = await getTopDiagnoses(doctorId, 5);
  
  return {
    todayCount,
    weekCounts,
    monthRevenue,
    avgAppointmentDuration,
    topDiagnoses
  };
}

