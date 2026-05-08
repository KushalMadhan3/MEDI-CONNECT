/**
 * Appointment Model
 * Stores appointment information between doctors and patients
 */

import { getDB } from '../config/mongodb.js';

/**
 * Get appointments collection
 */
export function getAppointmentsCollection() {
  const db = getDB();
  return db.collection('appointments');
}

/**
 * Check if time slot is available (no conflicts)
 * @param {string} doctorId - Doctor ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {string} time - Time (HH:MM)
 * @param {string} excludeAppointmentId - Appointment ID to exclude (for rescheduling)
 * @returns {Promise<Object>} { available: boolean, conflict: Object|null }
 */
export async function checkSlotAvailability(doctorId, date, time, excludeAppointmentId = null) {
  const collection = getAppointmentsCollection();
  
  const query = {
    doctorId,
    date,
    time,
    status: { $nin: ['cancelled', 'no-show'] } // Don't count cancelled or no-show appointments
  };
  
  // Exclude specific appointment (for rescheduling)
  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }
  
  const conflict = await collection.findOne(query);
  
  return {
    available: !conflict,
    conflict: conflict || null
  };
}

/**
 * Generate next available time slots
 * @param {string} doctorId - Doctor ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {string} currentTime - Current time slot that's booked (HH:MM)
 * @param {number} count - Number of slots to generate
 * @returns {Promise<Array>} Array of available time slots
 */
export async function getNextAvailableSlots(doctorId, date, currentTime, count = 3) {
  const collection = getAppointmentsCollection();
  
  // Generate potential time slots (15 min intervals)
  const [hours, minutes] = currentTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const slots = [];
  
  // Generate next 10 slots to find available ones
  for (let i = 1; i <= 10 && slots.length < count; i++) {
    const newMinutes = startMinutes + (i * 15);
    const newHours = Math.floor(newMinutes / 60);
    const newMins = newMinutes % 60;
    
    // Only suggest slots during working hours (9 AM - 5 PM)
    if (newHours >= 9 && newHours < 17) {
      const timeSlot = `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
      
      // Check if slot is available
      const { available } = await checkSlotAvailability(doctorId, date, timeSlot);
      if (available) {
        slots.push(timeSlot);
      }
    }
  }
  
  return slots;
}

/**
 * Create a new appointment with conflict checking
 * @param {Object} appointmentData - Appointment data
 * @returns {Promise<Object>} Created appointment or error with suggestions
 */
export async function createAppointment(appointmentData) {
  const collection = getAppointmentsCollection();
  
  // Check for conflicts using atomic operation to prevent race conditions
  const { available, conflict } = await checkSlotAvailability(
    appointmentData.doctorId,
    appointmentData.date,
    appointmentData.time
  );
  
  if (!available) {
    const error = new Error('This slot is already booked. Please choose another slot.');
    error.code = 'SLOT_CONFLICT';
    error.conflict = conflict;
    throw error;
  }
  
  // Create appointment with the required structure including payment fields
  // Note: MongoDB will auto-generate _id as ObjectId, we use 'id' field for string-based lookups
  const appointmentId = `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const appointment = {
    id: appointmentId, // String ID for easy lookups
    doctorId: appointmentData.doctorId,
    doctorName: appointmentData.doctorName,
    doctorSpecialization: appointmentData.doctorSpecialization || 'General Medicine',
    patientId: appointmentData.patientId,
    patientName: appointmentData.patientName,
    patientEmail: appointmentData.patientEmail,
    patientPhone: appointmentData.patientPhone || null,
    patientAge: appointmentData.patientAge || null,
    patientGender: appointmentData.patientGender || null,
    patientAddress: appointmentData.patientAddress || null,
    reason: appointmentData.reason || appointmentData.notes || '',
    date: appointmentData.date, // Format: YYYY-MM-DD
    time: appointmentData.time, // Format: HH:MM
    type: appointmentData.type || 'consultation',
    status: appointmentData.status || 'confirmed',
    // Enhanced Payment fields with full metadata
    payment: {
      status: appointmentData.paymentStatus || appointmentData.payment?.status || 'pending', // paid, pending, failed
      method: appointmentData.paymentMethod || appointmentData.payment?.method || null, // upi, card, netbanking
      transactionId: appointmentData.paymentId || appointmentData.payment?.transactionId || null,
      paidAmount: appointmentData.paidAmount || appointmentData.payment?.paidAmount || appointmentData.consultationPrice || 500,
      timestamp: appointmentData.transactionTime || appointmentData.payment?.timestamp || new Date().toISOString(),
      currency: 'INR'
    },
    // Legacy fields for backward compatibility
    paymentStatus: appointmentData.paymentStatus || appointmentData.payment?.status || 'pending',
    paymentMethod: appointmentData.paymentMethod || appointmentData.payment?.method || null,
    paymentId: appointmentData.paymentId || appointmentData.payment?.transactionId || null,
    transactionTime: appointmentData.transactionTime || appointmentData.payment?.timestamp || null,
    location: appointmentData.location || null,
    // Additional fields
    notes: appointmentData.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  await collection.insertOne(appointment);
  return appointment;
}

/**
 * Get appointment by ID
 * @param {string} appointmentId - Appointment ID (can be string 'id' field or ObjectId '_id')
 * @returns {Promise<Object|null>} Appointment or null
 */
export async function getAppointmentById(appointmentId) {
  if (!appointmentId) {
    return null;
  }
  
  const collection = getAppointmentsCollection();
  const { ObjectId } = await import('mongodb');
  
  // First try to find by string 'id' field (most common case)
  let appointment = await collection.findOne({ id: appointmentId });
  
  // If not found and appointmentId looks like an ObjectId, try _id
  if (!appointment && ObjectId.isValid(appointmentId) && appointmentId.length === 24) {
    try {
      appointment = await collection.findOne({ _id: new ObjectId(appointmentId) });
    } catch (error) {
      // If ObjectId conversion fails, try as string
      appointment = await collection.findOne({ _id: appointmentId });
    }
  }
  
  // If still not found, try _id as string (for backward compatibility)
  if (!appointment) {
    appointment = await collection.findOne({ _id: appointmentId });
  }
  
  return appointment;
}

/**
 * Get appointments by doctor ID
 * @param {string} doctorId - Doctor ID
 * @param {Object} filters - Additional filters (date, status, etc.)
 * @returns {Promise<Array>} Array of appointments
 */
export async function getAppointmentsByDoctorId(doctorId, filters = {}) {
  const collection = getAppointmentsCollection();
  const query = { doctorId, ...filters };
  return await collection.find(query).sort({ date: 1, time: 1 }).toArray();
}

/**
 * Get today's appointments for a doctor
 * @param {string} doctorId - Doctor ID
 * @returns {Promise<Array>} Array of today's appointments with patient details
 */
export async function getTodayAppointments(doctorId) {
  const collection = getAppointmentsCollection();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const appointments = await collection.find({
    doctorId,
    date: today
  }).sort({ time: 1 }).toArray();
  
  return appointments;
}

/**
 * Update appointment status
 * @param {string} appointmentId - Appointment ID
 * @param {string} status - New status
 * @param {Object} updateData - Additional data to update
 * @returns {Promise<Object|null>} Updated appointment or null
 */
export async function updateAppointmentStatus(appointmentId, status, updateData = {}) {
  if (!appointmentId) {
    return null;
  }
  
  const collection = getAppointmentsCollection();
  const { ObjectId } = await import('mongodb');
  
  const update = {
    $set: {
      status,
      updatedAt: new Date().toISOString(),
      ...updateData
    }
  };
  
  // Try to find and update by 'id' field first (string)
  let result = await collection.findOneAndUpdate(
    { id: appointmentId },
    update,
    { returnDocument: 'after' }
  );
  
  // If not found and appointmentId looks like an ObjectId, try _id
  if (!result && ObjectId.isValid(appointmentId) && appointmentId.length === 24) {
    try {
      result = await collection.findOneAndUpdate(
        { _id: new ObjectId(appointmentId) },
        update,
        { returnDocument: 'after' }
      );
    } catch (error) {
      // If ObjectId conversion fails, try as string
      result = await collection.findOneAndUpdate(
        { _id: appointmentId },
        update,
        { returnDocument: 'after' }
      );
    }
  }
  
  // If still not found, try _id as string (for backward compatibility)
  if (!result) {
    result = await collection.findOneAndUpdate(
      { _id: appointmentId },
      update,
      { returnDocument: 'after' }
    );
  }
  
  return result;
}

/**
 * Cancel appointment
 * @param {string} appointmentId - Appointment ID
 * @param {string} cancelledBy - User ID who cancelled
 * @param {string} cancellationReason - Reason for cancellation
 * @returns {Promise<Object|null>} Updated appointment or null
 */
export async function cancelAppointment(appointmentId, cancelledBy, cancellationReason = null) {
  if (!appointmentId) {
    return null;
  }
  
  const collection = getAppointmentsCollection();
  const { ObjectId } = await import('mongodb');
  
  const update = {
    $set: {
      status: 'cancelled',
      cancelledBy,
      cancellationReason,
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
  
  // Try to find and update by 'id' field first (string)
  let result = await collection.findOneAndUpdate(
    { id: appointmentId },
    update,
    { returnDocument: 'after' }
  );
  
  // If not found and appointmentId looks like an ObjectId, try _id
  if (!result && ObjectId.isValid(appointmentId) && appointmentId.length === 24) {
    try {
      result = await collection.findOneAndUpdate(
        { _id: new ObjectId(appointmentId) },
        update,
        { returnDocument: 'after' }
      );
    } catch (error) {
      // If ObjectId conversion fails, try as string
      result = await collection.findOneAndUpdate(
        { _id: appointmentId },
        update,
        { returnDocument: 'after' }
      );
    }
  }
  
  // If still not found, try _id as string (for backward compatibility)
  if (!result) {
    result = await collection.findOneAndUpdate(
      { _id: appointmentId },
      update,
      { returnDocument: 'after' }
    );
  }
  
  return result;
}

/**
 * Reschedule appointment
 * @param {string} appointmentId - Appointment ID
 * @param {string} newDate - New date (YYYY-MM-DD)
 * @param {string} newTime - New time (HH:MM)
 * @param {string} rescheduledBy - User ID who rescheduled
 * @returns {Promise<Object>} Updated appointment or error with suggestions
 */
export async function rescheduleAppointment(appointmentId, newDate, newTime, rescheduledBy) {
  const collection = getAppointmentsCollection();
  
  // Get original appointment
  const appointment = await getAppointmentById(appointmentId);
  if (!appointment) {
    throw new Error('Appointment not found');
  }
  
  // Check if new slot is available (excluding current appointment)
  const { available, conflict } = await checkSlotAvailability(
    appointment.doctorId,
    newDate,
    newTime,
    appointmentId
  );
  
  if (!available) {
    const error = new Error('This slot is already booked. Please choose another slot.');
    error.code = 'SLOT_CONFLICT';
    error.conflict = conflict;
    throw error;
  }
  
  // Update appointment
  const update = {
    $set: {
      date: newDate,
      time: newTime,
      status: 'rescheduled',
      previousDate: appointment.date,
      previousTime: appointment.time,
      rescheduledBy,
      rescheduledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
  
  const { ObjectId } = await import('mongodb');
  
  // Try to find and update by 'id' field first (string)
  let result = await collection.findOneAndUpdate(
    { id: appointmentId },
    update,
    { returnDocument: 'after' }
  );
  
  // If not found and appointmentId looks like an ObjectId, try _id
  if (!result && ObjectId.isValid(appointmentId) && appointmentId.length === 24) {
    try {
      result = await collection.findOneAndUpdate(
        { _id: new ObjectId(appointmentId) },
        update,
        { returnDocument: 'after' }
      );
    } catch (error) {
      // If ObjectId conversion fails, try as string
      result = await collection.findOneAndUpdate(
        { _id: appointmentId },
        update,
        { returnDocument: 'after' }
      );
    }
  }
  
  // If still not found, try _id as string (for backward compatibility)
  if (!result) {
    result = await collection.findOneAndUpdate(
      { _id: appointmentId },
      update,
      { returnDocument: 'after' }
    );
  }
  
  return result;
}

/**
 * Mark appointment as no-show
 * @param {string} appointmentId - Appointment ID
 * @returns {Promise<Object|null>} Updated appointment or null
 */
export async function markAsNoShow(appointmentId) {
  return await updateAppointmentStatus(appointmentId, 'no-show');
}

/**
 * Get doctor's schedule for a date range
 * @param {string} doctorId - Doctor ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of appointments
 */
export async function getDoctorSchedule(doctorId, startDate, endDate) {
  const collection = getAppointmentsCollection();
  return await collection.find({
    doctorId,
    date: { $gte: startDate, $lte: endDate },
    status: { $nin: ['cancelled'] }
  }).sort({ date: 1, time: 1 }).toArray();
}

/**
 * Count appointments by doctor and date range
 * @param {string} doctorId - Doctor ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<number>} Count of appointments
 */
export async function countAppointmentsByDateRange(doctorId, startDate, endDate) {
  const collection = getAppointmentsCollection();
  return await collection.countDocuments({
    doctorId,
    date: { $gte: startDate, $lte: endDate }
  });
}

/**
 * Get appointments by patient ID
 * @param {string} patientId - Patient ID
 * @param {Object} filters - Additional filters (status, date, etc.)
 * @returns {Promise<Array>} Array of appointments
 */
export async function getAppointmentsByPatientId(patientId, filters = {}) {
  const collection = getAppointmentsCollection();
  const query = { patientId, ...filters };
  return await collection.find(query).sort({ date: 1, time: 1 }).toArray();
}

/**
 * Get all appointments for admin
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of appointments
 */
export async function getAllAppointments(filters = {}) {
  const collection = getAppointmentsCollection();
  const query = { ...filters };
  return await collection.find(query).sort({ createdAt: -1 }).toArray();
}

/**
 * Get all appointments with payment information
 * @returns {Promise<Array>} Array of appointments with payment data
 */
export async function getAllAppointmentsWithPayments() {
  const collection = getAppointmentsCollection();
  const appointments = await collection.find({}).sort({ createdAt: -1 }).toArray();
  
  // Add calculated fields like totalPaid (from paymentStatus)
  return appointments.map(appointment => ({
    ...appointment,
    totalPaid: appointment.paymentStatus === 'paid' ? 500 : 0 // Mock value, in production get from payment records
  }));
}