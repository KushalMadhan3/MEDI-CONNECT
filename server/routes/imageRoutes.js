/**
 * Image Routes
 * Public routes for generating doctor/medicine images
 */

import express from 'express';
import { generateDoctorImage, generateMedicineImage } from '../services/imageGenerationService.js';
import { getDB } from '../config/mongodb.js';

const router = express.Router();

// Generate doctor image (public endpoint)
router.get('/doctor/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { specialization } = req.query;
    
    const db = getDB();
    const doctor = await db.collection('users').findOne({ id: doctorId, role: 'doctor' });
    
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    
    const imageUrl = await generateDoctorImage(
      doctorId,
      specialization || doctor.specialization || 'General Medicine',
      doctor.name
    );
    
    // Redirect to image URL
    res.redirect(imageUrl);
  } catch (error) {
    console.error('Generate doctor image error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate image' });
  }
});

// Generate medicine image (public endpoint)
router.get('/medicine/:medicineId', async (req, res) => {
  try {
    const { medicineId } = req.params;
    const { name, category } = req.query;
    
    const db = getDB();
    const medicine = await db.collection('medicines').findOne({ id: medicineId });
    
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }
    
    const imageUrl = await generateMedicineImage(
      medicineId,
      name || medicine.name,
      category || medicine.category
    );
    
    // Redirect to image URL
    res.redirect(imageUrl);
  } catch (error) {
    console.error('Generate medicine image error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate image' });
  }
});

export default router;


