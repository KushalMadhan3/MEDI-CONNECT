/**
 * Notification Worker
 * Listens to RabbitMQ events and creates notifications/emails
 */

import amqp from 'amqplib';
import { connectMongoDB, getDB } from '../config/mongodb.js';
import { createNotification } from '../models/notificationModel.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Start Notification Worker
 */
export async function startNotificationWorker() {
    console.log('👷 Starting Notification Worker...');

    // Ensure DB connection
    await connectMongoDB();

    try {
        const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        const connection = await amqp.connect(url);
        const channel = await connection.createChannel();

        // Exchanges to listen to
        const exchanges = ['user_events', 'doctor_events', 'appointment_events'];

        // Create a queue for notifications
        const q = await channel.assertQueue('notifications_queue', { durable: true });

        // Bind queue to exchanges
        for (const ex of exchanges) {
            await channel.assertExchange(ex, 'topic', { durable: true });
            await channel.bindQueue(q.queue, ex, '#'); // Listen to all topics
        }

        console.log('✅ Notification Worker listening for events...');

        channel.consume(q.queue, async (msg) => {
            if (!msg) return;

            try {
                const content = JSON.parse(msg.content.toString());
                const routingKey = msg.fields.routingKey;
                const exchange = msg.fields.exchange;

                console.log(`📨 Received event: ${exchange} -> ${routingKey}`);

                // Handle specific events
                await handleEvent(exchange, routingKey, content);

                channel.ack(msg);
            } catch (error) {
                console.error('Error processing message:', error);
                // channel.nack(msg); // Be careful with loops
                channel.ack(msg); // Ack to prevent blocking, maybe log to dead letter queue
            }
        });

    } catch (error) {
        console.error('❌ Notification Worker failed to start:', error);
        // Retry logic could go here
    }
}

/**
 * Handle different events
 */
async function handleEvent(exchange, key, data) {
    try {
        const db = getDB();

        // 1. Appointment Booked - Send confirmation notification
        if (key === 'appointment.booked') {
            await createNotification({
                userId: data.patientUserId || data.patientId,
                userRole: 'patient',
                type: 'appointment',
                title: 'Appointment Confirmed',
                message: `Your appointment has been confirmed for ${data.date} at ${data.time}.`,
                relatedId: data.appointmentId
            });
            console.log(`📧 Appointment confirmation notification created for patient ${data.patientId}`);
        }

        // 2. Appointment Reminders (30 minutes before)
        if (key === 'appointment.reminder') {
            await createNotification({
                userId: data.patientId,
                userRole: 'patient',
                type: 'reminder',
                title: 'Upcoming Appointment',
                message: `Your appointment is in 30 minutes!`,
                relatedId: data.appointmentId
            });
            console.log(`⏰ Reminder notification sent for appointment ${data.appointmentId}`);
        }

        // 3. Order Placed / Payment Success
        if (key === 'order.created') {
            await createNotification({
                userId: data.userId,
                userRole: 'patient',
                type: 'order',
                title: 'Order Placed Successfully',
                message: `Your order #${data.orderId} has been confirmed. Payment: ${data.paymentStatus || 'Paid'}.`,
                relatedId: data.orderId
            });
            console.log(`📧 Order notification: Order #${data.orderId} placed by user ${data.userId}`);
        }

        // 6. Payment Success
        if (key === 'payment.success') {
            await createNotification({
                userId: data.userId,
                userRole: 'patient',
                type: 'payment',
                title: 'Payment Successful',
                message: `Your payment of ₹${data.amount} has been processed successfully. Transaction ID: ${data.transactionId}`,
                relatedId: data.orderId || data.transactionId
            });
            console.log(`💳 Payment success notification sent to user ${data.userId}`);
        }

        // 4. Prescription Created
        if (key === 'prescription.created') {
            // Get patient ID from prescription
            const prescriptionsCollection = db.collection('prescriptions');
            const prescription = await prescriptionsCollection.findOne({ id: data.prescriptionId });
            
            if (prescription) {
                // Get patient user ID
                const patientsCollection = db.collection('patients');
                const patient = await patientsCollection.findOne({ id: prescription.patientId });
                
                if (patient) {
                    await createNotification({
                        userId: patient.userId,
                        userRole: 'patient',
                        type: 'prescription',
                        title: 'New Prescription',
                        message: `Dr. ${prescription.doctorName} has created a prescription for you.`,
                        relatedId: prescription.id
                    });
                    console.log(`💊 Prescription notification created for patient ${patient.userId}`);
                }
            }
        }

        // 5. Appointment Updated
        if (key === 'appointment.updated') {
            // Get appointment details
            const appointmentsCollection = db.collection('appointments');
            const appointment = await appointmentsCollection.findOne({ id: data.appointmentId });
            
            if (appointment) {
                // Get patient user ID
                const patientsCollection = db.collection('patients');
                const patient = await patientsCollection.findOne({ id: appointment.patientId });
                
                if (patient && data.status) {
                    await createNotification({
                        userId: patient.userId,
                        userRole: 'patient',
                        type: 'appointment',
                        title: 'Appointment Updated',
                        message: `Your appointment status has been updated to ${data.status}.`,
                        relatedId: appointment.id
                    });
                    console.log(`📅 Appointment update notification sent to patient ${patient.userId}`);
                }
            }
        }

    } catch (error) {
        console.error('Error handling event logic:', error);
    }
}

// Auto-start if run directly
if (process.argv[1].endsWith('notificationWorker.js')) {
    startNotificationWorker();
}
