/**
 * Upload Routes
 * Handles file uploads with image processing
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Ensure upload directory exists
const uploadDir = 'uploads/profiles';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer (memory storage for processing)
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images are allowed! (JPG, PNG, GIF, WEBP)'));
    }
});

/**
 * POST /api/upload/profile
 * Upload and process profile image with resizing and validation
 */
router.post('/profile', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const userId = req.user.userId;
        const file = req.file;

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            return res.status(400).json({ success: false, message: 'File size exceeds 10MB limit' });
        }

        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        const filename = `${userId}-${uniqueSuffix}${ext}`;
        const filepath = path.join(uploadDir, filename);

        // Process image with Sharp: resize, optimize, and save
        await sharp(file.buffer)
            .resize(400, 400, {
                fit: 'cover',
                position: 'center'
            })
            .jpeg({ quality: 85 }) // Convert to JPEG for consistency
            .toFile(filepath);

        // Return the path that can be served statically
        const imageUrl = `/uploads/profiles/${filename}`;

        res.json({
            success: true,
            message: 'Image uploaded and processed successfully',
            data: { 
                imageUrl,
                filename,
                size: file.size,
                processed: true
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        if (error.message.includes('Only images')) {
            return res.status(400).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Upload failed. Please try again.' });
    }
});

export default router;
