/**
 * Patient Model
 * Stores patient information and medical records
 */

import { getDB } from '../config/mongodb.js';

/**
 * Get patients collection
 */
export function getPatientsCollection() {
  const db = getDB();
  return db.collection('patients');
}

/**
 * Create a new patient
 * @param {Object} patientData - Patient data
 * @returns {Promise<Object>} Created patient
 */
export async function createPatient(patientData) {
  const collection = getPatientsCollection();
  const patient = {
    id: `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: patientData.userId,
    name: patientData.name,
    email: patientData.email,
    mobile: patientData.mobile || null,
    gender: patientData.gender || null,
    age: patientData.age || null,
    address: patientData.address || null,
    bloodType: patientData.bloodType || null,
    emergencyContact: patientData.emergencyContact || null,
    dateOfBirth: patientData.dateOfBirth || null,
    profilePhoto: patientData.profilePhoto || null,
    medicalHistory: patientData.medicalHistory || [],
    allergies: patientData.allergies || [],
    doctorId: patientData.doctorId || null, // Which doctor added this patient
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  await collection.insertOne(patient);
  return patient;
}

/**
 * Get patient by ID
 * @param {string} patientId - Patient ID
 * @returns {Promise<Object|null>} Patient or null
 */
export async function getPatientById(patientId) {
  const collection = getPatientsCollection();
  return await collection.findOne({ id: patientId });
}

/**
 * Get patient by user ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Patient or null
 */
export async function getPatientByUserId(userId) {
  const collection = getPatientsCollection();
  return await collection.findOne({ userId });
}

/**
 * Get all patients with optional filters
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array>} Array of patients
 */
export async function getAllPatients(filters = {}) {
  const collection = getPatientsCollection();
  return await collection.find(filters).toArray();
}

/**
 * Update patient by ID
 * @param {string} patientId - Patient ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object|null>} Updated patient or null
 */
export async function updatePatient(patientId, updateData) {
  const collection = getPatientsCollection();
  
  const update = {
    $set: {
      ...updateData,
      updatedAt: new Date().toISOString()
    }
  };
  
  const result = await collection.findOneAndUpdate(
    { id: patientId },
    update,
    { returnDocument: 'after' }
  );
  
  return result;
}

/**
 * Delete patient by ID
 * @param {string} patientId - Patient ID
 * @returns {Promise<boolean>} Success status
 */
export async function deletePatient(patientId) {
  const collection = getPatientsCollection();
  const result = await collection.deleteOne({ id: patientId });
  return result.deletedCount > 0;
}

/**
 * Get or create patient profile by user ID
 * Auto-creates patient profile if it doesn't exist
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Patient record
 */
export async function getOrCreatePatient(userId) {
  const db = getDB();
  let patient = await getPatientByUserId(userId);

  // Auto-create patient profile if it doesn't exist
  if (!patient) {
    const user = await db.collection('users').findOne({ id: userId });
    if (!user) {
      throw new Error('User not found');
    }

    // Create patient record automatically
    patient = await createPatient({
      userId: userId,
      name: user.name,
      email: user.email,
      mobile: user.mobile || null,
      gender: user.gender || null,
      age: null,
      address: null,
      medicalHistory: [],
      allergies: []
    });
    
    console.log(`✅ Auto-created patient profile for user: ${userId}`);
  }

  return patient;
}