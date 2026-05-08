/**
 * Appointment Helper Utilities
 * Reusable functions for appointment operations
 */

import { 
  checkSlotAvailability, 
  getNextAvailableSlots 
} from '../models/appointmentModel.js';

/**
 * Format time to 24-hour format (HH:MM)
 * @param {string} time - Time in any format
 * @returns {string} Time in HH:MM format
 */
export function formatTime24Hour(time) {
  if (!time) return '';
  
  // If already in HH:MM format, return as is
  if (/^\d{2}:\d{2}$/.test(time)) {
    return time;
  }
  
  // Convert from 12-hour to 24-hour format
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match) {
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const period = match[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
  
  return time;
}

/**
 * Format time to 12-hour format (HH:MM AM/PM)
 * @param {string} time - Time in HH:MM format
 * @returns {string} Time in 12-hour format
 */
export function formatTime12Hour(time) {
  if (!time) return '';
  
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} date - Date string
 * @returns {boolean} True if valid
 */
export function isValidDate(date) {
  if (!date) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) return false;
  
  const d = new Date(date);
  return d instanceof Date && !isNaN(d);
}

/**
 * Validate time format (HH:MM)
 * @param {string} time - Time string
 * @returns {boolean} True if valid
 */
export function isValidTime(time) {
  if (!time) return false;
  const regex = /^\d{2}:\d{2}$/;
  return regex.test(time);
}

/**
 * Check if appointment is in the past
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {string} time - Time (HH:MM)
 * @returns {boolean} True if in the past
 */
export function isAppointmentInPast(date, time) {
  const appointmentDateTime = new Date(`${date}T${time}:00`);
  return appointmentDateTime < new Date();
}

/**
 * Check if date is a weekend
 * @param {string} date - Date (YYYY-MM-DD)
 * @returns {boolean} True if weekend
 */
export function isWeekend(date) {
  const d = new Date(date);
  const day = d.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Get day of week name
 * @param {string} date - Date (YYYY-MM-DD)
 * @returns {string} Day name (e.g., 'Monday')
 */
export function getDayName(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const d = new Date(date);
  return days[d.getDay()];
}

/**
 * Check if time is within working hours
 * @param {string} time - Time (HH:MM)
 * @param {number} startHour - Start hour (default 9)
 * @param {number} endHour - End hour (default 17)
 * @returns {boolean} True if within working hours
 */
export function isWithinWorkingHours(time, startHour = 9, endHour = 17) {
  const [hours] = time.split(':').map(Number);
  return hours >= startHour && hours < endHour;
}

/**
 * Validate appointment booking request
 * @param {Object} data - Appointment data
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateAppointmentData(data) {
  const errors = [];
  
  if (!data.doctorId) {
    errors.push('Doctor ID is required');
  }
  
  if (!data.patientId) {
    errors.push('Patient ID is required');
  }
  
  if (!data.date) {
    errors.push('Date is required');
  } else if (!isValidDate(data.date)) {
    errors.push('Invalid date format. Use YYYY-MM-DD');
  } else if (isAppointmentInPast(data.date, data.time || '00:00')) {
    errors.push('Cannot book appointments in the past');
  }
  
  if (!data.time) {
    errors.push('Time is required');
  } else if (!isValidTime(data.time)) {
    errors.push('Invalid time format. Use HH:MM');
  } else if (!isWithinWorkingHours(data.time)) {
    errors.push('Time must be within working hours (9 AM - 5 PM)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get booking status message
 * @param {string} status - Appointment status
 * @returns {string} Human-readable status message
 */
export function getStatusMessage(status) {
  const messages = {
    'booked': 'Appointment confirmed',
    'scheduled': 'Appointment scheduled',
    'completed': 'Appointment completed',
    'cancelled': 'Appointment cancelled',
    'rescheduled': 'Appointment rescheduled',
    'no-show': 'Patient did not show up',
    'pending': 'Appointment pending confirmation'
  };
  
  return messages[status] || 'Unknown status';
}

/**
 * Calculate appointment duration
 * @param {string} startTime - Start time (HH:MM)
 * @param {number} durationMinutes - Duration in minutes (default 30)
 * @returns {string} End time (HH:MM)
 */
export function calculateEndTime(startTime, durationMinutes = 30) {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

/**
 * Get time slots for a day
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @param {number} interval - Interval in minutes
 * @returns {Array<string>} Array of time slots
 */
export function generateTimeSlots(startTime = '09:00', endTime = '17:00', interval = 30) {
  const slots = [];
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  let currentMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;
  
  while (currentMinutes < endTotalMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    slots.push(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
    currentMinutes += interval;
  }
  
  return slots;
}

/**
 * Check and get booking details with conflict handling
 * @param {string} doctorId - Doctor ID
 * @param {string} date - Date (YYYY-MM-DD)
 * @param {string} time - Time (HH:MM)
 * @returns {Promise<Object>} Booking details with conflict info
 */
export async function getBookingDetails(doctorId, date, time) {
  const validation = validateAppointmentData({ doctorId, date, time, patientId: 'temp' });
  
  if (!validation.valid) {
    return {
      canBook: false,
      errors: validation.errors
    };
  }
  
  const { available, conflict } = await checkSlotAvailability(doctorId, date, time);
  
  if (!available) {
    const suggestions = await getNextAvailableSlots(doctorId, date, time, 3);
    
    return {
      canBook: false,
      conflict: true,
      conflictDetails: conflict,
      suggestions,
      message: 'Time slot already booked. Please choose another time.'
    };
  }
  
  return {
    canBook: true,
    available: true,
    message: 'Time slot is available'
  };
}

export default {
  formatTime24Hour,
  formatTime12Hour,
  isValidDate,
  isValidTime,
  isAppointmentInPast,
  isWeekend,
  getDayName,
  isWithinWorkingHours,
  validateAppointmentData,
  getStatusMessage,
  calculateEndTime,
  generateTimeSlots,
  getBookingDetails
};
