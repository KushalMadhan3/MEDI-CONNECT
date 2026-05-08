/**
 * Search Controller
 * Handles search and OCR API endpoints
 */

import { searchDocuments, getESClient } from '../services/searchService.js';
import { extractTextFromImage, parseMedicinesFromText } from '../services/ocrService.js';
import { searchMedicinesInDB, getAllMedicines } from '../models/medicineModel.js';
import { getRecommendationsFromPrescription } from '../services/recommendationService.js';
import { getChannel } from '../config/rabbitmq.js';
import { getDB } from '../config/mongodb.js';

/**
 * POST /api/search/upload-prescription
 * Process uploaded prescription image with immediate OCR + ElasticSearch matching
 */
export async function uploadPrescription(req, res) {
    try {
        const { image } = req.body;
        const userId = req.user ? req.user.userId : 'guest';

        if (!image) {
            return res.status(400).json({
                success: false,
                message: 'Image data is required'
            });
        }

        // Validate image format
        if (!image.startsWith('data:image/')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid image format. Please upload a valid image file.'
            });
        }

        console.log('📸 Processing prescription upload for user:', userId);

        // 1. Create Prescription Record
        const db = getDB();
        const prescriptionId = `rx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await db.collection('prescriptions').insertOne({
            id: prescriptionId,
            userId,
            imagePreview: image.substring(0, 200) + '...', // Store preview only
            status: 'processing',
            createdAt: new Date().toISOString()
        });

        // 2. Process OCR immediately (synchronous for better UX)
        let extractedText = '';
        let extractedMedicines = [];
        let matches = [];

        try {
            const { extractTextFromImage, parseMedicinesFromText } = await import('../services/ocrService.js');
            const { searchDocuments } = await import('../services/searchService.js');

            // Extract text from image
            extractedText = await extractTextFromImage(image);
            console.log(`✅ OCR extracted ${extractedText.length} characters`);

            // Parse potential medicine names
            extractedMedicines = parseMedicinesFromText(extractedText);
            console.log(`🔍 Found ${extractedMedicines.length} potential medicine names`);

            // Search for matching medicines using ElasticSearch
            const seenIds = new Set();
            for (const medName of extractedMedicines) {
                if (medName.length < 3) continue;

                // Try ElasticSearch first
                const esResults = await searchDocuments('medicines', medName, ['name', 'description']);
                
                if (esResults && esResults.length > 0) {
                    const matched = esResults.slice(0, 2).map(med => ({
                        id: med.id || med._id,
                        name: med.name,
                        price: med.price,
                        image: med.image || `https://via.placeholder.com/200?text=${encodeURIComponent(med.name)}`,
                        category: med.category,
                        stock: med.stock,
                        description: med.description
                    }));

                    if (matched.length > 0) {
                        matches.push({
                            extractedName: medName,
                            matchedMedicines: matched
                        });
                    }
                } else {
                    // Fallback to DB search
                    const regex = new RegExp(medName.replace(/\s+/g, '.*'), 'i');
                    const dbResults = await db.collection('medicines')
                        .find({ name: regex }, { projection: { id: 1, name: 1, price: 1, image: 1, category: 1, stock: 1, description: 1 } })
                        .limit(2)
                        .toArray();

                    if (dbResults.length > 0) {
                        matches.push({
                            extractedName: medName,
                            matchedMedicines: dbResults.map(med => ({
                                id: med.id,
                                name: med.name,
                                price: med.price,
                                image: med.image || `https://via.placeholder.com/200?text=${encodeURIComponent(med.name)}`,
                                category: med.category,
                                stock: med.stock,
                                description: med.description
                            }))
                        });
                    }
                }
            }

            // Get medicine recommendations based on disease keywords
            let recommendations = null;
            try {
                recommendations = await getRecommendationsFromPrescription(extractedText, 5);
            } catch (recError) {
                console.warn('Recommendation service error:', recError.message);
            }

            // Update prescription with results
            await db.collection('prescriptions').updateOne(
                { id: prescriptionId },
                {
                    $set: {
                        status: 'processed',
                        extractedText,
                        extractedMedicines,
                        suggestions: matches,
                        processedAt: new Date().toISOString()
                    }
                }
            );

            // Create notification
            const { createNotification } = await import('../models/notificationModel.js');
            await createNotification({
                userId,
                userRole: 'patient',
                type: 'prescription',
                title: 'Prescription Analyzed Successfully',
                message: `Found ${matches.length} medicine matches in your prescription.`,
                relatedId: prescriptionId
            });

            // Publish event
            const channel = getChannel();
            if (channel) {
                channel.publish(
                    'user_events',
                    'prescription.processed',
                    Buffer.from(JSON.stringify({
                        prescriptionId,
                        userId,
                        matchCount: matches.length,
                        timestamp: new Date().toISOString()
                    })),
                    { persistent: true }
                );
            }

            res.json({
                success: true,
                message: 'Prescription analyzed successfully',
                data: {
                    id: prescriptionId,
                    status: 'processed',
                    extractedText,
                    extractedMedicines,
                    matches,
                    recommendations: recommendations || null
                }
            });

        } catch (ocrError) {
            console.error('OCR processing error:', ocrError);
            
            // Update status to failed
            await db.collection('prescriptions').updateOne(
                { id: prescriptionId },
                {
                    $set: {
                        status: 'failed',
                        error: ocrError.message,
                        processedAt: new Date().toISOString()
                    }
                }
            );

            // Still dispatch to worker queue for retry
            const channel = getChannel();
            if (channel) {
                channel.sendToQueue(
                    'ocr_queue',
                    Buffer.from(JSON.stringify({
                        prescriptionId,
                        userId,
                        image
                    })),
                    { persistent: true }
                );
            }

            res.json({
                success: true,
                message: 'Prescription uploaded. Processing in background...',
                data: {
                    id: prescriptionId,
                    status: 'processing'
                }
            });
        }

    } catch (error) {
        console.error('Prescription upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload prescription'
        });
    }
}


/**
 * GET /api/search/global
 * Search across doctors and medicines with ElasticSearch
 */
export async function globalSearch(req, res) {
    try {
        const { q, category, type } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Query parameter q is required'
            });
        }

        let medicines = [];
        let doctors = [];

        // Try ElasticSearch first
        const esClient = getESClient();
        if (esClient) {
            try {
                // Search medicines
                const medicineResults = await searchDocuments('medicines', q, ['name', 'description', 'category']);
                if (medicineResults) {
                    medicines = medicineResults
                        .filter(m => !category || m.category === category)
                        .map(m => ({
                            id: m.id || m._id,
                            name: m.name,
                            category: m.category,
                            price: m.price,
                            image: m.image,
                            stock: m.stock
                        }));
                }

                // Search doctors
                const doctorResults = await searchDocuments('doctors', q, ['name', 'specialization', 'about']);
                if (doctorResults) {
                    doctors = doctorResults
                        .map(d => ({
                            id: d.id || d._id,
                            name: d.name,
                            specialization: d.specialization,
                            rating: d.rating,
                            consultationPrice: d.consultationPrice,
                            image: d.image
                        }));
                }
            } catch (esError) {
                console.warn('ElasticSearch search failed, falling back to DB:', esError.message);
            }
        }

        // Fallback to DB search if ES not available or returned no results
        if (medicines.length === 0) {
            medicines = await searchMedicinesInDB(q);
            if (category) {
                medicines = medicines.filter(m => m.category === category);
            }
        }

        if (doctors.length === 0) {
            const { getDB } = await import('../config/mongodb.js');
            const db = getDB();
            const regex = new RegExp(q, 'i');
            const doctorDocs = await db.collection('users').find({
                role: 'doctor',
                status: 'active',
                $or: [
                    { name: regex },
                    { specialization: regex }
                ]
            }, { projection: { password: 0 } }).toArray();

            doctors = doctorDocs.map(d => ({
                id: d.id,
                name: d.name,
                specialization: d.specialization,
                rating: d.rating || 4.5,
                consultationPrice: d.consultationPrice || 500,
                image: d.image
            }));
        }

        // Filter by type if specified
        const result = {};
        if (!type || type === 'medicine') result.medicines = medicines;
        if (!type || type === 'doctor') result.doctors = doctors;

        res.json({
            success: true,
            data: result,
            source: esClient ? 'elasticsearch' : 'database'
        });
    } catch (error) {
        console.error('Global search error:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed'
        });
    }
}
