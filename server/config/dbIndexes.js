import { getDB } from './mongodb.js';

export async function createAppointmentIndexes() {
  try {
    const db = getDB();
    const collection = db.collection('appointments');
    
    // Create a compound index for doctor scheduling conflicts
    await collection.createIndex(
      { 
        doctorId: 1,
        date: 1,
        time: 1,
        status: 1 
      },
      { 
        name: 'doctor_appointment_slot',
        partialFilterExpression: {
          status: { $in: ['scheduled', 'pending', 'rescheduled'] }
        }
      }
    );
    
    console.log('✅ Appointment indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating database indexes:', error);
    throw error;
  }
}
