/**
 * OCR Worker
 * Processes prescription images to extract text
 */

import { connectRabbitMQ, getChannel } from '../config/rabbitmq.js';
import { connectMongoDB, getDB } from '../config/mongodb.js';
import { createNotification } from '../models/notificationModel.js';
import Tesseract from 'tesseract.js';
import path from 'path';

const QUEUE_NAME = 'ocr_queue';

async function startOCRWorker() {
    try {
        await connectMongoDB();
        const { success, channel: initialChannel } = await connectRabbitMQ();
        if (!success || !initialChannel) {
            console.error('Failed to connect to RabbitMQ');
            return;
        }
        const channel = initialChannel;

        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log(`👁️ OCR Worker listening on ${QUEUE_NAME}...`);

        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                const data = JSON.parse(msg.content.toString());
                const { prescriptionId, userId, imagePath, type } = data; // type: 'url' or 'base64'

                console.log(`👁️ Processing prescription: ${prescriptionId}`);

                try {
                    let resultText = '';

                    if (data.image && data.image.startsWith('data:')) {
                        // Base64
                        const { data: { text } } = await Tesseract.recognize(data.image, 'eng');
                        resultText = text;
                    } else if (data.imageUrl) {
                        // URL
                        const { data: { text } } = await Tesseract.recognize(data.imageUrl, 'eng');
                        resultText = text;
                    }

                    console.log(`✅ Text extracted for ${prescriptionId} (${resultText.length} chars)`);

                    // Process text (Basic entity extraction)
                    const medicines = await findMedicineMatches(resultText);

                    // Update DB
                    const db = getDB();
                    await db.collection('prescriptions').updateOne(
                        { id: prescriptionId },
                        {
                            $set: {
                                status: 'processed',
                                extractedText: resultText,
                                suggestions: medicines,
                                processedAt: new Date().toISOString()
                            }
                        }
                    );

                    // Notify User
                    await createNotification({
                        userId,
                        userRole: 'patient',
                        type: 'prescription',
                        title: 'Prescription Analyzed',
                        message: `We found ${medicines.length} potential medicines in your prescription.`,
                        relatedId: prescriptionId
                    });

                    // Publish completion event
                    channel.publish(
                        'user_events',
                        'prescription.processed',
                        Buffer.from(JSON.stringify({ prescriptionId, userId, success: true }))
                    );

                    channel.ack(msg);
                } catch (error) {
                    console.error('OCR Processing error:', error);
                    channel.nack(msg, false, false); // Don't requeue immediately to avoid loop
                }
            }
        });
    } catch (error) {
        console.error('OCR Worker startup failed:', error);
    }
}

async function findMedicineMatches(text) {
    const db = getDB();
    const { searchDocuments } = await import('../services/searchService.js');
    
    // Extract potential medicine names from text
    const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 3)
        .filter(line => !/^(Dr\.|Date|Hospital|Name|Age|Sex|Rx|Sign|Patient|Address|Phone)/i.test(line))
        .filter(line => !/^\d+$/.test(line)); // Filter pure numbers

    const matches = [];
    const seenIds = new Set();

    // Try ElasticSearch first for each potential medicine name
    for (const line of lines) {
        if (line.length < 3) continue;
        
        // Use ElasticSearch for fuzzy matching
        const esResults = await searchDocuments('medicines', line, ['name', 'description']);
        
        if (esResults && esResults.length > 0) {
            for (const med of esResults.slice(0, 2)) { // Top 2 matches per line
                if (!seenIds.has(med.id || med._id)) {
                    seenIds.add(med.id || med._id);
                    matches.push({
                        extractedName: line,
                        matchedMedicines: [{
                            id: med.id || med._id,
                            name: med.name,
                            price: med.price,
                            image: med.image,
                            category: med.category,
                            stock: med.stock
                        }]
                    });
                }
            }
        } else {
            // Fallback to DB fuzzy search
            const regex = new RegExp(line.replace(/\s+/g, '.*'), 'i');
            const dbResults = await db.collection('medicines')
                .find({ name: regex }, { projection: { id: 1, name: 1, price: 1, image: 1, category: 1, stock: 1 } })
                .limit(2)
                .toArray();
            
            for (const med of dbResults) {
                if (!seenIds.has(med.id)) {
                    seenIds.add(med.id);
                    matches.push({
                        extractedName: line,
                        matchedMedicines: [{
                            id: med.id,
                            name: med.name,
                            price: med.price,
                            image: med.image,
                            category: med.category,
                            stock: med.stock
                        }]
                    });
                }
            }
        }
    }

    return matches.slice(0, 10); // Return top 10 matches
}

startOCRWorker();
