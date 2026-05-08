/**
 * Doctor Controller
 * Handles all doctor-related API endpoints
 */

import { getDB } from '../config/mongodb.js';
import { getChannel } from '../config/rabbitmq.js';
import redisClient from '../config/redis.js';
import {
  createPatient,
  getPatientById,
  getPatientByUserId,
  getAllPatients
} from '../models/patientModel.js';
import {
  createAppointment,
  getAppointmentById,
  getTodayAppointments,
  getAppointmentsByDoctorId,
  updateAppointmentStatus,
  countAppointmentsByDateRange,
  rescheduleAppointment,
  getDoctorSchedule
} from '../models/appointmentModel.js';
import {
  createPrescription,
  getPrescriptionsByDoctorId,
  getPrescriptionsByAppointmentId
} from '../models/prescriptionModel.js';
import {
  createNotification,
  getNotificationsByUserId,
  countUnreadNotifications
} from '../models/notificationModel.js';
import { notify } from '../services/notificationService.js';
import { getDoctorAnalytics } from '../services/analyticsService.js';

/**
 * Helper function to get Redis cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Cached data or null
 */
async function getCache(key) {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn('Redis get error:', error.message);
    return null;
  }
}

/**
 * Helper function to set Redis cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in seconds
 */
async function setCache(key, data, ttl = 30) {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    await redisClient.setEx(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.warn('Redis set error:', error.message);
  }
}

/**
 * Helper function to clear cache by pattern
 * @param {string} pattern - Cache key pattern
 */
async function clearCache(pattern) {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.warn('Redis clear error:', error.message);
  }
}

/**
 * GET /api/doctor/dashboard-stats
 * Returns dashboard statistics for the doctor
 */
export async function getDashboardStats(req, res) {
  try {
    const doctorId = req.user.userId;
    const cacheKey = `doctor:stats:${doctorId}`;

    // Try to get from cache first
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true
      });
    }

    const db = getDB();
    const today = new Date().toISOString().split('T')[0];

    // Calculate start of week (Monday) - FIX: Don't mutate the date object
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Monday
    const startOfWeek = new Date(now);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const weekStart = startOfWeek.toISOString().split('T')[0];
    const weekEnd = today;

    // Calculate start of month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().split('T')[0];

    // Get today's patients count
    const todayAppointments = await getTodayAppointments(doctorId);
    const todayPatientsCount = todayAppointments.length;

    // Get weekly appointments count
    const weeklyAppointmentsCount = await countAppointmentsByDateRange(
      doctorId,
      weekStart,
      weekEnd
    );

    // Mock satisfaction percentage (in real app, calculate from reviews)
    const satisfactionPercentage = 98;

    // Mock monthly earnings (in real app, calculate from payments)
    const monthlyEarnings = 50000;

    const stats = {
      todayPatientsCount,
      weeklyAppointmentsCount,
      satisfactionPercentage,
      monthlyEarnings
    };

    // Log for debugging
    console.log(`📊 Dashboard stats for doctor ${doctorId}:`, stats);

    // Cache the result for 30 seconds
    await setCache(cacheKey, stats, 30);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch dashboard stats'
    });
  }
}

/**
 * GET /api/doctor/today-appointments
 * Returns today's appointments for the doctor with patient details
 */
export async function getTodayAppointmentsHandler(req, res) {
  try {
    const doctorId = req.user.userId;
    
    // Get today's appointments with required patient details
    const appointments = await getTodayAppointments(doctorId);
    
    // Format response with required fields and include id for actions
    // Prioritize string 'id' field over MongoDB '_id' ObjectId
    const formattedAppointments = appointments.map(appointment => ({
      appointmentId: appointment.id || appointment._id?.toString() || appointment._id,
      id: appointment.id || appointment._id?.toString() || appointment._id, // Use string id first
      doctorId: appointment.doctorId,
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      patientEmail: appointment.patientEmail,
      patientPhone: appointment.patientPhone || null,
      patientAge: appointment.patientAge || null,
      patientGender: appointment.patientGender || null,
      patientAddress: appointment.patientAddress || null,
      reason: appointment.reason || appointment.notes || '',
      doctorName: appointment.doctorName,
      doctorEmail: appointment.doctorEmail,
      date: appointment.date,
      time: appointment.time,
      type: appointment.type || 'consultation',
      status: appointment.status,
      payment: appointment.payment || {
        status: appointment.paymentStatus || 'pending',
        method: appointment.paymentMethod || null,
        transactionId: appointment.paymentId || null,
        paidAmount: appointment.payment?.paidAmount || 500,
        timestamp: appointment.transactionTime || null
      },
      // Legacy fields for backward compatibility
      paymentStatus: appointment.paymentStatus || appointment.payment?.status || 'pending',
      paymentMethod: appointment.paymentMethod || appointment.payment?.method || null,
      paymentId: appointment.paymentId || appointment.payment?.transactionId || null,
      transactionTime: appointment.transactionTime || appointment.payment?.timestamp || null,
      location: appointment.location || null,
      notes: appointment.notes || '',
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt
    }));

    res.json({
      success: true,
      data: formattedAppointments
    });
  } catch (error) {
    console.error('Get today appointments error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch today\'s appointments'
    });
  }
}

/**
 * POST /api/doctor/add-patient
 * Adds a new patient
 */
export async function addPatient(req, res) {
  try {
    const doctorId = req.user.userId;
    const { name, email, mobile, gender, age, address, medicalHistory, allergies } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    // Check if patient already exists by email
    const db = getDB();
    const usersCollection = db.collection('users');
    const existingUser = await usersCollection.findOne({ email });

    let patient;

    if (existingUser) {
      // Patient exists in users, check if patient record exists
      const existingPatient = await getPatientByUserId(existingUser.id);
      if (existingPatient) {
        return res.status(400).json({
          success: false,
          message: 'Patient already exists'
        });
      }
      // Create patient record linked to existing user
      patient = await createPatient({
        userId: existingUser.id,
        name: existingUser.name || name,
        email: existingUser.email,
        mobile: mobile || existingUser.mobile,
        gender: gender || existingUser.gender,
        age,
        address,
        allergies: allergies || [],
        doctorId
      });
    } else {
      // Create new user first
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await usersCollection.insertOne({
        id: userId,
        name,
        email,
        mobile: mobile || null,
        gender: gender || null,
        role: 'patient',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Create patient record
      patient = await createPatient({
        userId,
        name,
        email,
        mobile,
        gender,
        age,
        address,
        medicalHistory: medicalHistory || [],
        allergies: allergies || [],
        doctorId
      });
    }

    // Create notification for doctor
    await createNotification({
      userId: doctorId,
      userRole: 'doctor',
      type: 'patient',
      title: 'New Patient Added',
      message: `Patient ${name} has been added to your records.`,
      relatedId: patient.id
    });

    res.status(201).json({
      success: true,
      message: 'Patient added successfully',
      data: patient
    });
  } catch (error) {
    console.error('Add patient error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add patient'
    });
  }
}

/**
 * GET /api/doctor/patients
 * Get doctor's patients with optional search
 * Includes patients added by doctor AND patients with appointments
 */
export async function getDoctorPatients(req, res) {
  try {
    const doctorId = req.user.userId;
    const { query } = req.query;
    const db = getDB();

    // Get patients added by this doctor
    let patients = await getAllPatients({ doctorId });

    // Also get patients who have appointments with this doctor
    const appointments = await getAppointmentsByDoctorId(doctorId);
    const appointmentPatientIds = [...new Set(appointments.map(apt => apt.patientId))];
    
    // Get patient records for appointment patients
    for (const patientId of appointmentPatientIds) {
      const patient = await getPatientById(patientId);
      if (patient && !patients.find(p => p.id === patientId)) {
        patients.push(patient);
      }
    }

    // If query provided, filter patients
    if (query && query.trim()) {
      const searchTerm = query.trim().toLowerCase();
      patients = patients.filter(patient => 
        patient.name?.toLowerCase().includes(searchTerm) ||
        patient.email?.toLowerCase().includes(searchTerm) ||
        patient.mobile?.toLowerCase().includes(searchTerm)
      );
    }

    // Sort by name
    patients.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    res.json({
      success: true,
      data: patients
    });
  } catch (error) {
    console.error('Get doctor patients error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch patients'
    });
  }
}

/**
 * GET /api/doctor/prescriptions
 * Get doctor's prescriptions
 */
export async function getDoctorPrescriptions(req, res) {
  try {
    const doctorId = req.user.userId;
    const prescriptions = await getPrescriptionsByDoctorId(doctorId);

    res.json({
      success: true,
      data: prescriptions
    });
  } catch (error) {
    console.error('Get prescriptions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch prescriptions'
    });
  }
}

/**
 * POST /api/doctor/patient-records
 * Create patient record (if patient not present, create minimal profile)
 */
export async function createPatientRecord(req, res) {
  try {
    const doctorId = req.user.userId;
    const { name, email, mobile, gender, age, address, medicalHistory, allergies } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    // Use existing addPatient function
    return await addPatient(req, res);
  } catch (error) {
    console.error('Create patient record error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create patient record'
    });
  }
}

/**
 * PUT /api/doctor/appointments/:id/prescribe
 * Prescribe medicine for an appointment (enhanced with notifications)
 */
export async function prescribeForAppointment(req, res) {
  try {
    const doctorId = req.user.userId;
    const { id: appointmentId } = req.params;
    const { symptoms, diagnosis, prescribedMedicines, notes, vitalSigns, dosageInstructions, followUpDate } = req.body;

    // Validate required fields
    if (!prescribedMedicines || !Array.isArray(prescribedMedicines) || prescribedMedicines.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Prescribed medicines are required'
      });
    }

    // Validate each medicine
    for (const med of prescribedMedicines) {
      if (!med.name) {
        return res.status(400).json({
          success: false,
          message: 'Medicine name is required for all medicines'
        });
      }
      // Sanitize medicine name
      med.name = med.name.trim();
      if (med.dosage) med.dosage = med.dosage.trim();
      if (med.instructions) med.instructions = med.instructions.trim();
    }

    // Get appointment
    const appointment = await getAppointmentById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Verify appointment belongs to this doctor
    if (appointment.doctorId !== doctorId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to prescribe for this appointment'
      });
    }

    // Get patient details
    const db = getDB();
    const patient = await db.collection('patients').findOne({ userId: appointment.patientId });

    // Create medical record
    const { createMedicalRecord } = await import('../models/medicalRecordModel.js');
    
    const medicalRecord = await createMedicalRecord({
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      patientEmail: appointment.patientEmail,
      patientAge: patient?.age || appointment.patientAge || null,
      patientGender: patient?.gender || appointment.patientGender || null,
      doctorId: appointment.doctorId,
      doctorName: appointment.doctorName,
      appointmentId: appointment.id || appointment._id?.toString() || appointment._id,
      appointmentDate: appointment.date,
      appointmentTime: appointment.time,
      diagnosis: diagnosis || null,
      symptoms: symptoms || null,
      prescribedMedicines: prescribedMedicines,
      dosageInstructions: dosageInstructions || null,
      followUpDate: followUpDate || null,
      notes: notes || null,
      vitalSigns: vitalSigns || {}
    });

    // Create prescription
    const prescription = await createPrescription({
      appointmentId: appointment.id || appointment._id?.toString() || appointment._id,
      doctorId,
      patientId: appointment.patientId,
      medicines: prescribedMedicines.map(med => ({
        name: med.name,
        dosage: med.dosage || '',
        duration: med.duration || '',
        instructions: med.instructions || '',
        timing: {
          morning: med.timing?.morning || false,
          afternoon: med.timing?.afternoon || false,
          night: med.timing?.night || false
        },
        frequency: med.frequency || ''
      })),
      diagnosis: diagnosis || '',
      notes: notes || null
    });

    // Log action
    console.log(`💊 Doctor ${doctorId} prescribed for appointment ${appointmentId}`);

    // Send notifications
    try {
      // Notify patient
      await notify({
        toRole: 'patient',
        userId: appointment.patientId,
        title: 'New Prescription Added',
        message: `New prescription has been added for your appointment on ${appointment.date} at ${appointment.time}.`,
        type: 'prescription',
        relatedId: prescription._id || prescription.id,
        metadata: {
          appointmentDate: appointment.date,
          appointmentTime: appointment.time,
          doctorName: appointment.doctorName
        }
      });

      // Notify admin (audit log)
      const doctor = await db.collection('users').findOne({ id: doctorId });
      await notify({
        toRole: 'admin',
        userId: 'admin',
        title: 'Prescription Added',
        message: `Dr. ${doctor?.name || 'Unknown'} added prescription for patient ${appointment.patientName} (Appointment: ${appointmentId}).`,
        type: 'prescription',
        relatedId: prescription._id || prescription.id,
        metadata: {
          doctorId,
          doctorName: doctor?.name,
          patientName: appointment.patientName,
          appointmentId
        }
      });
    } catch (notifError) {
      console.warn('Failed to send notifications:', notifError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Prescription saved successfully',
      data: {
        recordId: medicalRecord.id,
        prescriptionId: prescription._id || prescription.id,
        prescription,
        medicalRecord
      }
    });
  } catch (error) {
    console.error('Prescribe for appointment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save prescription'
    });
  }
}

/**
 * POST /api/doctor/prescribe/:appointmentId
 * Prescribe medicine for an appointment (legacy route, redirects to new one)
 */
export async function prescribeMedicine(req, res) {
  try {
    const doctorId = req.user.userId;
    const { appointmentId } = req.params;
    const { medicines, diagnosis, symptoms, dosageInstructions, followUpDate, notes, vitalSigns } = req.body;

    if (!appointmentId || !medicines || !Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Appointment ID and medicines are required'
      });
    }

    // Get appointment details
    const appointment = await getAppointmentById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Verify appointment belongs to this doctor
    if (appointment.doctorId !== doctorId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to prescribe for this appointment'
      });
    }

    // Get patient details
    const db = getDB();
    const patientUser = await db.collection('users').findOne({ id: appointment.patientId });
    const patient = await db.collection('patients').findOne({ userId: appointment.patientId });

    // Create medical record
    const { createMedicalRecord } = await import('../models/medicalRecordModel.js');
    
    const medicalRecord = await createMedicalRecord({
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      patientEmail: appointment.patientEmail,
      patientAge: patient?.age || null,
      patientGender: patient?.gender || null,
      doctorId: appointment.doctorId,
      doctorName: appointment.doctorName,
      appointmentId: appointment.id || appointment._id?.toString() || appointment._id,
      appointmentDate: appointment.date,
      appointmentTime: appointment.time,
      diagnosis: diagnosis || null,
      symptoms: symptoms || null,
      prescribedMedicines: medicines,
      dosageInstructions: dosageInstructions || null,
      followUpDate: followUpDate || null,
      notes: notes || null,
      vitalSigns: vitalSigns || {}
    });

    // Create prescription with enhanced structure
    const prescription = await createPrescription({
      appointmentId: appointment.id || appointment._id?.toString() || appointment._id,
      doctorId,
      patientId: appointment.patientId,
      medicines: medicines.map(med => ({
        name: med.name,
        dosage: med.dosage || '',
        duration: med.duration || '',
        instructions: med.instructions || '',
        timing: {
          morning: med.timing?.morning || false,
          afternoon: med.timing?.afternoon || false,
          night: med.timing?.night || false
        },
        frequency: med.frequency || ''
      })),
      diagnosis: diagnosis || '',
      notes: notes || null
    });

    // Notify Patient
    await createNotification({
      userId: appointment.patientId,
      userRole: 'patient',
      type: 'prescription',
      title: 'New Prescription Available',
      message: `New prescription available for your appointment on ${appointment.date}.`,
      relatedId: prescription._id
    });

    // Notify Doctor (confirmation)
    await createNotification({
      userId: doctorId,
      userRole: 'doctor',
      type: 'prescription',
      title: 'Prescription Created',
      message: `Prescription created for patient ${appointment.patientName} on ${appointment.date}.`,
      relatedId: prescription._id
    });

    // Notify Admin
    await createNotification({
      userId: 'admin',
      userRole: 'admin',
      type: 'prescription',
      title: 'Prescription Added',
      message: `Prescription added for patient ${patientUser ? patientUser.name : 'Unknown'}.`,
      relatedId: prescription._id
    });

    res.status(201).json({
      success: true,
      message: 'Prescription and medical record created successfully',
      data: {
        prescription,
        medicalRecord
      }
    });
  } catch (error) {
    console.error('Create prescription error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create prescription'
    });
  }
}

/**
 * PUT /api/doctor/appointments/:id/status
 * Updates appointment status with notifications
 */
export async function updateAppointmentStatusHandler(req, res) {
  try {
    const doctorId = req.user.userId;
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    // Validate status
    const validStatuses = ['scheduled', 'completed', 'cancelled', 'pending', 'confirmed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Verify appointment belongs to this doctor
    const appointment = await getAppointmentById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (appointment.doctorId !== doctorId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this appointment'
      });
    }

    const updateData = {};
    if (notes) updateData.notes = notes;

    // Update appointment status
    const updatedAppointment = await updateAppointmentStatus(id, status, updateData);

    if (!updatedAppointment) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update appointment'
      });
    }

    // Log action
    console.log(`📝 Doctor ${doctorId} updated appointment ${id} to status: ${status}`);

    // Send notifications
    try {
      // Notify patient
      await notify({
        toRole: 'patient',
        userId: appointment.patientId,
        title: 'Appointment Status Updated',
        message: `Your appointment on ${appointment.date} at ${appointment.time} is now ${status}.`,
        type: 'appointment',
        relatedId: id,
        metadata: {
          appointmentDate: appointment.date,
          appointmentTime: appointment.time,
          status
        }
      });

      // Notify admin
      const db = getDB();
      const doctor = await db.collection('users').findOne({ id: doctorId });
      await notify({
        toRole: 'admin',
        userId: 'admin',
        title: 'Appointment Status Changed',
        message: `Dr. ${doctor?.name || 'Unknown'} updated appointment ${id} to ${status} for patient ${appointment.patientName}.`,
        type: 'appointment',
        relatedId: id,
        metadata: {
          doctorId,
          doctorName: doctor?.name,
          patientName: appointment.patientName,
          status
        }
      });
    } catch (notifError) {
      console.warn('Failed to send notifications:', notifError.message);
      // Don't fail the request if notifications fail
    }

    // Clear cache
    await clearCache(`doctor:today-appointments:${doctorId}`);
    await clearCache(`doctor:stats:${doctorId}`);

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      data: updatedAppointment
    });
  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update appointment status'
    });
  }
}

/**
 * GET /api/doctor/notifications
 * Returns notifications for the doctor
 */
export async function getNotifications(req, res) {
  try {
    const doctorId = req.user.userId;
    const { unreadOnly, limit } = req.query;

    const notifications = await getNotificationsByUserId(doctorId, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit) : 50
    });

    const unreadCount = await countUnreadNotifications(doctorId);

    res.json({
      success: true,
      data: notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch notifications'
    });
  }
}

/**
 * GET /api/patient/doctors/:id/slots
 * Get available slots for a doctor on a specific date
 */
export async function getAvailableSlots(req, res) {
  try {
    const { id } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    if (!date) {
      return res.status(400).json({ success: false, message: 'Date is required' });
    }

    const db = getDB();

    // 1. Get Doctor Schedule (Mocked: Mon-Fri 09:00 - 17:00)
    // In real app, fetch from doctor.availability
    const startHour = 9;
    const endHour = 17;
    const slotDuration = 30; // minutes

    // 2. Generate All Possible Slots
    const allSlots = [];
    let currentTime = new Date(`${date}T${startHour.toString().padStart(2, '0')}:00:00`);
    const endTime = new Date(`${date}T${endHour.toString().padStart(2, '0')}:00:00`);

    while (currentTime < endTime) {
      const timeString = currentTime.toTimeString().substring(0, 5);
      allSlots.push(timeString);
      currentTime.setMinutes(currentTime.getMinutes() + slotDuration);
    }

    // 3. Fetch Booked Appointments for that Doctor & Date
    const bookedAppointments = await db.collection('appointments').find({
      doctorId: id,
      date: date,
      status: { $nin: ['cancelled', 'rejected'] }
    }).toArray();

    // 4. Filter Available Slots
    const bookedTimes = bookedAppointments.map(app => app.time);

    const slots = allSlots.map(time => ({
      time,
      available: !bookedTimes.includes(time)
    }));

    res.json({
      success: true,
      data: slots
    });

  } catch (error) {
    console.error('Get slots error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch slots' });
  }
}

/**
 * GET /api/doctor/earnings
 * Get doctor's earnings report
 */
export async function getDoctorEarningsReport(req, res) {
  try {
    const doctorId = req.user.userId;
    const { period = 'month' } = req.query; // 'week', 'month', 'year'
    
    const db = getDB();
    const appointmentsCollection = db.collection('appointments');
    
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    // Get completed appointments in the period
    const appointments = await appointmentsCollection.find({
      doctorId,
      status: 'completed',
      createdAt: { $gte: startDate.toISOString() }
    }).toArray();
    
    // Calculate earnings (assuming fixed consultation fee for simplicity)
    // In a real app, this would come from a doctor profile or pricing model
    const consultationFee = 500; // Rs 500 per consultation
    const totalEarnings = appointments.length * consultationFee;
    
    const report = {
      period,
      startDate: startDate.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
      totalAppointments: appointments.length,
      totalEarnings,
      averageEarningsPerAppointment: appointments.length > 0 ? totalEarnings / appointments.length : 0
    };
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Get earnings report error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch earnings report'
    });
  }
}

/**
 * POST /api/doctor/create-prescription
 * Create a prescription for a patient (without appointment)
 */
export async function createPrescriptionHandler(req, res) {
    try {
        const doctorId = req.user.userId;
        const { patientId, medicines, diagnosis, symptoms, dosageInstructions, followUpDate, notes, vitalSigns } = req.body;

        if (!patientId || !medicines || !Array.isArray(medicines) || medicines.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID and medicines are required'
            });
        }

        // Get patient details
        const db = getDB();
        const patient = await db.collection('patients').findOne({ id: patientId });
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // Get doctor details
        const doctor = await db.collection('users').findOne({ id: doctorId });
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        // Create medical record
        const { createMedicalRecord } = await import('../models/medicalRecordModel.js');
        
        const medicalRecord = await createMedicalRecord({
            patientId: patient.id,
            patientName: patient.name,
            patientEmail: patient.email,
            patientAge: patient.age || null,
            patientGender: patient.gender || null,
            doctorId: doctorId,
            doctorName: doctor.name,
            appointmentId: null, // No appointment ID for direct prescriptions
            appointmentDate: new Date().toISOString().split('T')[0], // Today's date
            appointmentTime: new Date().toTimeString().split(' ')[0].substring(0, 5), // Current time
            diagnosis: diagnosis || null,
            symptoms: symptoms || null,
            prescribedMedicines: medicines,
            dosageInstructions: dosageInstructions || null,
            followUpDate: followUpDate || null,
            notes: notes || null,
            vitalSigns: vitalSigns || {}
        });

        // Create prescription
        const { createPrescription } = await import('../models/prescriptionModel.js');
        const prescription = await createPrescription({
            patientId: patient.id,
            doctorId: doctorId,
            medicines,
            diagnosis
        });

        // Notify Patient
        await createNotification({
            userId: patient.userId || patient.id,
            userRole: 'patient',
            type: 'prescription',
            title: 'New Prescription Available',
            message: `New prescription created by Dr. ${doctor.name}.`,
            relatedId: prescription._id
        });

        // Notify Doctor (confirmation)
        await createNotification({
            userId: doctorId,
            userRole: 'doctor',
            type: 'prescription',
            title: 'Prescription Created',
            message: `Prescription created for patient ${patient.name}.`,
            relatedId: prescription._id
        });

        // Notify Admin
        await createNotification({
            userId: 'admin',
            userRole: 'admin',
            type: 'prescription',
            title: 'Prescription Added',
            message: `Prescription added for patient ${patient.name}.`,
            relatedId: prescription._id
        });

        res.status(201).json({
            success: true,
            message: 'Prescription and medical record created successfully',
            data: {
                prescription,
                medicalRecord
            }
        });
    } catch (error) {
        console.error('Create prescription error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create prescription'
        });
    }
}

/**
 * GET /api/doctor/schedule
 * Get doctor's schedule for a date range
 */
export async function getDoctorScheduleHandler(req, res) {
  try {
    const doctorId = req.user.userId;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const schedule = await getDoctorSchedule(doctorId, startDate, endDate);

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Get doctor schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedule'
    });
  }
}

/**
 * GET /api/doctor/analytics
 * Get doctor analytics (today count, weekly counts, monthly revenue, etc.)
 */
export async function getDoctorAnalyticsHandler(req, res) {
  try {
    const doctorId = req.user.userId;
    const { from, to } = req.query;

    // Get analytics
    const analytics = await getDoctorAnalytics(doctorId, { from, to });

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get doctor analytics error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch analytics'
    });
  }
}

/**
 * GET /api/doctor/report
 * Export doctor report (CSV/PDF)
 */
export async function exportDoctorReport(req, res) {
  try {
    const doctorId = req.user.userId;
    const { from, to, format = 'csv' } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: 'From and to dates are required'
      });
    }

    const db = getDB();
    const appointmentsCollection = db.collection('appointments');
    const medicalRecordsCollection = db.collection('medicalRecords');

    // Get appointments in date range
    const appointments = await appointmentsCollection.find({
      doctorId,
      date: { $gte: from, $lte: to }
    }).sort({ date: 1, time: 1 }).toArray();

    // Get medical records for these appointments
    const appointmentIds = appointments.map(apt => apt._id || apt.id);
    const medicalRecords = await medicalRecordsCollection.find({
      appointmentId: { $in: appointmentIds }
    }).toArray();

    // Create a map of appointmentId -> medical record
    const recordsMap = {};
    medicalRecords.forEach(record => {
      recordsMap[record.appointmentId] = record;
    });

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'appointmentId',
        'patientName',
        'patientEmail',
        'date',
        'time',
        'status',
        'paidAmount',
        'paymentMethod',
        'diagnosis',
        'prescriptions'
      ];

      const csvRows = appointments.map(apt => {
        const record = recordsMap[apt._id || apt.id];
        const paidAmount = apt.payment?.paidAmount || apt.payment?.amount || (apt.paymentStatus === 'paid' ? 500 : 0);
        const paymentMethod = apt.payment?.method || apt.paymentMethod || 'N/A';
        const diagnosis = record?.diagnosis || 'N/A';
        const prescriptions = record?.prescribedMedicines?.map(m => m.name).join('; ') || 'N/A';

        return [
          apt._id || apt.id,
          apt.patientName || '',
          apt.patientEmail || '',
          apt.date || '',
          apt.time || '',
          apt.status || '',
          paidAmount,
          paymentMethod,
          diagnosis,
          prescriptions
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
      });

      const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="doctor-report-${from}-to-${to}.csv"`);
      res.send(csvContent);
    } else if (format === 'pdf') {
      // For PDF, return JSON data (frontend can use a PDF library)
      res.json({
        success: true,
        data: {
          doctorId,
          from,
          to,
          appointments: appointments.map(apt => {
            const record = recordsMap[apt._id || apt.id];
            return {
              appointmentId: apt._id || apt.id,
              patientName: apt.patientName,
              patientEmail: apt.patientEmail,
              date: apt.date,
              time: apt.time,
              status: apt.status,
              paidAmount: apt.payment?.paidAmount || apt.payment?.amount || (apt.paymentStatus === 'paid' ? 500 : 0),
              paymentMethod: apt.payment?.method || apt.paymentMethod || 'N/A',
              diagnosis: record?.diagnosis || null,
              prescriptions: record?.prescribedMedicines || []
            };
          })
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Use csv or pdf'
      });
    }
  } catch (error) {
    console.error('Export doctor report error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export report'
    });
  }
}