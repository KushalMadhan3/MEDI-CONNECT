import { getDB } from '../config/mongodb.js';

/**
 * Converts time from 12-hour to 24-hour format
 * @param {string} time12h - Time in 12-hour format (e.g., "02:30 PM")
 * @returns {string} Time in 24-hour format (e.g., "14:30")
 */
export function convertTo24Hour(time12h) {
  if (!time12h) return null;
  
  const [time, period] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  
  hours = parseInt(hours, 10);
  
  if (period === 'PM' && hours < 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

/**
 * Checks if a doctor is available at a given date and time
 * @param {string} doctorId - Doctor's ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} time - Time in 12-hour format (e.g., "02:30 PM")
 * @param {string} [excludeAppointmentId] - Optional appointment ID to exclude from conflict check
 * @returns {Promise<{available: boolean, conflict?: Object}>} Availability status and conflict details if any
 */
export async function checkDoctorAvailability(doctorId, date, time, excludeAppointmentId = null) {
  const db = getDB();
  const collection = db.collection('appointments');
  
  const time24h = convertTo24Hour(time);
  
  const query = {
    doctorId,
    date,
    $or: [
      { time: time24h },
      { time: time } // Check both formats for backward compatibility
    ],
    status: { $in: ['scheduled', 'pending', 'rescheduled'] }
  };
  
  if (excludeAppointmentId) {
    query.id = { $ne: excludeAppointmentId };
  }
  
  const conflict = await collection.findOne(query);
  
  return {
    available: !conflict,
    conflict: conflict || undefined
  };
}

/**
 * Finds the next available time slot for a doctor
 * @param {string} doctorId - Doctor's ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} time - Original time in 12-hour format
 * @returns {Promise<{availableTime: string|null, message: string}>} Next available time and message
 */
export async function findNextAvailableSlot(doctorId, date, time) {
  const db = getDB();
  const collection = db.collection('appointments');
  
  // Get all appointments for the doctor on the given date
  const appointments = await collection.find({
    doctorId,
    date,
    status: { $in: ['scheduled', 'pending', 'rescheduled'] }
  }).sort({ time: 1 }).toArray();
  
  // Convert all appointment times to minutes since midnight for easier comparison
  const timeToMinutes = (timeStr) => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  };
  
  const targetTime = timeToMinutes(time);
  const timeSlots = [];
  
  // Generate time slots from 9 AM to 6 PM, 30-minute intervals
  for (let h = 9; h < 18; h++) {
    for (let m = 0; m < 60; m += 30) {
      const slotTime = `${h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
      timeSlots.push({
        display: slotTime,
        minutes: h * 60 + m
      });
    }
  }
  
  // Find the next available slot after the requested time
  for (const slot of timeSlots) {
    if (slot.minutes > targetTime) {
      const isAvailable = !appointments.some(apt => {
        const aptTime = timeToMinutes(apt.time);
        return Math.abs(aptTime - slot.minutes) < 30; // 30-minute buffer
      });
      
      if (isAvailable) {
        return {
          availableTime: slot.display,
          message: `Next available slot: ${slot.display}`
        };
      }
    }
  }
  
  return {
    availableTime: null,
    message: 'No available slots for today. Please try another day.'
  };
}

/**
 * Suggests alternative doctors with the same specialization
 * @param {string} specialization - Doctor's specialization
 * @param {string} excludeDoctorId - Doctor ID to exclude from suggestions
 * @returns {Promise<Array>} List of alternative doctors
 */
export async function suggestAlternativeDoctors(specialization, excludeDoctorId) {
  const db = getDB();
  const usersCollection = db.collection('users');
  
  return await usersCollection.find({
    role: 'doctor',
    specialization,
    status: 'active',
    id: { $ne: excludeDoctorId }
  }, {
    projection: {
      id: 1,
      name: 1,
      specialization: 1,
      experience: 1,
      rating: 1,
      image: 1
    },
    limit: 3
  }).toArray();
}

/**
 * Validates appointment data
 * @param {Object} data - Appointment data
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validateAppointmentData(data) {
  if (!data.doctorId || !data.date || !data.time) {
    return { valid: false, error: 'Doctor, date, and time are required' };
  }
  
  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    return { valid: false, error: 'Invalid date format. Use YYYY-MM-DD' };
  }
  
  // Validate time format (HH:MM AM/PM)
  if (!/^\d{1,2}:\d{2} (AM|PM)$/i.test(data.time)) {
    return { valid: false, error: 'Invalid time format. Use HH:MM AM/PM' };
  }
  
  // Validate date is not in the past
  const appointmentDate = new Date(data.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (appointmentDate < today) {
    return { valid: false, error: 'Cannot book appointments in the past' };
  }
  
  return { valid: true };
}

/**
 * Checks if an appointment can be rescheduled
 * @param {string} appointmentId - Appointment ID
 * @returns {Promise<{canReschedule: boolean, error?: string}>} Reschedule eligibility
 */
export async function canRescheduleAppointment(appointmentId) {
  const db = getDB();
  const collection = db.collection('appointments');
  
  const appointment = await collection.findOne({ id: appointmentId });
  
  if (!appointment) {
    return { canReschedule: false, error: 'Appointment not found' };
  }
  
  const now = new Date();
  const appointmentDateTime = new Date(`${appointment.date}T${convertTo24Hour(appointment.time)}`);
  const hoursUntilAppointment = (appointmentDateTime - now) / (1000 * 60 * 60);
  
  if (hoursUntilAppointment < 2) {
    return { 
      canReschedule: false, 
      error: 'Cannot reschedule within 2 hours of the appointment time' 
    };
  }
  
  if (['cancelled', 'completed', 'missed'].includes(appointment.status)) {
    return { 
      canReschedule: false, 
      error: `Cannot reschedule a ${appointment.status} appointment` 
    };
  }
  
  return { canReschedule: true };
}
