/**
 * Medical Record Model
 * Stores patient medical records including diagnosis, prescriptions, and treatment history
 */

import { getDB } from '../config/mongodb.js';

/**
 * Get medical records collection
 */
export function getMedicalRecordsCollection() {
  const db = getDB();
  return db.collection('medicalRecords');
}

/**
 * Create a new medical record
 * @param {Object} recordData - Medical record data
 * @returns {Promise<Object>} Created medical record
 */
export async function createMedicalRecord(recordData) {
  const collection = getMedicalRecordsCollection();
  const record = {
    id: `med_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    patientId: recordData.patientId,
    patientName: recordData.patientName,
    patientEmail: recordData.patientEmail,
    patientAge: recordData.patientAge,
    patientGender: recordData.patientGender,
    doctorId: recordData.doctorId,
    doctorName: recordData.doctorName,
    appointmentId: recordData.appointmentId,
    appointmentDate: recordData.appointmentDate,
    appointmentTime: recordData.appointmentTime,
    // Enhanced medical data
    diagnosis: recordData.diagnosis || null,
    symptoms: recordData.symptoms || null,
    doctorNotes: recordData.doctorNotes || recordData.notes || null,
    // Enhanced prescription data
    prescribedMedicines: recordData.prescribedMedicines || [],
    dosageInstructions: recordData.dosageInstructions || null,
    followUpDate: recordData.followUpDate || null,
    // Enhanced vitals
    vitalSigns: recordData.vitalSigns || {
      bloodPressure: recordData.bloodPressure || null,
      heartRate: recordData.heartRate || null,
      temperature: recordData.temperature || null,
      weight: recordData.weight || null,
      height: recordData.height || null,
      bloodSugar: recordData.bloodSugar || null
    },
    // Uploaded reports
    uploadedReports: recordData.uploadedReports || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  await collection.insertOne(record);
  return record;
}

/**
 * Get medical record by ID
 * @param {string} recordId - Medical record ID
 * @returns {Promise<Object|null>} Medical record or null
 */
export async function getMedicalRecordById(recordId) {
  const collection = getMedicalRecordsCollection();
  return await collection.findOne({ id: recordId });
}

/**
 * Get medical records by patient ID
 * @param {string} patientId - Patient ID
 * @param {Object} options - Query options (limit, sort)
 * @returns {Promise<Array>} Array of medical records
 */
export async function getMedicalRecordsByPatientId(patientId, options = {}) {
  const collection = getMedicalRecordsCollection();
  const { limit = 50, sortBy = 'createdAt', sortOrder = -1 } = options;
  
  return await collection
    .find({ patientId })
    .sort({ [sortBy]: sortOrder })
    .limit(limit)
    .toArray();
}

/**
 * Get medical records by doctor ID
 * @param {string} doctorId - Doctor ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of medical records
 */
export async function getMedicalRecordsByDoctorId(doctorId, options = {}) {
  const collection = getMedicalRecordsCollection();
  const { limit = 50, sortBy = 'createdAt', sortOrder = -1 } = options;
  
  return await collection
    .find({ doctorId })
    .sort({ [sortBy]: sortOrder })
    .limit(limit)
    .toArray();
}

/**
 * Get medical record by appointment ID
 * @param {string} appointmentId - Appointment ID
 * @returns {Promise<Object|null>} Medical record or null
 */
export async function getMedicalRecordByAppointmentId(appointmentId) {
  const collection = getMedicalRecordsCollection();
  return await collection.findOne({ appointmentId });
}

/**
 * Update medical record
 * @param {string} recordId - Medical record ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object|null>} Updated medical record or null
 */
export async function updateMedicalRecord(recordId, updateData) {
  const collection = getMedicalRecordsCollection();
  
  // Get existing record to notify doctor
  const existingRecord = await collection.findOne({ id: recordId });
  
  const update = {
    $set: {
      ...updateData,
      updatedAt: new Date().toISOString()
    }
  };
  
  const result = await collection.findOneAndUpdate(
    { id: recordId },
    update,
    { returnDocument: 'after' }
  );
  
  // Notify doctor if record was updated
  if (result && existingRecord) {
    try {
      const { createNotification } = await import('../models/notificationModel.js');
      await createNotification({
        userId: existingRecord.doctorId,
        userRole: 'doctor',
        type: 'medical_record',
        title: 'Patient Medical Record Updated',
        message: `Medical record for ${existingRecord.patientName} has been updated.`,
        relatedId: recordId
      });
    } catch (notifError) {
      console.warn('Failed to send medical record update notification:', notifError.message);
    }
  }
  
  return result;
}

/**
 * Delete medical record
 * @param {string} recordId - Medical record ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteMedicalRecord(recordId) {
  const collection = getMedicalRecordsCollection();
  const result = await collection.deleteOne({ id: recordId });
  return result.deletedCount > 0;
}

/**
 * Get patient's treatment history summary
 * @param {string} patientId - Patient ID
 * @returns {Promise<Object>} Treatment summary
 */
export async function getPatientTreatmentSummary(patientId) {
  const collection = getMedicalRecordsCollection();
  
  const records = await collection
    .find({ patientId })
    .sort({ createdAt: -1 })
    .toArray();
  
  const summary = {
    totalRecords: records.length,
    latestDiagnosis: records[0]?.diagnosis || null,
    commonDiagnoses: [],
    prescribedMedicinesHistory: [],
    lastVisit: records[0]?.createdAt || null,
    doctorsVisited: [...new Set(records.map(r => r.doctorName))],
    records: records
  };
  
  return summary;
}
