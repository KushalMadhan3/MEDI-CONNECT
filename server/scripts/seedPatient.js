
import { connectMongoDB, getDB, closeMongoDB } from '../config/mongodb.js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

async function seedPatient() {
    try {
        console.log('🌱 Seeding patient...');
        await connectMongoDB();
        const db = getDB();
        const usersCollection = db.collection('users');

        const email = 'patient@example.com';
        const exists = await usersCollection.findOne({ email });

        if (exists) {
            console.log('Test patient already exists.');
        } else {
            const hashedPassword = await bcrypt.hash('password123', 10);
            await usersCollection.insertOne({
                id: `pat_${Date.now()}`,
                name: 'Test Patient',
                email: email,
                password: hashedPassword,
                role: 'patient',
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            console.log('Created test patient: patient@example.com / password123');
        }
    } catch (error) {
        console.error('Seeding error:', error);
    } finally {
        await closeMongoDB();
        process.exit(0);
    }
}

seedPatient();
