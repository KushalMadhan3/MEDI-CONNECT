import { ObjectId } from 'mongodb';
import { getDB } from '../config/mongodb.js';
import { 
  checkDoctorAvailability, 
  findNextAvailableSlot, 
  suggestAlternativeDoctors,
  validateAppointmentData,
  canRescheduleAppointment
} from '../utils/appointmentUtils.js';
import { createNotification } from '../models/notificationModel.js';
import { getChannel } from '../config/rabbitmq.js';

/**
 * Enhanced appointment creation with conflict checking
 */
export async function createAppointmentWithChecks(appointmentData) {
  const db = getDB();
  const collection = db.collection('appointments');
  
  // Validate input data
  const validation = validateAppointmentData(appointmentData);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  const { doctorId, date, time } = appointmentData;
  
  // Check for scheduling conflicts
  const { available, conflict } = await checkDoctorAvailability(doctorId, date, time);
  
  if (!available) {
    const nextSlot = await findNextAvailableSlot(doctorId, date, time);
    const alternatives = await suggestAlternativeDoctors(appointmentData.specialization, doctorId);
    
    const error = new Error('Doctor already has an appointment at this time. Choose another slot.');
    error.code = 'SCHEDULING_CONFLICT';
    error.details = {
      nextAvailable: nextSlot.availableTime ? {
        time: nextSlot.availableTime,
        message: nextSlot.message
      } : null,
      alternatives: alternatives.length > 0 ? {
        count: alternatives.length,
        doctors: alternatives
      } : null
    };
    
    throw error;
  }
  
  // Create the appointment
  const appointment = {
    id: `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    doctorId: appointmentData.doctorId,
    patientId: appointmentData.patientId,
    patientName: appointmentData.patientName,
    patientEmail: appointmentData.patientEmail,
    doctorName: appointmentData.doctorName,
    doctorEmail: appointmentData.doctorEmail,
    date: appointmentData.date,
    time: appointmentData.time,
    type: appointmentData.type || 'Consultation',
    status: 'scheduled',
    location: appointmentData.location || null,
    notes: appointmentData.notes || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    originalAppointmentId: appointmentData.originalAppointmentId || null,
    rescheduledFrom: appointmentData.rescheduledFrom || null
  };
  
  await collection.insertOne(appointment);
  
  // Publish event for notification service
  try {
    const channel = getChannel();
    if (channel) {
      channel.publish(
        'appointment_events',
        'appointment.created',
        Buffer.from(JSON.stringify({
          appointmentId: appointment.id,
          doctorId: appointment.doctorId,
          patientId: appointment.patientId,
          date: appointment.date,
          time: appointment.time,
          type: appointment.type,
          status: appointment.status,
          timestamp: new Date().toISOString()
        })),
        { persistent: true }
      );
      console.log(`📅 Appointment created event published: ${appointment.id}`);
    }
  } catch (error) {
    console.warn('⚠️ Failed to publish appointment event:', error.message);
  }
  
  return appointment;
}

/**
 * Reschedule an existing appointment
 */
export async function rescheduleAppointment(appointmentId, newDate, newTime, userId, userRole) {
  const db = getDB();
  const collection = db.collection('appointments');
  
  // Find the existing appointment
  const existingAppointment = await collection.findOne({ id: appointmentId });
  if (!existingAppointment) {
    throw new Error('Appointment not found');
  }
  
  // Check if the user is authorized to reschedule
  if (userRole === 'patient' && existingAppointment.patientId !== userId) {
    throw new Error('Unauthorized to reschedule this appointment');
  }
  
  if (userRole === 'doctor' && existingAppointment.doctorId !== userId) {
    throw new Error('Unauthorized to reschedule this appointment');
  }
  
  // Check if rescheduling is allowed
  const rescheduleCheck = await canRescheduleAppointment(appointmentId);
  if (!rescheduleCheck.canReschedule) {
    throw new Error(rescheduleCheck.error || 'Cannot reschedule this appointment');
  }
  
  // Check for conflicts with the new time
  const { available } = await checkDoctorAvailability(
    existingAppointment.doctorId, 
    newDate, 
    newTime,
    appointmentId // Exclude current appointment from conflict check
  );
  
  if (!available) {
    throw new Error('The selected time slot is no longer available. Please choose another time.');
  }
  
  // Update the existing appointment status to 'rescheduled'
  await collection.updateOne(
    { id: appointmentId },
    {
      $set: {
        status: 'rescheduled',
        updatedAt: new Date().toISOString(),
        cancelledBy: userRole,
        cancellationReason: 'Rescheduled',
        cancelledAt: new Date().toISOString()
      }
    }
  );
  
  // Create a new appointment with the rescheduled time
  const newAppointment = {
    ...existingAppointment,
    id: `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    date: newDate,
    time: newTime,
    status: 'scheduled',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    originalAppointmentId: appointmentId,
    rescheduledFrom: {
      appointmentId: existingAppointment.id,
      originalDate: existingAppointment.date,
      originalTime: existingAppointment.time,
      rescheduledAt: new Date().toISOString(),
      rescheduledBy: userRole
    }
  };
  
  delete newAppointment._id; // Remove the MongoDB _id to allow insert
  
  await collection.insertOne(newAppointment);
  
  // Create notifications for both doctor and patient
  const notificationData = {
    type: 'appointment',
    title: 'Appointment Rescheduled',
    message: `Your appointment has been rescheduled to ${newDate} at ${newTime}`,
    relatedId: newAppointment.id
  };
  
  await Promise.all([
    createNotification({
      userId: existingAppointment.doctorId,
      userRole: 'doctor',
      ...notificationData
    }),
    createNotification({
      userId: existingAppointment.patientId,
      userRole: 'patient',
      ...notificationData
    })
  ]);
  
  // Publish event for notification service
  try {
    const channel = getChannel();
    if (channel) {
      channel.publish(
        'appointment_events',
        'appointment.rescheduled',
        Buffer.from(JSON.stringify({
          originalAppointmentId: appointmentId,
          newAppointmentId: newAppointment.id,
          doctorId: newAppointment.doctorId,
          patientId: newAppointment.patientId,
          oldDate: existingAppointment.date,
          oldTime: existingAppointment.time,
          newDate: newDate,
          newTime: newTime,
          timestamp: new Date().toISOString()
        })),
        { persistent: true }
      );
      console.log(`🔄 Appointment rescheduled event published: ${appointmentId} → ${newAppointment.id}`);
    }
  } catch (error) {
    console.warn('⚠️ Failed to publish reschedule event:', error.message);
  }
  
  return {
    success: true,
    message: 'Appointment rescheduled successfully',
    data: {
      oldAppointment: existingAppointment,
      newAppointment: newAppointment
    }
  };
}

/**
 * Cancel an appointment
 */
export async function cancelAppointment(appointmentId, reason, userId, userRole) {
  const db = getDB();
  const collection = db.collection('appointments');
  
  // Find the appointment
  const appointment = await collection.findOne({ id: appointmentId });
  if (!appointment) {
    throw new Error('Appointment not found');
  }
  
  // Check authorization
  if (userRole === 'patient' && appointment.patientId !== userId) {
    throw new Error('Unauthorized to cancel this appointment');
  }
  
  if (userRole === 'doctor' && appointment.doctorId !== userId) {
    throw new Error('Unauthorized to cancel this appointment');
  }
  
  // Update the appointment status
  const result = await collection.findOneAndUpdate(
    { id: appointmentId },
    {
      $set: {
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
        cancelledBy: userRole,
        cancellationReason: reason || 'No reason provided',
        cancelledAt: new Date().toISOString()
      }
    },
    { returnDocument: 'after' }
  );
  
  if (!result.value) {
    throw new Error('Failed to cancel appointment');
  }
  
  // Create notifications for both doctor and patient
  const notificationMessage = userRole === 'patient'
    ? `Appointment with Dr. ${appointment.doctorName} has been cancelled`
    : `Your appointment with ${appointment.patientName} has been cancelled`;
  
  await Promise.all([
    createNotification({
      userId: appointment.doctorId,
      userRole: 'doctor',
      type: 'appointment',
      title: 'Appointment Cancelled',
      message: notificationMessage,
      relatedId: appointment.id
    }),
    createNotification({
      userId: appointment.patientId,
      userRole: 'patient',
      type: 'appointment',
      title: 'Appointment Cancelled',
      message: notificationMessage,
      relatedId: appointment.id
    })
  ]);
  
  // Publish event for notification service
  try {
    const channel = getChannel();
    if (channel) {
      channel.publish(
        'appointment_events',
        'appointment.cancelled',
        Buffer.from(JSON.stringify({
          appointmentId: appointment.id,
          doctorId: appointment.doctorId,
          patientId: appointment.patientId,
          date: appointment.date,
          time: appointment.time,
          cancelledBy: userRole,
          reason: reason || 'No reason provided',
          timestamp: new Date().toISOString()
        })),
        { persistent: true }
      );
      console.log(`❌ Appointment cancelled event published: ${appointment.id}`);
    }
  } catch (error) {
    console.warn('⚠️ Failed to publish cancellation event:', error.message);
  }
  
  return {
    success: true,
    message: 'Appointment cancelled successfully',
    data: result.value
  };
}

/**
 * Mark an appointment as completed
 */
export async function completeAppointment(appointmentId, doctorId) {
  const db = getDB();
  const collection = db.collection('appointments');
  
  // Verify the appointment exists and belongs to the doctor
  const appointment = await collection.findOne({
    id: appointmentId,
    doctorId,
    status: { $in: ['scheduled', 'rescheduled'] }
  });
  
  if (!appointment) {
    throw new Error('Appointment not found or already completed/cancelled');
  }
  
  // Update the appointment status
  const result = await collection.findOneAndUpdate(
    { id: appointmentId },
    {
      $set: {
        status: 'completed',
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      }
    },
    { returnDocument: 'after' }
  );
  
  if (!result.value) {
    throw new Error('Failed to mark appointment as completed');
  }
  
  // Create notifications for both doctor and patient
  const notificationData = {
    type: 'appointment',
    title: 'Appointment Completed',
    message: `Your appointment with Dr. ${appointment.doctorName} has been marked as completed`,
    relatedId: appointment.id
  };
  
  await Promise.all([
    createNotification({
      userId: appointment.doctorId,
      userRole: 'doctor',
      ...notificationData
    }),
    createNotification({
      userId: appointment.patientId,
      userRole: 'patient',
      ...notificationData
    })
  ]);
  
  // Publish event for notification service
  try {
    const channel = getChannel();
    if (channel) {
      channel.publish(
        'appointment_events',
        'appointment.completed',
        Buffer.from(JSON.stringify({
          appointmentId: appointment.id,
          doctorId: appointment.doctorId,
          patientId: appointment.patientId,
          date: appointment.date,
          time: appointment.time,
          completedAt: new Date().toISOString(),
          timestamp: new Date().toISOString()
        })),
        { persistent: true }
      );
      console.log(`✅ Appointment completed event published: ${appointment.id}`);
    }
  } catch (error) {
    console.warn('⚠️ Failed to publish completion event:', error.message);
  }
  
  return {
    success: true,
    message: 'Appointment marked as completed',
    data: result.value
  };
}

/**
 * Mark a no-show appointment
 */
export async function markAsNoShow(appointmentId, doctorId) {
  const db = getDB();
  const collection = db.collection('appointments');
  
  // Find the appointment
  const appointment = await collection.findOne({
    id: appointmentId,
    doctorId,
    status: { $in: ['scheduled', 'rescheduled'] }
  });
  
  if (!appointment) {
    throw new Error('Appointment not found or already completed/cancelled');
  }
  
  // Check if the appointment time has passed
  const appointmentTime = new Date(`${appointment.date}T${appointment.time}`);
  const now = new Date();
  
  if (appointmentTime > now) {
    throw new Error('Cannot mark as no-show before the appointment time');
  }
  
  // Update the appointment status
  const result = await collection.findOneAndUpdate(
    { id: appointmentId },
    {
      $set: {
        status: 'missed',
        updatedAt: new Date().toISOString(),
        noShowMarkedAt: new Date().toISOString(),
        noShowMarkedBy: doctorId
      }
    },
    { returnDocument: 'after' }
  );
  
  if (!result.value) {
    throw new Error('Failed to mark appointment as no-show');
  }
  
  // Create notification for the patient
  await createNotification({
    userId: appointment.patientId,
    userRole: 'patient',
    type: 'appointment',
    title: 'Missed Appointment',
    message: `You missed your appointment with Dr. ${appointment.doctorName} on ${appointment.date} at ${appointment.time}`,
    relatedId: appointment.id
  });
  
  // Publish event for notification service
  try {
    const channel = getChannel();
    if (channel) {
      channel.publish(
        'appointment_events',
        'appointment.missed',
        Buffer.from(JSON.stringify({
          appointmentId: appointment.id,
          doctorId: appointment.doctorId,
          patientId: appointment.patientId,
          date: appointment.date,
          time: appointment.time,
          markedAt: new Date().toISOString(),
          timestamp: new Date().toISOString()
        })),
        { persistent: true }
      );
      console.log(`⏰ No-show event published: ${appointment.id}`);
    }
  } catch (error) {
    console.warn('⚠️ Failed to publish no-show event:', error.message);
  }
  
  return {
    success: true,
    message: 'Appointment marked as no-show',
    data: result.value
  };
}
