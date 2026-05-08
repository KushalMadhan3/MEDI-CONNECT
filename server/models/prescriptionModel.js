/**
 * Prescription Model
 * Stores prescription information created by doctors
 */

import { getDB } from '../config/mongodb.js';

/**
 * Get prescriptions collection
 */
export function getPrescriptionsCollection() {
  const db = getDB();
  return db.collection('prescriptions');
}

/**
 * Create a new prescription
 * @param {Object} prescriptionData - Prescription data
 * @returns {Promise<Object>} Created prescription
 */
export async function createPrescription(prescriptionData) {
  const collection = getPrescriptionsCollection();
  
  // Enhanced medicine structure with timing
  const medicines = (prescriptionData.medicines || []).map(med => ({
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
  }));
  
  const prescription = {
    _id: `pres_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    id: `pres_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // For compatibility
    appointmentId: prescriptionData.appointmentId,
    doctorId: prescriptionData.doctorId,
    patientId: prescriptionData.patientId,
    medicines: medicines,
    diagnosis: prescriptionData.diagnosis || "",
    notes: prescriptionData.notes || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  await collection.insertOne(prescription);
  return prescription;
}

/**
 * Update prescription
 * @param {string} prescriptionId - Prescription ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object|null>} Updated prescription or null
 */
export async function updatePrescription(prescriptionId, updateData) {
  const collection = getPrescriptionsCollection();
  
  // If medicines are being updated, ensure proper structure
  if (updateData.medicines) {
    updateData.medicines = updateData.medicines.map(med => ({
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
    }));
  }
  
  const update = {
    $set: {
      ...updateData,
      updatedAt: new Date().toISOString()
    }
  };
  
  const result = await collection.findOneAndUpdate(
    { _id: prescriptionId },
    update,
    { returnDocument: 'after' }
  );
  
  return result;
}

/**
 * Delete prescription
 * @param {string} prescriptionId - Prescription ID
 * @returns {Promise<boolean>} Success status
 */
export async function deletePrescription(prescriptionId) {
  const collection = getPrescriptionsCollection();
  const result = await collection.deleteOne({ _id: prescriptionId });
  return result.deletedCount > 0;
}

/**
 * Get prescription by ID
 * @param {string} prescriptionId - Prescription ID
 * @returns {Promise<Object|null>} Prescription or null
 */
export async function getPrescriptionById(prescriptionId) {
  const collection = getPrescriptionsCollection();
  return await collection.findOne({ _id: prescriptionId });
}

/**
 * Get prescriptions by doctor ID
 * @param {string} doctorId - Doctor ID
 * @param {Object} filters - Additional filters
 * @returns {Promise<Array>} Array of prescriptions
 */
export async function getPrescriptionsByDoctorId(doctorId, filters = {}) {
  const collection = getPrescriptionsCollection();
  const query = { doctorId, ...filters };
  return await collection.find(query).sort({ createdAt: -1 }).toArray();
}

/**
 * Get prescriptions by patient ID
 * @param {string} patientId - Patient ID
 * @returns {Promise<Array>} Array of prescriptions
 */
export async function getPrescriptionsByPatientId(patientId) {
  const collection = getPrescriptionsCollection();
  return await collection.find({ patientId }).sort({ createdAt: -1 }).toArray();
}

/**
 * Get prescriptions by appointment ID
 * @param {string} appointmentId - Appointment ID
 * @returns {Promise<Array>} Array of prescriptions
 */
export async function getPrescriptionsByAppointmentId(appointmentId) {
  const collection = getPrescriptionsCollection();
  return await collection.find({ appointmentId }).sort({ createdAt: -1 }).toArray();
}