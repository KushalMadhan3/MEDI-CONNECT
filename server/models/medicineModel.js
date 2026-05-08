/**
 * Medicine Model
 * Stores medicine information
 */

import { getDB } from '../config/mongodb.js';

/**
 * Get medicines collection
 */
export function getMedicinesCollection() {
    const db = getDB();
    return db.collection('medicines');
}

/**
 * Create a new medicine
 * @param {Object} medicineData - Medicine data
 * @returns {Promise<Object>} Created medicine
 */
export async function createMedicine(medicineData) {
    const collection = getMedicinesCollection();
    const medicine = {
        id: `med_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: medicineData.name,
        category: medicineData.category, // Tablet, Syrup, Injection, Supplement
        description: medicineData.description || '',
        price: parseFloat(medicineData.price),
        stock: parseInt(medicineData.stock) || 0,
        image: medicineData.image || null,
        requiresPrescription: medicineData.requiresPrescription || false,
        rating: medicineData.rating || 0,
        reviews: medicineData.reviews || 0,
        manufacturer: medicineData.manufacturer || null,
        expiryDate: medicineData.expiryDate || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    await collection.insertOne(medicine);
    return medicine;
}

/**
 * Get medicine by ID
 * @param {string} medicineId - Medicine ID
 * @returns {Promise<Object|null>} Medicine or null
 */
export async function getMedicineById(medicineId) {
    const collection = getMedicinesCollection();
    return await collection.findOne({ id: medicineId });
}

/**
 * Get all medicines (with optional filters)
 * @param {Object} filters - Filter options
 * @param {Object} options - Sort/Limit options
 * @returns {Promise<Array>} Array of medicines
 */
export async function getAllMedicines(filters = {}, options = {}) {
    const collection = getMedicinesCollection();
    let cursor = collection.find(filters);

    if (options.sort) {
        cursor = cursor.sort(options.sort);
    }

    if (options.limit) {
        cursor = cursor.limit(options.limit);
    }

    if (options.skip) {
        cursor = cursor.skip(options.skip);
    }

    return await cursor.toArray();
}

/**
 * Update stock
 * @param {string} medicineId - Medicine ID
 * @param {number} quantity - Quantity to deduct (negative) or add (positive)
 */
export async function updateMedicineStock(medicineId, quantity) {
    const collection = getMedicinesCollection();
    const medicine = await collection.findOne({ id: medicineId });
    
    if (!medicine) {
        throw new Error('Medicine not found');
    }
    
    const newStock = (medicine.stock || 0) + quantity;
    
    const result = await collection.updateOne(
        { id: medicineId },
        { 
            $inc: { stock: quantity },
            $set: { updatedAt: new Date().toISOString() }
        }
    );
    
    // Check for low stock alert (threshold: 10)
    const lowStockThreshold = 10;
    if (newStock <= lowStockThreshold && newStock > 0 && (medicine.stock || 0) > lowStockThreshold) {
        // Stock just dropped below threshold
        const { createNotification } = await import('../models/notificationModel.js');
        await createNotification({
            userId: 'admin',
            userRole: 'admin',
            type: 'inventory',
            title: 'Low Stock Alert',
            message: `${medicine.name} is running low. Current stock: ${newStock} units.`,
            relatedId: medicineId
        });
    }
    
    return result;
}

/**
 * Search medicines
 * This handles basic DB regex search, ElasticSearch is handled in searchService
 */
export async function searchMedicinesInDB(query) {
    const collection = getMedicinesCollection();
    const regex = new RegExp(query, 'i');
    return await collection.find({
        $or: [
            { name: regex },
            { description: regex },
            { category: regex }
        ]
    }).toArray();
}
