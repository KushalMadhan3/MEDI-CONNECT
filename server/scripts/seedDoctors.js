/**
 * Seed Doctors
 * Populates database with initial doctor data
 */

import { connectMongoDB, getDB, closeMongoDB } from '../config/mongodb.js';
import { createPatient } from '../models/patientModel.js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

// Map doctor names to their image files (mapped by gender and order)
// Female doctors: Priya, Anjali, Meera, Kavita, Sunita, Neha
// Male doctors: Rajesh, Vikram, Arjun, Amit, Rohit, Ramesh, Suresh
const doctorImageMap = {
    "Dr. Priya Sharma": "/assets/Doctors Images/Doctor 1.jpg",           // Female - Cardiology
    "Dr. Rajesh Kumar": "/assets/Doctors Images/Doctor 8.jpg",           // Male - Cardiology (swapped with Kavita Nair)
    "Dr. Anjali Patel": "/assets/Doctors Images/Doctor 3.jpg",          // Female - Cardiology
    "Dr. Vikram Singh": "/assets/Doctors Images/Doctor 10.jpg",         // Male - Dermatology (swapped with Sunita Desai)
    "Dr. Meera Reddy": "/assets/Doctors Images/Doctor 5.jpg",            // Female - Dermatology
    "Dr. Arjun Malhotra": "/assets/Doctors Images/Doctor 6.jpg",         // Male - Dermatology
    "Dr. Amit Verma": "/assets/Doctors Images/Doctor 7.jpg",             // Male - Orthopedics
    "Dr. Kavita Nair": "/assets/Doctors Images/Doctor 2.png",            // Female - Orthopedics (swapped with Rajesh Kumar)
    "Dr. Rohit Joshi": "/assets/Doctors Images/Doctor 9.jpg",             // Male - Orthopedics
    "Dr. Sunita Desai": "/assets/Doctors Images/Doctor 4.jpg",         // Female - General Medicine (swapped with Vikram Singh)
    "Dr. Ramesh Iyer": "/assets/Doctors Images/Doctor 11.jpg",          // Male - General Medicine
    "Dr. Neha Gupta": "/assets/Doctors Images/Neha Gupta.jpg",           // Female - General Medicine (specific image)
    "Dr. Suresh Menon": "/assets/Doctors Images/Doctor 11.jpg"           // Male - General Medicine (shares with Ramesh Iyer - both male)
};

// Helper function to get image path for a doctor
function getDoctorImage(doctorName) {
    return doctorImageMap[doctorName] || "/assets/Doctors Images/Doctor 1.jpg";
}

const doctors = [
    // Cardiology Doctors
    {
        name: "Dr. Priya Sharma",
        email: "priya.sharma@mediconnect.com",
        specialization: "Cardiology",
        experience: "18 years",
        rating: 4.9,
        consultationPrice: 1500,
        about: "Senior Cardiologist with extensive experience in interventional cardiology and heart disease management. MBBS, MD (Cardiology), DM (Cardiology).",
        image: getDoctorImage("Dr. Priya Sharma"),
        availability: ["Monday", "Wednesday", "Friday"],
        location: "Delhi"
    },
    {
        name: "Dr. Rajesh Kumar",
        email: "rajesh.kumar@mediconnect.com",
        specialization: "Cardiology",
        experience: "15 years",
        rating: 4.8,
        consultationPrice: 1400,
        about: "Expert in cardiac catheterization and angioplasty. Specialized in treating coronary artery disease.",
        image: getDoctorImage("Dr. Rajesh Kumar"),
        availability: ["Tuesday", "Thursday", "Saturday"],
        location: "Mumbai"
    },
    {
        name: "Dr. Anjali Patel",
        email: "anjali.patel@mediconnect.com",
        specialization: "Cardiology",
        experience: "12 years",
        rating: 4.7,
        consultationPrice: 1300,
        about: "Pediatric cardiologist specializing in congenital heart diseases and cardiac care for children.",
        image: getDoctorImage("Dr. Anjali Patel"),
        availability: ["Monday", "Wednesday", "Friday"],
        location: "Bangalore"
    },
    // Dermatology Doctors
    {
        name: "Dr. Vikram Singh",
        email: "vikram.singh@mediconnect.com",
        specialization: "Dermatology",
        experience: "14 years",
        rating: 4.8,
        consultationPrice: 1200,
        about: "Expert in clinical dermatology, cosmetic procedures, and skin cancer treatment. MD (Dermatology).",
        image: getDoctorImage("Dr. Vikram Singh"),
        availability: ["Tuesday", "Thursday", "Saturday"],
        location: "Delhi"
    },
    {
        name: "Dr. Meera Reddy",
        email: "meera.reddy@mediconnect.com",
        specialization: "Dermatology",
        experience: "10 years",
        rating: 4.7,
        consultationPrice: 1100,
        about: "Specialized in acne treatment, hair loss, and aesthetic dermatology procedures.",
        image: getDoctorImage("Dr. Meera Reddy"),
        availability: ["Monday", "Wednesday", "Friday"],
        location: "Hyderabad"
    },
    {
        name: "Dr. Arjun Malhotra",
        email: "arjun.malhotra@mediconnect.com",
        specialization: "Dermatology",
        experience: "8 years",
        rating: 4.6,
        consultationPrice: 1000,
        about: "Expert in treating psoriasis, eczema, and other chronic skin conditions.",
        image: getDoctorImage("Dr. Arjun Malhotra"),
        availability: ["Tuesday", "Thursday"],
        location: "Pune"
    },
    // Orthopedics Doctors
    {
        name: "Dr. Amit Verma",
        email: "amit.verma@mediconnect.com",
        specialization: "Orthopedics",
        experience: "16 years",
        rating: 4.9,
        consultationPrice: 1500,
        about: "Orthopedic surgeon specializing in sports injuries, joint replacement, and spine surgery.",
        image: getDoctorImage("Dr. Amit Verma"),
        availability: ["Monday", "Tuesday", "Thursday"],
        location: "Delhi"
    },
    {
        name: "Dr. Kavita Nair",
        email: "kavita.nair@mediconnect.com",
        specialization: "Orthopedics",
        experience: "13 years",
        rating: 4.8,
        consultationPrice: 1400,
        about: "Expert in pediatric orthopedics and treatment of bone fractures in children.",
        image: getDoctorImage("Dr. Kavita Nair"),
        availability: ["Wednesday", "Friday", "Saturday"],
        location: "Mumbai"
    },
    {
        name: "Dr. Rohit Joshi",
        email: "rohit.joshi@mediconnect.com",
        specialization: "Orthopedics",
        experience: "11 years",
        rating: 4.7,
        consultationPrice: 1300,
        about: "Specialized in arthroscopic surgery and treatment of knee and shoulder injuries.",
        image: getDoctorImage("Dr. Rohit Joshi"),
        availability: ["Monday", "Wednesday", "Friday"],
        location: "Bangalore"
    },
    // General Medicine Doctors
    {
        name: "Dr. Sunita Desai",
        email: "sunita.desai@mediconnect.com",
        specialization: "General Medicine",
        experience: "22 years",
        rating: 4.9,
        consultationPrice: 900,
        about: "Senior physician with extensive experience in general medicine, diabetes, and hypertension management.",
        image: getDoctorImage("Dr. Sunita Desai"),
        availability: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        location: "Mumbai"
    },
    {
        name: "Dr. Ramesh Iyer",
        email: "ramesh.iyer@mediconnect.com",
        specialization: "General Medicine",
        experience: "18 years",
        rating: 4.8,
        consultationPrice: 850,
        about: "Comprehensive care for all general health issues, preventive medicine, and chronic disease management.",
        image: getDoctorImage("Dr. Ramesh Iyer"),
        availability: ["Tuesday", "Wednesday", "Friday", "Saturday"],
        location: "Chennai"
    },
    {
        name: "Dr. Neha Gupta",
        email: "neha.gupta@mediconnect.com",
        specialization: "General Medicine",
        experience: "15 years",
        rating: 4.7,
        consultationPrice: 800,
        about: "Expert in family medicine, preventive care, and treatment of common illnesses.",
        image: getDoctorImage("Dr. Neha Gupta"),
        availability: ["Monday", "Thursday", "Friday", "Saturday"],
        location: "Delhi"
    },
    {
        name: "Dr. Suresh Menon",
        email: "suresh.menon@mediconnect.com",
        specialization: "General Medicine",
        experience: "12 years",
        rating: 4.6,
        consultationPrice: 750,
        about: "Specialized in internal medicine, infectious diseases, and geriatric care.",
        image: getDoctorImage("Dr. Suresh Menon"),
        availability: ["Monday", "Tuesday", "Wednesday", "Thursday"],
        location: "Kolkata"
    }
];

async function seedDoctors() {
    try {
        console.log('🌱 Seeding doctors...');
        await connectMongoDB();
        const db = getDB();
        const usersCollection = db.collection('users');

        for (const doc of doctors) {
            // Check if exists
            const exists = await usersCollection.findOne({ email: doc.email });
            if (exists) {
                console.log(`Doctor ${doc.name} already exists.`);

                // Update extra fields including image
                await usersCollection.updateOne(
                    { email: doc.email },
                    {
                        $set: {
                            specialization: doc.specialization,
                            experience: doc.experience,
                            rating: doc.rating,
                            consultationPrice: doc.consultationPrice,
                            about: doc.about,
                            image: doc.image,
                            availability: doc.availability,
                            location: doc.location || 'Delhi',
                            updatedAt: new Date().toISOString()
                        }
                    }
                );
                continue;
            }

            const hashedPassword = await bcrypt.hash('password123', 10);
            const userId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            await usersCollection.insertOne({
                id: userId,
                name: doc.name,
                email: doc.email,
                password: hashedPassword,
                role: 'doctor',
                status: 'active',
                specialization: doc.specialization,
                experience: doc.experience,
                rating: doc.rating,
                consultationPrice: doc.consultationPrice,
                about: doc.about,
                image: doc.image,
                availability: doc.availability,
                location: doc.location || 'Delhi',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            console.log(`Created doctor: ${doc.name}`);
        }

        console.log('✅ Doctors seeded successfully');
    } catch (error) {
        console.error('Seeding error:', error);
    } finally {
        await closeMongoDB();
    }
}

seedDoctors();
