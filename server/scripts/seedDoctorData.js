/**
 * Seed Doctor Data Script
 * Creates sample appointments and data for testing the doctor dashboard
 * 
 * Usage: node server/scripts/seedDoctorData.js <doctorId>
 * Example: node server/scripts/seedDoctorData.js user_1234567890_abc123
 */

import { connectMongoDB, getDB } from '../config/mongodb.js';
import { createAppointment } from '../models/appointmentModel.js';
import dotenv from 'dotenv';

dotenv.config();

async function seedDoctorData(doctorId, doctorName, doctorEmail) {
  try {
    // Connect to MongoDB
    const mongoResult = await connectMongoDB();
    if (!mongoResult.success) {
      console.error('❌ Failed to connect to MongoDB');
      process.exit(1);
    }
    
    console.log('✅ Connected to MongoDB');
    
    const db = getDB();
    const appointmentsCollection = db.collection('appointments');
    
    // Check if data already exists
    const existingCount = await appointmentsCollection.countDocuments({ doctorId });
    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing appointments for this doctor.`);
      console.log('   Delete existing appointments? (This script will add new ones)');
    }
    
    // Get today's date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Create sample appointments for today
    const todayAppointments = [
      {
        doctorId,
        doctorName: doctorName || 'Dr. Test Doctor',
        doctorEmail: doctorEmail || 'doctor@test.com',
        patientId: 'patient_1',
        patientName: 'Alice Williams',
        patientEmail: 'alice@example.com',
        date: todayStr,
        time: '09:00 AM',
        type: 'Check-up',
        status: 'completed',
        location: 'Clinic Room 1',
        notes: 'Regular check-up completed'
      },
      {
        doctorId,
        doctorName: doctorName || 'Dr. Test Doctor',
        doctorEmail: doctorEmail || 'doctor@test.com',
        patientId: 'patient_2',
        patientName: 'Bob Johnson',
        patientEmail: 'bob@example.com',
        date: todayStr,
        time: '10:30 AM',
        type: 'Follow-up',
        status: 'scheduled',
        location: 'Clinic Room 2',
        notes: null
      },
      {
        doctorId,
        doctorName: doctorName || 'Dr. Test Doctor',
        doctorEmail: doctorEmail || 'doctor@test.com',
        patientId: 'patient_3',
        patientName: 'Carol Smith',
        patientEmail: 'carol@example.com',
        date: todayStr,
        time: '02:00 PM',
        type: 'Consultation',
        status: 'scheduled',
        location: 'Clinic Room 1',
        notes: null
      },
      {
        doctorId,
        doctorName: doctorName || 'Dr. Test Doctor',
        doctorEmail: doctorEmail || 'doctor@test.com',
        patientId: 'patient_4',
        patientName: 'David Brown',
        patientEmail: 'david@example.com',
        date: todayStr,
        time: '03:30 PM',
        type: 'Emergency',
        status: 'pending',
        location: 'Emergency Room',
        notes: 'Urgent consultation required'
      }
    ];
    
    // Create appointments for this week (last 7 days)
    const weekAppointments = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      if (i === 0) continue; // Skip today (already added)
      
      weekAppointments.push({
        doctorId,
        doctorName: doctorName || 'Dr. Test Doctor',
        doctorEmail: doctorEmail || 'doctor@test.com',
        patientId: `patient_week_${i}`,
        patientName: `Patient ${i}`,
        patientEmail: `patient${i}@example.com`,
        date: dateStr,
        time: `${9 + i}:00 AM`,
        type: i % 2 === 0 ? 'Consultation' : 'Check-up',
        status: i < 3 ? 'completed' : 'scheduled',
        location: 'Clinic Room 1',
        notes: null
      });
    }
    
    // Create completed appointments for this month (for earnings calculation)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthAppointments = [];
    for (let i = 0; i < 20; i++) {
      const date = new Date(monthStart);
      date.setDate(date.getDate() + Math.floor(Math.random() * (today.getDate() - 1)));
      const dateStr = date.toISOString().split('T')[0];
      
      monthAppointments.push({
        doctorId,
        doctorName: doctorName || 'Dr. Test Doctor',
        doctorEmail: doctorEmail || 'doctor@test.com',
        patientId: `patient_month_${i}`,
        patientName: `Monthly Patient ${i + 1}`,
        patientEmail: `monthly${i}@example.com`,
        date: dateStr,
        time: `${9 + (i % 8)}:00 AM`,
        type: ['Check-up', 'Follow-up', 'Consultation'][i % 3],
        status: 'completed',
        location: 'Clinic Room 1',
        notes: 'Completed appointment'
      });
    }
    
    // Insert all appointments
    const allAppointments = [...todayAppointments, ...weekAppointments, ...monthAppointments];
    
    console.log(`\n📝 Creating ${allAppointments.length} appointments...`);
    
    for (const aptData of allAppointments) {
      await createAppointment(aptData);
    }
    
    console.log(`✅ Successfully created ${allAppointments.length} appointments!`);
    console.log(`   - Today's appointments: ${todayAppointments.length}`);
    console.log(`   - This week's appointments: ${weekAppointments.length}`);
    console.log(`   - This month's completed: ${monthAppointments.length}`);
    
    console.log('\n🎉 Doctor dashboard data seeded successfully!');
    console.log(`   Doctor ID: ${doctorId}`);
    console.log(`   You can now test the dashboard with this doctor account.`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

// Get doctor ID from command line arguments
const doctorId = process.argv[2];
const doctorName = process.argv[3] || null;
const doctorEmail = process.argv[4] || null;

if (!doctorId) {
  console.error('❌ Error: Doctor ID is required');
  console.log('\nUsage: node server/scripts/seedDoctorData.js <doctorId> [doctorName] [doctorEmail]');
  console.log('Example: node server/scripts/seedDoctorData.js user_1234567890_abc123 "Dr. John Doe" "john@example.com"');
  process.exit(1);
}

seedDoctorData(doctorId, doctorName, doctorEmail);

