/**
 * Update Images Script
 * Scans local image directories and updates database with local image paths
 * 
 * Usage: node scripts/updateImages.js
 */

import { connectMongoDB, getDB, closeMongoDB } from '../config/mongodb.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to image directories
const DOCTORS_IMAGE_DIR = path.join(__dirname, '../../public/assets/doctors');
const MEDICINES_IMAGE_DIR = path.join(__dirname, '../../public/assets/medicines');

/**
 * Get all image files from a directory
 */
function getImageFiles(dirPath) {
    if (!fs.existsSync(dirPath)) {
        console.log(`⚠️  Directory does not exist: ${dirPath}`);
        return [];
    }

    const files = fs.readdirSync(dirPath);
    return files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
    });
}

/**
 * Update doctor images in database
 */
async function updateDoctorImages() {
    const db = getDB();
    const usersCollection = db.collection('users');
    
    const imageFiles = getImageFiles(DOCTORS_IMAGE_DIR);
    
    if (imageFiles.length === 0) {
        console.log('📁 No doctor images found in public/assets/doctors/');
        return;
    }

    console.log(`\n👨‍⚕️  Found ${imageFiles.length} doctor image(s)`);
    
    // Get all doctors from database
    const doctors = await usersCollection.find({ role: 'doctor' }).toArray();
    console.log(`📋 Found ${doctors.length} doctor(s) in database`);

    let updated = 0;
    
    for (let i = 0; i < doctors.length && i < imageFiles.length; i++) {
        const doctor = doctors[i];
        const imageFile = imageFiles[i];
        const imagePath = `/assets/doctors/${imageFile}`;
        
        await usersCollection.updateOne(
            { id: doctor.id },
            { $set: { image: imagePath, updatedAt: new Date().toISOString() } }
        );
        
        console.log(`  ✅ Updated ${doctor.name}: ${imagePath}`);
        updated++;
    }

    // If there are more images than doctors, log them
    if (imageFiles.length > doctors.length) {
        console.log(`\n⚠️  Found ${imageFiles.length - doctors.length} extra image(s) that weren't assigned`);
    }

    console.log(`\n✅ Updated ${updated} doctor image(s)`);
}

/**
 * Update medicine images in database
 */
async function updateMedicineImages() {
    const db = getDB();
    const medicinesCollection = db.collection('medicines');
    
    const imageFiles = getImageFiles(MEDICINES_IMAGE_DIR);
    
    if (imageFiles.length === 0) {
        console.log('📁 No medicine images found in public/assets/medicines/');
        return;
    }

    console.log(`\n💊 Found ${imageFiles.length} medicine image(s)`);
    
    // Get all medicines from database
    const medicines = await medicinesCollection.find({}).toArray();
    console.log(`📋 Found ${medicines.length} medicine(s) in database`);

    let updated = 0;
    
    // Try to match images by name first, then by index
    for (const medicine of medicines) {
        let imageFile = null;
        const medicineNameLower = medicine.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        
        // Try to find image by medicine name
        imageFile = imageFiles.find(file => {
            const fileNameLower = path.basename(file, path.extname(file)).toLowerCase();
            return fileNameLower.includes(medicineNameLower) || medicineNameLower.includes(fileNameLower);
        });
        
        // If not found, use index-based matching
        if (!imageFile && medicines.indexOf(medicine) < imageFiles.length) {
            imageFile = imageFiles[medicines.indexOf(medicine)];
        }
        
        if (imageFile) {
            const imagePath = `/assets/medicines/${imageFile}`;
            
            await medicinesCollection.updateOne(
                { id: medicine.id },
                { $set: { image: imagePath, updatedAt: new Date().toISOString() } }
            );
            
            console.log(`  ✅ Updated ${medicine.name}: ${imagePath}`);
            updated++;
        }
    }

    console.log(`\n✅ Updated ${updated} medicine image(s)`);
}

/**
 * Create directories if they don't exist
 */
function ensureDirectories() {
    if (!fs.existsSync(DOCTORS_IMAGE_DIR)) {
        fs.mkdirSync(DOCTORS_IMAGE_DIR, { recursive: true });
        console.log(`📁 Created directory: ${DOCTORS_IMAGE_DIR}`);
    }
    
    if (!fs.existsSync(MEDICINES_IMAGE_DIR)) {
        fs.mkdirSync(MEDICINES_IMAGE_DIR, { recursive: true });
        console.log(`📁 Created directory: ${MEDICINES_IMAGE_DIR}`);
    }
}

/**
 * Main function
 */
async function updateImages() {
    try {
        console.log('🖼️  Starting image update process...\n');
        
        // Ensure directories exist
        ensureDirectories();
        
        // Connect to database
        await connectMongoDB();
        console.log('✅ Connected to MongoDB\n');
        
        // Update doctor images
        await updateDoctorImages();
        
        // Update medicine images
        await updateMedicineImages();
        
        console.log('\n✨ Image update process completed!');
        
    } catch (error) {
        console.error('❌ Error updating images:', error);
    } finally {
        await closeMongoDB();
        process.exit(0);
    }
}

// Run the script
updateImages();








