/**
 * Patient Controller
 * Handles patient-related API endpoints
 */

import { getDB } from '../config/mongodb.js';
import { 
  createAppointment, 
  getAppointmentsByPatientId,
  cancelAppointment,
  rescheduleAppointment,
  getAppointmentById
} from '../models/appointmentModel.js';
import { createNotification, getNotificationsByUserId, countUnreadNotifications } from '../models/notificationModel.js';
import { getChannel } from '../config/rabbitmq.js';
import { getPatientByUserId, createPatient } from '../models/patientModel.js';

/**
 * Helper function to get or create patient profile
 * @param {string} patientUserId - Patient's user ID
 * @returns {Promise<Object>} Patient record
 */
async function getOrCreatePatient(patientUserId) {
    const db = getDB();
    let patient = await getPatientByUserId(patientUserId);

    // Auto-create patient profile if it doesn't exist
    if (!patient) {
        const user = await db.collection('users').findOne({ id: patientUserId });
        if (!user) {
            throw new Error('User not found');
        }

        // Create patient record automatically
        patient = await createPatient({
            userId: patientUserId,
            name: user.name,
            email: user.email,
            mobile: user.mobile || null,
            gender: user.gender || null,
            age: null,
            address: null,
            medicalHistory: [],
            allergies: []
        });
        
        console.log(`✅ Auto-created patient profile for user: ${patientUserId}`);
    }

    return patient;
}

/**
 * GET /api/patient/doctors
 * Get all doctors with filters and enhanced data
 */
export async function getAllDoctors(req, res) {
    try {
        const { category, search } = req.query;
        const db = getDB();
        const usersCollection = db.collection('users');

        // Base query for doctors
        // For public endpoint, show active doctors (or pending if no active doctors exist)
        // For authenticated users, only show active doctors
        const isPublicEndpoint = req.originalUrl && req.originalUrl.includes('/doctors/public');
        const query = { role: 'doctor' };
        
        // For public endpoint, be more lenient - show active or pending doctors
        // For authenticated endpoint, only show active
        if (isPublicEndpoint) {
            // Show active doctors, or pending if no active ones
            query.status = { $in: ['active', 'pending'] };
        } else {
            // Authenticated users only see active doctors
            query.status = 'active';
        }

        // Map category names to specializations
        const categoryMap = {
            'Cardiology': 'Cardiology',
            'Dermatology': 'Dermatology',
            'Orthopedics': 'Orthopedics',
            'General Medicine': 'General Medicine',
            'General Health checkup': 'General Medicine' // Map new name to database value
        };

        // Add filters
        if (category && categoryMap[category]) {
            query.specialization = categoryMap[category];
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { specialization: { $regex: search, $options: 'i' } }
            ];
        }

        const doctors = await usersCollection.find(query, {
            projection: {
                password: 0,
                email: 0, // Privacy
                mobile: 0 // Privacy
            }
        }).toArray();

        // Enhance doctor data with default values if missing
        const enhancedDoctors = doctors.map(doctor => ({
            id: doctor.id,
            name: doctor.name || 'Dr. Unknown',
            specialization: doctor.specialization || 'General Medicine',
            experience: doctor.experience || '5+ years',
            rating: doctor.rating || 4.5,
            consultationPrice: doctor.consultationPrice || 500,
            image: doctor.image || `/api/doctor/generate-image/${doctor.id}?specialization=${encodeURIComponent(doctor.specialization || 'General Medicine')}`,
            availability: doctor.availability || ['Mon 9:00 AM', 'Wed 2:00 PM', 'Fri 10:00 AM'],
            about: doctor.about || `${doctor.specialization || 'General Medicine'} specialist`
        }));

        res.json({
            success: true,
            data: enhancedDoctors
        });
    } catch (error) {
        console.error('Get doctors error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch doctors'
        });
    }
}

/**
 * POST /api/patient/appointments
 * Book appointment (PAYMENT REQUIRED BEFORE BOOKING)
 */
export async function bookAppointment(req, res) {
    try {
        const patientUserId = req.user.userId;
        const { 
            doctorId, 
            date, 
            time,
            status,
            paymentStatus,
            paymentMethod,
            paymentId,
            transactionTime,
            notes
        } = req.body;

        if (!doctorId || !date || !time) {
            return res.status(400).json({
                success: false,
                message: 'Doctor, date, and time are required'
            });
        }

        // CRITICAL: Payment must be completed before booking
        if (!paymentStatus || paymentStatus !== 'paid') {
            return res.status(400).json({
                success: false,
                message: 'Payment required before confirming appointment'
            });
        }

        if (!paymentMethod || !paymentId) {
            return res.status(400).json({
                success: false,
                message: 'Payment method and payment ID are required'
            });
        }

        // Validate payment method
        const validPaymentMethods = ['upi', 'card', 'netbanking'];
        if (!validPaymentMethods.includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment method. Must be: upi, card, or netbanking'
            });
        }

        // Get or create patient profile
        const patient = await getOrCreatePatient(patientUserId);

        // Get doctor info
        const db = getDB();
        const doctor = await db.collection('users').findOne({ id: doctorId, role: 'doctor' });
        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        // Create Appointment with conflict checking (ONLY IF PAYMENT IS PAID)
        let appointment;
        try {
            appointment = await createAppointment({
                doctorId,
                doctorName: doctor.name,
                doctorSpecialization: doctor.specialization || 'General Medicine',
                patientId: patient.id,
                patientName: patient.name,
                patientEmail: patient.email,
                patientPhone: patient.mobile,
                patientAge: patient.age,
                patientGender: patient.gender,
                patientAddress: patient.address,
                reason: notes,
                date,
                time,
                type: 'consultation',
                status: status || 'confirmed',
                paymentStatus: 'paid',
                paymentMethod,
                paymentId,
                transactionTime: transactionTime || new Date().toISOString(),
                notes: notes || ''
            });
        } catch (error) {
            if (error.code === 'SLOT_CONFLICT') {
                return res.status(409).json({
                    success: false,
                    message: 'This slot is already booked. Please choose another slot.'
                });
            }
            throw error;
        }

        // Notify Doctor
        await createNotification({
            userId: doctorId,
            userRole: 'doctor',
            type: 'appointment',
            title: 'New Appointment Booked',
            message: `You have a new appointment with ${patient.name} on ${date} at ${time}.`,
            relatedId: appointment.id || appointment._id?.toString() || appointment._id
        });

        // Notify Patient - Appointment Booked
        await createNotification({
            userId: patientUserId,
            userRole: 'patient',
            type: 'appointment',
            title: 'Appointment Booked Successfully',
            message: `Appointment confirmed with Dr. ${doctor.name} for ${date} at ${time}.`,
            relatedId: appointment.id || appointment._id?.toString() || appointment._id
        });

        // Notify Patient - Payment Successful
        await createNotification({
            userId: patientUserId,
            userRole: 'patient',
            type: 'payment',
            title: 'Payment Successful',
            message: `Payment of ₹${doctor.consultationPrice || 500} received for your appointment with Dr. ${doctor.name}.`,
            relatedId: appointment.id || appointment._id?.toString() || appointment._id
        });

        // Notify Admin - New Appointment
        await createNotification({
            userId: 'admin',
            userRole: 'admin',
            type: 'appointment',
            title: 'New Appointment Created',
            message: `New appointment booked: ${patient.name} with Dr. ${doctor.name} on ${date} at ${time}.`,
            relatedId: appointment.id || appointment._id?.toString() || appointment._id
        });

        // Notify Admin - Payment Received
        await createNotification({
            userId: 'admin',
            userRole: 'admin',
            type: 'payment',
            title: 'Payment Received',
            message: `Payment of ₹${doctor.consultationPrice || 500} received for appointment between ${patient.name} and Dr. ${doctor.name}.`,
            relatedId: appointment.id || appointment._id?.toString() || appointment._id
        });

        res.status(201).json({
            success: true,
            message: 'Payment Successful — Appointment Confirmed',
            data: appointment,
            redirect: '/'
        });

    } catch (error) {
        console.error('Book appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to book appointment'
        });
    }
}

/**
 * GET /api/patient/appointments
 * Get patient's appointments
 */
export async function getPatientAppointments(req, res) {
    try {
        const patientUserId = req.user.userId;
        const patient = await getOrCreatePatient(patientUserId);

        const appointments = await getAppointmentsByPatientId(patient.id);
        
        // Sort by date (upcoming first)
        appointments.sort((a, b) => {
            const dateA = new Date(`${a.date} ${a.time}`);
            const dateB = new Date(`${b.date} ${b.time}`);
            return dateA - dateB;
        });

        // Map _id to id for frontend compatibility - prioritize string 'id' field
        const formattedAppointments = appointments.map(apt => ({
            ...apt,
            id: apt.id || apt._id?.toString() || apt._id
        }));

        res.json({
            success: true,
            data: formattedAppointments
        });
    } catch (error) {
        console.error('Get appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch appointments'
        });
    }
}

/**
 * GET /api/patient/notifications
 * Get patient notifications
 */
export async function getPatientNotifications(req, res) {
    try {
        const patientUserId = req.user.userId;
        const { unreadOnly, limit } = req.query;

        const notifications = await getNotificationsByUserId(patientUserId, {
            unreadOnly: unreadOnly === 'true',
            limit: limit ? parseInt(limit) : 50
        });

        const unreadCount = await countUnreadNotifications(patientUserId);

        res.json({
            success: true,
            data: notifications,
            unreadCount
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications'
        });
    }
}

/**
 * PUT /api/patient/notifications/:id/read
 * Mark notification as read
 */
export async function markPatientNotificationAsRead(req, res) {
    try {
        const { id } = req.params;
        const { markNotificationAsRead } = await import('../models/notificationModel.js');
        
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
 * PUT /api/patient/notifications/read-all
 * Mark all notifications as read
 */
export async function markAllPatientNotificationsAsRead(req, res) {
    try {
        const patientUserId = req.user.userId;
        const { markAllNotificationsAsRead } = await import('../models/notificationModel.js');
        
        const count = await markAllNotificationsAsRead(patientUserId);
        
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

/**
 * GET /api/patient/profile
 * Get patient's complete profile
 */
export async function getPatientProfile(req, res) {
    try {
        const patientUserId = req.user.userId;
        const patient = await getOrCreatePatient(patientUserId);
        
        res.json({
            success: true,
            data: patient
        });
    } catch (error) {
        console.error('Get patient profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
}

/**
 * PUT /api/patient/profile
 * Update patient profile
 */
export async function updatePatientProfile(req, res) {
    try {
        const patientUserId = req.user.userId;
        const { 
            name, mobile, address, gender, age, profilePhoto, bloodType, emergencyContact, dateOfBirth,
            // Health metrics
            healthMetrics,
            // Privacy settings
            privacySettings
        } = req.body;
        const db = getDB();

        // Update user record
        const usersCollection = db.collection('users');
        const updateData = {
            updatedAt: new Date().toISOString()
        };

        if (name) updateData.name = name;
        if (mobile !== undefined) updateData.mobile = mobile || null;
        if (gender) updateData.gender = gender;
        if (profilePhoto !== undefined) {
            // Allow setting to null to remove photo
            updateData.profilePhoto = profilePhoto;
        }

        await usersCollection.updateOne(
            { id: patientUserId },
            { $set: updateData }
        );

        // Get or create patient record
        const patient = await getOrCreatePatient(patientUserId);
        
        // Update patient record
        const patientsCollection = db.collection('patients');
        const patientUpdate = {
            updatedAt: new Date().toISOString()
        };
        if (name) patientUpdate.name = name;
        if (mobile !== undefined) patientUpdate.mobile = mobile || null;
        if (address) patientUpdate.address = address;
        if (gender) patientUpdate.gender = gender;
        if (age) patientUpdate.age = parseInt(age);
        if (bloodType) patientUpdate.bloodType = bloodType;
        if (emergencyContact) patientUpdate.emergencyContact = emergencyContact;
        if (dateOfBirth) patientUpdate.dateOfBirth = dateOfBirth;
        // Store profile photo in patient record as well (allow null to remove)
        if (profilePhoto !== undefined) {
            patientUpdate.profilePhoto = profilePhoto;
        }
        
        // Enhanced health metrics
        if (healthMetrics) {
            patientUpdate.healthMetrics = {
                height: healthMetrics.height ? parseFloat(healthMetrics.height) : null,
                weight: healthMetrics.weight ? parseFloat(healthMetrics.weight) : null,
                bloodPressure: healthMetrics.bloodPressure || null,
                heartRate: healthMetrics.heartRate ? parseInt(healthMetrics.heartRate) : null,
                temperature: healthMetrics.temperature ? parseFloat(healthMetrics.temperature) : null,
                allergies: healthMetrics.allergies || null,
                chronicConditions: healthMetrics.chronicConditions || null,
                currentMedications: healthMetrics.currentMedications || null
            };
        }
        
        // Privacy settings
        if (privacySettings) {
            patientUpdate.privacySettings = {
                profileVisibility: privacySettings.profileVisibility || 'private',
                shareMedicalRecords: privacySettings.shareMedicalRecords || false,
                allowDoctorAccess: privacySettings.allowDoctorAccess !== undefined ? privacySettings.allowDoctorAccess : true
            };
        }

        await patientsCollection.updateOne(
            { userId: patientUserId },
            { $set: patientUpdate }
        );

        // Get updated user
        const updatedUser = await usersCollection.findOne(
            { id: patientUserId },
            { projection: { password: 0 } }
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
}

/**
 * PUT /api/patient/password
 * Change patient password
 */
export async function changePassword(req, res) {
    try {
        const patientUserId = req.user.userId;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters'
            });
        }

        const db = getDB();
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ id: patientUserId });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const { verifyPassword } = await import('../services/authService.js');
        const isValid = await verifyPassword(currentPassword, user.password);

        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const { hashPassword } = await import('../services/authService.js');
        const hashedPassword = await hashPassword(newPassword);

        // Update password
        await usersCollection.updateOne(
            { id: patientUserId },
            {
                $set: {
                    password: hashedPassword,
                    updatedAt: new Date().toISOString()
                }
            }
        );

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
}

/**
 * PUT /api/patient/appointments/:id/cancel
 * Cancel an appointment
 */
export async function cancelPatientAppointment(req, res) {
    try {
        const patientUserId = req.user.userId;
        const { id } = req.params;
        const { reason } = req.body;
        
        const patient = await getOrCreatePatient(patientUserId);

        // Verify appointment belongs to this patient
        const appointment = await getAppointmentById(id);
        
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        if (appointment.patientId !== patient.id) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to cancel this appointment'
            });
        }

        // Cancel appointment
        const updatedAppointment = await cancelAppointment(id, patientUserId, reason);

        if (!updatedAppointment) {
            return res.status(404).json({
                success: false,
                message: 'Failed to cancel appointment'
            });
        }

        // Get doctor info for notifications
        const db = getDB();
        const doctor = await db.collection('users').findOne({ id: appointment.doctorId });

        // Notify Doctor
        await createNotification({
            userId: appointment.doctorId,
            userRole: 'doctor',
            type: 'appointment',
            title: 'Appointment Cancelled',
            message: `Patient cancelled appointment on ${appointment.date} at ${appointment.time}.`,
            relatedId: id
        });

        // Notify Patient
        await createNotification({
            userId: patientUserId,
            userRole: 'patient',
            type: 'appointment',
            title: 'Appointment Cancelled',
            message: `Your appointment is cancelled.`,
            relatedId: id
        });

        // Notify Admin
        await createNotification({
            userId: 'admin',
            userRole: 'admin',
            type: 'appointment',
            title: 'Appointment Cancelled',
            message: `Appointment cancelled: ${appointment.patientName} with Dr. ${doctor ? doctor.name : 'Unknown'} on ${appointment.date} at ${appointment.time}.`,
            relatedId: id
        });

        res.json({
            success: true,
            message: 'Appointment cancelled successfully',
            data: updatedAppointment
        });
    } catch (error) {
        console.error('Cancel appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel appointment'
        });
    }
}

/**
 * PUT /api/patient/appointments/:id/reschedule
 * Reschedule an appointment
 */
export async function reschedulePatientAppointment(req, res) {
    try {
        const patientUserId = req.user.userId;
        const { id } = req.params;
        const { newDate, newTime } = req.body;
        
        if (!newDate || !newTime) {
            return res.status(400).json({
                success: false,
                message: 'New date and time are required'
            });
        }

        const patient = await getOrCreatePatient(patientUserId);

        // Verify appointment belongs to this patient
        const appointment = await getAppointmentById(id);
        
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        if (appointment.patientId !== patient.id) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to reschedule this appointment'
            });
        }

        // Reschedule appointment with conflict checking
        let updatedAppointment;
        try {
            updatedAppointment = await rescheduleAppointment(id, newDate, newTime, patientUserId);
        } catch (error) {
            if (error.code === 'SLOT_CONFLICT') {
                return res.status(409).json({
                    success: false,
                    message: 'This slot is already booked. Please choose another slot.'
                });
            }
            throw error;
        }

        if (!updatedAppointment) {
            return res.status(404).json({
                success: false,
                message: 'Failed to reschedule appointment'
            });
        }

        // Get doctor info for notifications
        const db = getDB();
        const doctor = await db.collection('users').findOne({ id: appointment.doctorId });

        // Notify Doctor
        await createNotification({
            userId: appointment.doctorId,
            userRole: 'doctor',
            type: 'appointment',
            title: 'Appointment Rescheduled',
            message: `Appointment rescheduled to ${newDate} at ${newTime}.`,
            relatedId: id
        });

        // Notify Patient
        await createNotification({
            userId: patientUserId,
            userRole: 'patient',
            type: 'appointment',
            title: 'Appointment Rescheduled',
            message: `Appointment rescheduled to ${newDate} at ${newTime}.`,
            relatedId: id
        });

        // Notify Admin
        await createNotification({
            userId: 'admin',
            userRole: 'admin',
            type: 'appointment',
            title: 'Appointment Rescheduled',
            message: `Appointment rescheduled: ${appointment.patientName} with Dr. ${doctor ? doctor.name : 'Unknown'} to ${newDate} at ${newTime}.`,
            relatedId: id
        });

        res.json({
            success: true,
            message: 'Appointment rescheduled successfully',
            data: updatedAppointment
        });
    } catch (error) {
        console.error('Reschedule appointment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reschedule appointment'
        });
    }
}

/**
 * GET /api/patient/medical-records
 * Get patient's medical records and treatment history
 */
export async function getPatientMedicalRecords(req, res) {
    try {
        const patientUserId = req.user.userId;
        const patient = await getOrCreatePatient(patientUserId);

        // Import medical records model
        const { getMedicalRecordsByPatientId, getPatientTreatmentSummary } = await import('../models/medicalRecordModel.js');

        // Get patient's medical records
        const medicalRecords = await getMedicalRecordsByPatientId(patient.id, { sortBy: 'createdAt', sortOrder: -1 });
        
        // Get treatment summary
        const treatmentSummary = await getPatientTreatmentSummary(patient.id);

        res.json({
            success: true,
            data: {
                medicalRecords,
                treatmentSummary
            }
        });
    } catch (error) {
        console.error('Get medical records error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch medical records'
        });
    }
}

/**
 * GET /api/patient/medical-records/export
 * Export medical records as PDF (returns JSON for frontend PDF generation)
 */
export async function exportMedicalRecords(req, res) {
    try {
        const patientUserId = req.user.userId;
        const { format = 'json' } = req.query;
        const patient = await getOrCreatePatient(patientUserId);

        // Import medical records model
        const { getMedicalRecordsByPatientId, getPatientTreatmentSummary } = await import('../models/medicalRecordModel.js');

        // Get patient's medical records
        const medicalRecords = await getMedicalRecordsByPatientId(patient.id, { sortBy: 'createdAt', sortOrder: -1 });
        
        // Get treatment summary
        const treatmentSummary = await getPatientTreatmentSummary(patient.id);

        // Get user info for export
        const db = getDB();
        const user = await db.collection('users').findOne({ id: patientUserId });

        if (format === 'pdf') {
            // Return structured data for PDF generation (frontend will handle PDF creation)
            res.json({
                success: true,
                data: {
                    patient: {
                        name: user?.name || patient.name,
                        email: user?.email || patient.email,
                        mobile: user?.mobile || patient.mobile,
                        age: patient.age,
                        gender: patient.gender,
                        bloodType: patient.bloodType
                    },
                    exportDate: new Date().toISOString(),
                    totalRecords: medicalRecords.length,
                    treatmentSummary,
                    medicalRecords
                }
            });
        } else {
            // Return JSON format
            res.json({
                success: true,
                data: {
                    patient: {
                        name: user?.name || patient.name,
                        email: user?.email || patient.email,
                        mobile: user?.mobile || patient.mobile,
                        age: patient.age,
                        gender: patient.gender,
                        bloodType: patient.bloodType
                    },
                    exportDate: new Date().toISOString(),
                    totalRecords: medicalRecords.length,
                    treatmentSummary,
                    medicalRecords
                }
            });
        }
    } catch (error) {
        console.error('Export medical records error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export medical records'
        });
    }
}