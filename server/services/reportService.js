/**
 * Report Service
 * Generates CSV/PDF reports for admin exports
 */

import { getDB } from '../config/mongodb.js';

/**
 * Generate CSV content from data
 * @param {Array} data - Array of objects
 * @param {Array} headers - Column headers
 * @param {Function} rowMapper - Function to map each row
 * @returns {string} CSV content
 */
export function generateCSV(data, headers, rowMapper) {
  const csvHeaders = headers.map(h => `"${h}"`).join(',');
  const csvRows = data.map(row => {
    const mappedRow = rowMapper(row);
    return mappedRow.map(field => {
      const value = String(field || '').replace(/"/g, '""');
      return `"${value}"`;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Export users report
 * @param {Array} users - User data
 * @param {string} format - 'csv' or 'pdf'
 * @returns {Promise<string|Object>} CSV string or PDF data object
 */
export async function exportUsersReport(users, format = 'csv') {
  const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Mobile', 'Gender', 'Created At', 'Updated At'];
  
  const rowMapper = (user) => [
    user.id || user._id,
    user.name || '',
    user.email || '',
    user.role || '',
    user.status || '',
    user.mobile || '',
    user.gender || '',
    user.createdAt || '',
    user.updatedAt || ''
  ];
  
  if (format === 'csv') {
    return generateCSV(users, headers, rowMapper);
  } else {
    // For PDF, return structured data
    return {
      title: 'Users Report',
      headers,
      data: users.map(user => rowMapper(user))
    };
  }
}

/**
 * Export appointments report
 * @param {Array} appointments - Appointment data
 * @param {string} format - 'csv' or 'pdf'
 * @returns {Promise<string|Object>} CSV string or PDF data object
 */
export async function exportAppointmentsReport(appointments, format = 'csv') {
  const headers = [
    'Appointment ID',
    'Patient Name',
    'Patient Email',
    'Doctor Name',
    'Date',
    'Time',
    'Status',
    'Payment Status',
    'Payment Method',
    'Amount',
    'Created At'
  ];
  
  const rowMapper = (apt) => [
    apt._id || apt.id,
    apt.patientName || '',
    apt.patientEmail || '',
    apt.doctorName || '',
    apt.date || '',
    apt.time || '',
    apt.status || '',
    apt.payment?.status || apt.paymentStatus || '',
    apt.payment?.method || apt.paymentMethod || '',
    apt.payment?.paidAmount || apt.payment?.amount || 0,
    apt.createdAt || ''
  ];
  
  if (format === 'csv') {
    return generateCSV(appointments, headers, rowMapper);
  } else {
    return {
      title: 'Appointments Report',
      headers,
      data: appointments.map(apt => rowMapper(apt))
    };
  }
}

/**
 * Export payments report
 * @param {Array} payments - Payment data
 * @param {string} format - 'csv' or 'pdf'
 * @returns {Promise<string|Object>} CSV string or PDF data object
 */
export async function exportPaymentsReport(payments, format = 'csv') {
  const headers = [
    'Transaction ID',
    'Appointment ID',
    'Patient Name',
    'Amount',
    'Payment Method',
    'Status',
    'Timestamp',
    'Transaction Time'
  ];
  
  const rowMapper = (payment) => [
    payment.transactionId || payment.paymentId || '',
    payment.appointmentId || '',
    payment.patientName || '',
    payment.amount || payment.paidAmount || 0,
    payment.method || payment.paymentMethod || '',
    payment.status || '',
    payment.timestamp || payment.transactionTime || '',
    payment.createdAt || ''
  ];
  
  if (format === 'csv') {
    return generateCSV(payments, headers, rowMapper);
  } else {
    return {
      title: 'Payments Report',
      headers,
      data: payments.map(payment => rowMapper(payment))
    };
  }
}

/**
 * Export activity logs report
 * @param {Array} logs - Audit log data
 * @param {string} format - 'csv' or 'pdf'
 * @returns {Promise<string|Object>} CSV string or PDF data object
 */
export async function exportActivityLogsReport(logs, format = 'csv') {
  const headers = [
    'Log ID',
    'Actor ID',
    'Actor Role',
    'Action',
    'Target Type',
    'Target ID',
    'IP Address',
    'Timestamp'
  ];
  
  const rowMapper = (log) => [
    log.id || log._id,
    log.actorId || '',
    log.actorRole || '',
    log.action || '',
    log.targetType || '',
    log.targetId || '',
    log.ip || '',
    log.timestamp || ''
  ];
  
  if (format === 'csv') {
    return generateCSV(logs, headers, rowMapper);
  } else {
    return {
      title: 'Activity Logs Report',
      headers,
      data: logs.map(log => rowMapper(log))
    };
  }
}

/**
 * Export analytics report
 * @param {Object} analytics - Analytics data
 * @param {string} format - 'csv' or 'pdf'
 * @returns {Promise<string|Object>} CSV string or PDF data object
 */
export async function exportAnalyticsReport(analytics, format = 'csv') {
  if (format === 'csv') {
    const lines = [];
    lines.push('Analytics Report');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');
    
    // Users by role
    lines.push('Users by Role');
    lines.push('Role,Count');
    Object.entries(analytics.usersByRole || {}).forEach(([role, count]) => {
      lines.push(`${role},${count}`);
    });
    lines.push('');
    
    // Appointments by status
    lines.push('Appointments by Status');
    lines.push('Status,Count');
    Object.entries(analytics.appointmentsByStatus || {}).forEach(([status, count]) => {
      lines.push(`${status},${count}`);
    });
    lines.push('');
    
    // Revenue by day
    lines.push('Revenue by Day');
    lines.push('Date,Amount');
    (analytics.revenueByDay || []).forEach(item => {
      lines.push(`${item.date},${item.amount}`);
    });
    lines.push('');
    
    // Low stock items
    lines.push('Low Stock Items');
    lines.push('ID,Name,Stock');
    (analytics.lowStockItems || []).forEach(item => {
      lines.push(`${item.id},${item.name},${item.stock}`);
    });
    
    return lines.join('\n');
  } else {
    return {
      title: 'Analytics Report',
      generatedAt: new Date().toISOString(),
      data: analytics
    };
  }
}









