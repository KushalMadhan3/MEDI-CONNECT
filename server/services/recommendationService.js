/**
 * Medicine Recommendation Service
 * Recommends medicines based on disease keywords extracted from prescriptions
 */

import { getDB } from '../config/mongodb.js';
import { searchDocuments } from './searchService.js';

/**
 * Disease keywords mapping to medicine categories
 */
const diseaseKeywords = {
    'fever': ['Paracetamol', 'Ibuprofen', 'Aspirin'],
    'cold': ['Paracetamol', 'Cetirizine', 'Phenylephrine'],
    'cough': ['Dextromethorphan', 'Guaifenesin', 'Codeine'],
    'headache': ['Paracetamol', 'Ibuprofen', 'Aspirin'],
    'pain': ['Paracetamol', 'Ibuprofen', 'Diclofenac'],
    'infection': ['Amoxicillin', 'Azithromycin', 'Ciprofloxacin'],
    'diabetes': ['Metformin', 'Insulin', 'Glipizide'],
    'hypertension': ['Amlodipine', 'Losartan', 'Atenolol'],
    'asthma': ['Salbutamol', 'Budesonide', 'Montelukast'],
    'allergy': ['Cetirizine', 'Loratadine', 'Fexofenadine'],
    'acne': ['Benzoyl Peroxide', 'Salicylic Acid', 'Clindamycin'],
    'rash': ['Hydrocortisone', 'Calamine', 'Antihistamine'],
    'inflammation': ['Ibuprofen', 'Diclofenac', 'Naproxen'],
    'nausea': ['Ondansetron', 'Domperidone', 'Metoclopramide'],
    'diarrhea': ['Loperamide', 'ORS', 'Probiotics'],
    'constipation': ['Lactulose', 'Bisacodyl', 'Psyllium'],
    'anxiety': ['Alprazolam', 'Diazepam', 'Lorazepam'],
    'depression': ['Sertraline', 'Fluoxetine', 'Escitalopram']
};

/**
 * Extract disease keywords from prescription text
 * @param {string} text - Prescription text
 * @returns {Array<string>} Array of detected disease keywords
 */
export function extractDiseaseKeywords(text) {
    const textLower = text.toLowerCase();
    const detectedKeywords = [];

    for (const [keyword, medicines] of Object.entries(diseaseKeywords)) {
        if (textLower.includes(keyword)) {
            detectedKeywords.push(keyword);
        }
    }

    return detectedKeywords;
}

/**
 * Get recommended medicines based on disease keywords
 * @param {Array<string>} keywords - Disease keywords
 * @param {number} limit - Maximum number of recommendations
 * @returns {Promise<Array>} Recommended medicines
 */
export async function getRecommendedMedicines(keywords, limit = 5) {
    if (!keywords || keywords.length === 0) {
        return [];
    }

    const db = getDB();
    const recommendations = [];
    const seenIds = new Set();

    // Get medicine names for each keyword
    for (const keyword of keywords) {
        const medicineNames = diseaseKeywords[keyword] || [];
        
        for (const medName of medicineNames) {
            if (seenIds.has(medName)) continue;

            // Try ElasticSearch first
            const esResults = await searchDocuments('medicines', medName, ['name', 'description']);
            
            if (esResults && esResults.length > 0) {
                for (const med of esResults.slice(0, 2)) {
                    if (!seenIds.has(med.id || med._id)) {
                        seenIds.add(med.id || med._id);
                        recommendations.push({
                            id: med.id || med._id,
                            name: med.name,
                            price: med.price,
                            image: med.image,
                            category: med.category,
                            stock: med.stock,
                            description: med.description,
                            recommendedFor: keyword,
                            reason: `Recommended for ${keyword}`
                        });
                    }
                }
            } else {
                // Fallback to DB search
                const regex = new RegExp(medName.replace(/\s+/g, '.*'), 'i');
                const dbResults = await db.collection('medicines')
                    .find({ name: regex }, { 
                        projection: { id: 1, name: 1, price: 1, image: 1, category: 1, stock: 1, description: 1 } 
                    })
                    .limit(2)
                    .toArray();

                for (const med of dbResults) {
                    if (!seenIds.has(med.id)) {
                        seenIds.add(med.id);
                        recommendations.push({
                            id: med.id,
                            name: med.name,
                            price: med.price,
                            image: med.image,
                            category: med.category,
                            stock: med.stock,
                            description: med.description,
                            recommendedFor: keyword,
                            reason: `Recommended for ${keyword}`
                        });
                    }
                }
            }
        }
    }

    return recommendations.slice(0, limit);
}

/**
 * Get medicine recommendations from prescription text
 * @param {string} prescriptionText - Prescription text
 * @param {number} limit - Maximum recommendations
 * @returns {Promise<Object>} Recommendations with keywords and medicines
 */
export async function getRecommendationsFromPrescription(prescriptionText, limit = 5) {
    const keywords = extractDiseaseKeywords(prescriptionText);
    const medicines = await getRecommendedMedicines(keywords, limit);

    return {
        detectedKeywords: keywords,
        recommendedMedicines: medicines,
        count: medicines.length
    };
}


