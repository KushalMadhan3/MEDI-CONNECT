/**
 * OCR Service
 * Handles image text extraction using Tesseract.js
 */

import { createWorker } from 'tesseract.js';
import path from 'path';

/**
 * Extract text from image buffer or URL
 * @param {string|Buffer} imageSource - Image URL or Buffer
 * @returns {Promise<string>} Extracted text
 */
export async function extractTextFromImage(imageSource) {
    let worker = null;
    try {
        worker = await createWorker('eng');

        const ret = await worker.recognize(imageSource);
        let text = ret.data.text;

        // Enhanced text cleanup
        text = text
            // Remove common OCR artifacts
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/[|]/g, 'l') // Common OCR mistake: | to l
            .replace(/[0O]/g, (match, offset) => {
                // Context-aware: if surrounded by letters, likely O, else 0
                const context = text.substring(Math.max(0, offset - 2), Math.min(text.length, offset + 3));
                return /[a-zA-Z]/.test(context) ? 'o' : '0';
            })
            .replace(/[Il1]/g, (match, offset) => {
                // Context-aware: if at start of word, likely I, else l or 1
                const before = text.substring(Math.max(0, offset - 1), offset);
                return /[a-zA-Z]/.test(before) ? 'l' : 'I';
            })
            // Remove special characters that are likely OCR errors
            .replace(/[^\w\s\-.,()\/]/g, ' ')
            // Clean up multiple spaces
            .replace(/\s{2,}/g, ' ')
            .trim();

        await worker.terminate();
        return text;
    } catch (error) {
        console.error('OCR Error:', error);
        if (worker) {
            await worker.terminate();
        }
        throw new Error('Failed to extract text from image');
    }
}

/**
 * Parse medicine names from text
 * Enhanced rule-based extraction with better filtering
 * @param {string} text - Raw OCR text
 * @returns {Array<string>} Potential medicine names
 */
export function parseMedicinesFromText(text) {
    // Common prescription headers to filter out
    const headerPatterns = [
        /^(Dr\.|Doctor|Date|Hospital|Clinic|Name|Age|Sex|Gender|Rx|Sign|Patient|Address|Phone|Mobile|Email)/i,
        /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/, // Dates
        /^[A-Z]{2,3}\s*\d+$/, // Prescription numbers
        /^(Take|Dose|Frequency|Duration|Before|After|With|Food|Meal)/i
    ];

    // Split by newlines and clean
    const lines = text.split(/\n|\r\n/)
        .map(line => line.trim())
        .filter(line => line.length > 2) // Minimum length
        .filter(line => !headerPatterns.some(pattern => pattern.test(line))) // Filter headers
        .filter(line => !/^\d+$/.test(line)) // Filter pure numbers
        .filter(line => !/^[^\w\s]+$/.test(line)) // Filter pure symbols
        .map(line => {
            // Clean common OCR artifacts
            return line
                .replace(/\s+/g, ' ') // Normalize whitespace
                .replace(/[|]/g, 'l') // Common OCR mistake
                .replace(/[0]/g, 'o') // Sometimes 0 is O
                .trim();
        })
        .filter(line => line.length > 2);

    // Extract potential medicine names (usually capitalized or have specific patterns)
    const medicineCandidates = lines
        .filter(line => {
            // Medicine names often:
            // - Start with capital letter
            // - Have at least one letter
            // - Are not all caps (unless short)
            // - Don't contain common prescription keywords
            const hasLetters = /[a-zA-Z]/.test(line);
            const notAllNumbers = !/^\d+$/.test(line);
            const notCommonWords = !/^(tablet|syrup|capsule|injection|cream|ointment|drops|gel|powder|suspension)$/i.test(line);
            // Medicine names are typically 3-50 characters
            const validLength = line.length >= 3 && line.length <= 50;
            // Should have at least 2 letters (not just numbers and symbols)
            const hasEnoughLetters = (line.match(/[a-zA-Z]/g) || []).length >= 2;
            
            return hasLetters && notAllNumbers && notCommonWords && validLength && hasEnoughLetters;
        })
        .map(line => {
            // Further cleanup: remove trailing numbers that might be dosage
            return line.replace(/\s+\d+\s*(mg|g|ml|tablet|tab|cap|capsule)?$/i, '').trim();
        })
        .filter((line, index, self) => self.indexOf(line) === index) // Remove duplicates
        .slice(0, 15); // Return top 15 candidates for better matching

    return medicineCandidates;
}
