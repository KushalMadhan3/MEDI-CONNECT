import { getDB } from './mongodb.js';

export async function createAppointmentIndexes() {
  try {
    const db = getDB();
    const collection = db.collection('appointments');
    
    // Create a UNIQUE compound index to prevent double-booking.
    // The database itself refuses a second insert into the same (doctorId, date, time),
    // closing the check-then-insert race condition.
    await collection.createIndex(
      { 
        doctorId: 1,
        date: 1,
        time: 1 
      },
      { 
        name: 'unique_doctor_appointment_slot',
        unique: true,
        partialFilterExpression: {
          status: { $in: ['confirmed', 'scheduled', 'pending', 'rescheduled'] }
        }
      }
    );
    
    console.log('✅ Appointment indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating database indexes:', error);
    throw error;
  }
}
