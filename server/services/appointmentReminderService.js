/**
 * Appointment Reminder Service
 * Checks for appointments within 30 minutes and sends reminders
 * Should be run as a scheduled job (cron) every 5-10 minutes
 */

import { getDB } from '../config/mongodb.js';
import { getChannel } from '../config/rabbitmq.js';
import { createNotification } from '../models/notificationModel.js';

/**
 * Check and send appointment reminders
 * Call this function periodically (e.g., every 5 minutes via cron)
 */
export async function checkAndSendReminders() {
    try {
        const db = getDB();
        const appointmentsCollection = db.collection('appointments');
        
        // Get current time
        const now = new Date();
        const in1Hour = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour for patients
        const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes for doctors
        
        // Format dates for query (YYYY-MM-DD)
        const today = now.toISOString().split('T')[0];
        
        // Find appointments scheduled for today
        const appointments = await appointmentsCollection.find({
            date: today,
            status: { $in: ['scheduled', 'confirmed'] }
        }).toArray();
        
        // Helper function to parse time and calculate minutes from midnight
        const parseTimeToMinutes = (timeStr) => {
            // Handle both "10:00 AM" and "10:00" formats
            let time = timeStr.split(' ')[0]; // Extract time part
            const [hours, minutes] = time.split(':').map(Number);
            const isPM = timeStr.toUpperCase().includes('PM') && hours !== 12;
            const isAM = timeStr.toUpperCase().includes('AM') && hours === 12;
            const hour24 = isPM ? hours + 12 : (isAM ? 0 : hours);
            return hour24 * 60 + minutes;
        };
        
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const in1HourMinutes = Math.floor((in1Hour.getTime() - now.getTime()) / 60000) + nowMinutes;
        const in15MinMinutes = Math.floor((in15Minutes.getTime() - now.getTime()) / 60000) + nowMinutes;
        
        // Filter appointments for patient reminders (1 hour before)
        const patientReminderAppointments = appointments.filter(apt => {
            if (apt.patientReminderSent) return false;
            const aptMinutes = parseTimeToMinutes(apt.time);
            return aptMinutes >= nowMinutes && aptMinutes <= in1HourMinutes;
        });
        
        // Filter appointments for doctor reminders (15 minutes before)
        const doctorReminderAppointments = appointments.filter(apt => {
            if (apt.doctorReminderSent) return false;
            const aptMinutes = parseTimeToMinutes(apt.time);
            return aptMinutes >= nowMinutes && aptMinutes <= in15MinMinutes;
        });
        
        // Send patient reminders (1 hour before)
        for (const appointment of patientReminderAppointments) {
            try {
                const patientsCollection = db.collection('patients');
                const patient = await patientsCollection.findOne({ id: appointment.patientId });
                
                if (!patient) continue;
                
                await createNotification({
                    userId: patient.userId || appointment.patientId,
                    userRole: 'patient',
                    type: 'reminder',
                    title: 'Appointment Reminder',
                    message: `Your appointment with ${appointment.doctorName} is in 1 hour (${appointment.time}).`,
                    relatedId: appointment.id
                });
                
                await appointmentsCollection.updateOne(
                    { id: appointment.id },
                    { $set: { patientReminderSent: true } }
                );
                
                console.log(`⏰ Patient reminder sent for appointment ${appointment.id}`);
            } catch (error) {
                console.error(`Error sending patient reminder for appointment ${appointment.id}:`, error);
            }
        }
        
        // Send doctor reminders (15 minutes before)
        for (const appointment of doctorReminderAppointments) {
            try {
                await createNotification({
                    userId: appointment.doctorId,
                    userRole: 'doctor',
                    type: 'reminder',
                    title: 'Appointment Reminder',
                    message: `You have an appointment with ${appointment.patientName} in 15 minutes (${appointment.time}).`,
                    relatedId: appointment.id
                });
                
                await appointmentsCollection.updateOne(
                    { id: appointment.id },
                    { $set: { doctorReminderSent: true } }
                );
                
                console.log(`⏰ Doctor reminder sent for appointment ${appointment.id}`);
            } catch (error) {
                console.error(`Error sending doctor reminder for appointment ${appointment.id}:`, error);
            }
        }
        
        const totalSent = patientReminderAppointments.length + doctorReminderAppointments.length;
        return { sent: totalSent };
    } catch (error) {
        console.error('Error checking reminders:', error);
        return { sent: 0, error: error.message };
    }
}

/**
 * Start reminder scheduler (runs every 5 minutes)
 */
export function startReminderScheduler() {
    console.log('⏰ Starting appointment reminder scheduler...');
    
    // Run immediately on start
    checkAndSendReminders();
    
    // Then run every 5 minutes
    setInterval(() => {
        checkAndSendReminders();
    }, 5 * 60 * 1000); // 5 minutes
    
    console.log('✅ Reminder scheduler started (checking every 5 minutes)');
}


