/**
 * Seed Medicines
 * Populates database with initial medicine data with unique images
 */

import { connectMongoDB, getDB, closeMongoDB } from '../config/mongodb.js';
import dotenv from 'dotenv';
import { connectElasticSearch, indexDocument } from '../services/searchService.js';

dotenv.config();

// Map medicine names to their image files
const medicineImageMap = {
    "Paracetamol 500mg": "/assets/Medicines Images/Paracetamol 500mg.webp",
    "Ibuprofen 400mg": "/assets/Medicines Images/Ibuprofen 400mg.webp",
    "Aspirin 75mg": "/assets/Medicines Images/Aspirin 75mg.jpeg",
    "Diclofenac 50mg": "/assets/Medicines Images/Diclofenac 50mg.webp",
    "Amoxicillin 500mg": "/assets/Medicines Images/Amoxicillin 500mg.webp",
    "Azithromycin 500mg": "/assets/Medicines Images/Azithromycin 500mg.webp",
    "Ciprofloxacin 500mg": "/assets/Medicines Images/Ciprofloxacin 500mg.webp",
    "Cough Syrup (Benadryl)": "/assets/Medicines Images/Cough Syrup (Benadryl).webp",
    "Cetirizine 10mg": "/assets/Medicines Images/Cetirizine 10mg.webp",
    "Loratadine 10mg": "/assets/Medicines Images/Loratadine 10mg.jpeg",
    "Phenylephrine 10mg": "/assets/Medicines Images/Phenylephrine 10mg.jpeg",
    "Metformin 500mg": "/assets/Medicines Images/Metformin 500mg.png",
    "Glipizide 5mg": "/assets/Medicines Images/Glipizide 5mg.jpg",
    "Amlodipine 5mg": "/assets/Medicines Images/Amlodipine 5mg.jpg",
    "Losartan 50mg": "/assets/Medicines Images/Losartan 50mg.jpg",
    "Vitamin C 1000mg": "/assets/Medicines Images/Vitamin C 1000mg.jpg",
    "Multivitamin Complex": "/assets/Medicines Images/Multivitamin Complex.jpg",
    "Vitamin D3 60000 IU": "/assets/Medicines Images/Vitamin D3 60000 IU.webp",
    "Calcium + Vitamin D": "/assets/Medicines Images/Calcium + Vitamin D.jpg",
    "Iron + Folic Acid": "/assets/Medicines Images/Iron + Folic Acid.webp",
    "Omega-3 Fish Oil": "/assets/Medicines Images/Omega-3 Fish Oil.jpg",
    "Omeprazole 20mg": "/assets/Medicines Images/Omeprazole 20mg.jpg",
    "Domperidone 10mg": "/assets/Medicines Images/Domperidone 10mg.avif",
    "Lactulose Syrup": "/assets/Medicines Images/Lactulose Syrup.jpg",
    "Hydrocortisone Cream 1%": "/assets/Medicines Images/Hydrocortisone Cream 1%.jpg",
    "Benzoyl Peroxide Gel 5%": "/assets/Medicines Images/Benzoyl Peroxide Gel 5%.webp",
    "Salbutamol Inhaler": "/assets/Medicines Images/Salbutamol Inhaler.webp",
    "Montelukast 10mg": "/assets/Medicines Images/Montelukast 10mg.webp"
};

// Helper function to get image path for a medicine
function getMedicineImage(medicineName) {
    return medicineImageMap[medicineName] || "https://via.placeholder.com/400";
}

const medicines = [
    // Pain & Fever Relief
    {
        name: "Paracetamol 500mg",
        category: "Tablet",
        description: "Effective for fever and mild to moderate pain relief. Safe for adults and children.",
        price: 30,
        stock: 500,
        manufacturer: "GSK",
        requiresPrescription: false,
        image: getMedicineImage("Paracetamol 500mg"),
        rating: 4.8,
        reviews: 1250
    },
    {
        name: "Ibuprofen 400mg",
        category: "Tablet",
        description: "Anti-inflammatory pain reliever for headaches, muscle pain, and arthritis.",
        price: 45,
        stock: 300,
        manufacturer: "Abbott",
        requiresPrescription: false,
        image: getMedicineImage("Ibuprofen 400mg"),
        rating: 4.7,
        reviews: 980
    },
    {
        name: "Aspirin 75mg",
        category: "Tablet",
        description: "Low-dose aspirin for heart health and blood clot prevention.",
        price: 35,
        stock: 400,
        manufacturer: "Bayer",
        requiresPrescription: false,
        image: getMedicineImage("Aspirin 75mg"),
        rating: 4.6,
        reviews: 650
    },
    {
        name: "Diclofenac 50mg",
        category: "Tablet",
        description: "Strong pain reliever for joint pain, back pain, and inflammation.",
        price: 55,
        stock: 250,
        manufacturer: "Novartis",
        requiresPrescription: false,
        image: getMedicineImage("Diclofenac 50mg"),
        rating: 4.5,
        reviews: 420
    },
    // Antibiotics
    {
        name: "Amoxicillin 500mg",
        category: "Capsule",
        description: "Broad-spectrum antibiotic for bacterial infections like pneumonia, bronchitis, and UTIs.",
        price: 120,
        stock: 200,
        manufacturer: "Sun Pharma",
        requiresPrescription: true,
        image: getMedicineImage("Amoxicillin 500mg"),
        rating: 4.5,
        reviews: 320
    },
    {
        name: "Azithromycin 500mg",
        category: "Tablet",
        description: "Macrolide antibiotic for respiratory and skin infections.",
        price: 150,
        stock: 180,
        manufacturer: "Cipla",
        requiresPrescription: true,
        image: getMedicineImage("Azithromycin 500mg"),
        rating: 4.4,
        reviews: 280
    },
    {
        name: "Ciprofloxacin 500mg",
        category: "Tablet",
        description: "Fluoroquinolone antibiotic for urinary tract and gastrointestinal infections.",
        price: 180,
        stock: 150,
        manufacturer: "Dr. Reddy's",
        requiresPrescription: true,
        image: getMedicineImage("Ciprofloxacin 500mg"),
        rating: 4.3,
        reviews: 190
    },
    // Cough & Cold
    {
        name: "Cough Syrup (Benadryl)",
        category: "Syrup",
        description: "Soothing relief for dry and wet coughs. Contains dextromethorphan and guaifenesin.",
        price: 95,
        stock: 150,
        manufacturer: "Benadryl",
        requiresPrescription: false,
        image: getMedicineImage("Cough Syrup (Benadryl)"),
        rating: 4.6,
        reviews: 850
    },
    {
        name: "Cetirizine 10mg",
        category: "Tablet",
        description: "Relief from allergy symptoms like runny nose, sneezing, and itchy eyes.",
        price: 25,
        stock: 600,
        manufacturer: "Dr. Reddy's",
        requiresPrescription: false,
        image: getMedicineImage("Cetirizine 10mg"),
        rating: 4.5,
        reviews: 1200
    },
    {
        name: "Loratadine 10mg",
        category: "Tablet",
        description: "Non-drowsy antihistamine for seasonal allergies and hay fever.",
        price: 28,
        stock: 550,
        manufacturer: "Cipla",
        requiresPrescription: false,
        image: getMedicineImage("Loratadine 10mg"),
        rating: 4.7,
        reviews: 920
    },
    {
        name: "Phenylephrine 10mg",
        category: "Tablet",
        description: "Nasal decongestant for relief from stuffy nose and sinus congestion.",
        price: 32,
        stock: 400,
        manufacturer: "GSK",
        requiresPrescription: false,
        image: getMedicineImage("Phenylephrine 10mg"),
        rating: 4.4,
        reviews: 580
    },
    // Diabetes
    {
        name: "Metformin 500mg",
        category: "Tablet",
        description: "First-line medication for type 2 diabetes. Helps control blood sugar levels.",
        price: 55,
        stock: 400,
        manufacturer: "Cipla",
        requiresPrescription: true,
        image: getMedicineImage("Metformin 500mg"),
        rating: 4.8,
        reviews: 650
    },
    {
        name: "Glipizide 5mg",
        category: "Tablet",
        description: "Oral medication to lower blood sugar in type 2 diabetes patients.",
        price: 65,
        stock: 300,
        manufacturer: "Sun Pharma",
        requiresPrescription: true,
        image: getMedicineImage("Glipizide 5mg"),
        rating: 4.6,
        reviews: 420
    },
    // Hypertension
    {
        name: "Amlodipine 5mg",
        category: "Tablet",
        description: "Calcium channel blocker for high blood pressure and chest pain (angina).",
        price: 75,
        stock: 350,
        manufacturer: "Cipla",
        requiresPrescription: true,
        image: getMedicineImage("Amlodipine 5mg"),
        rating: 4.7,
        reviews: 520
    },
    {
        name: "Losartan 50mg",
        category: "Tablet",
        description: "ARB medication for hypertension and kidney protection in diabetic patients.",
        price: 85,
        stock: 320,
        manufacturer: "Dr. Reddy's",
        requiresPrescription: true,
        image: getMedicineImage("Losartan 50mg"),
        rating: 4.6,
        reviews: 480
    },
    // Supplements
    {
        name: "Vitamin C 1000mg",
        category: "Supplement",
        description: "High-potency immunity booster and antioxidant supplement. Supports collagen production.",
        price: 350,
        stock: 100,
        manufacturer: "Nature's Bounty",
        requiresPrescription: false,
        image: getMedicineImage("Vitamin C 1000mg"),
        rating: 4.9,
        reviews: 1850
    },
    {
        name: "Multivitamin Complex",
        category: "Supplement",
        description: "Daily nutritional support with essential vitamins and minerals for overall health.",
        price: 550,
        stock: 80,
        manufacturer: "HealthKart",
        requiresPrescription: false,
        image: getMedicineImage("Multivitamin Complex"),
        rating: 4.9,
        reviews: 2100
    },
    {
        name: "Vitamin D3 60000 IU",
        category: "Supplement",
        description: "Bone health support and immune system booster. Essential for calcium absorption.",
        price: 280,
        stock: 120,
        manufacturer: "Sun Pharma",
        requiresPrescription: false,
        image: getMedicineImage("Vitamin D3 60000 IU"),
        rating: 4.8,
        reviews: 1450
    },
    {
        name: "Calcium + Vitamin D",
        category: "Supplement",
        description: "Bone strengthening supplement for osteoporosis prevention and bone health.",
        price: 320,
        stock: 90,
        manufacturer: "Cipla",
        requiresPrescription: false,
        image: getMedicineImage("Calcium + Vitamin D"),
        rating: 4.7,
        reviews: 980
    },
    {
        name: "Iron + Folic Acid",
        category: "Supplement",
        description: "Essential for anemia treatment and prevention. Supports red blood cell production.",
        price: 180,
        stock: 200,
        manufacturer: "Abbott",
        requiresPrescription: false,
        image: getMedicineImage("Iron + Folic Acid"),
        rating: 4.6,
        reviews: 720
    },
    {
        name: "Omega-3 Fish Oil",
        category: "Supplement",
        description: "Heart health support, brain function, and anti-inflammatory benefits.",
        price: 450,
        stock: 110,
        manufacturer: "Nature's Bounty",
        requiresPrescription: false,
        image: getMedicineImage("Omega-3 Fish Oil"),
        rating: 4.8,
        reviews: 1650
    },
    // Digestive Health
    {
        name: "Omeprazole 20mg",
        category: "Capsule",
        description: "Proton pump inhibitor for acid reflux, GERD, and stomach ulcers.",
        price: 95,
        stock: 280,
        manufacturer: "Sun Pharma",
        requiresPrescription: false,
        image: getMedicineImage("Omeprazole 20mg"),
        rating: 4.7,
        reviews: 890
    },
    {
        name: "Domperidone 10mg",
        category: "Tablet",
        description: "Anti-nausea medication for vomiting, indigestion, and gastric issues.",
        price: 42,
        stock: 350,
        manufacturer: "Cipla",
        requiresPrescription: false,
        image: getMedicineImage("Domperidone 10mg"),
        rating: 4.5,
        reviews: 560
    },
    {
        name: "Lactulose Syrup",
        category: "Syrup",
        description: "Laxative for constipation relief and liver health support.",
        price: 125,
        stock: 180,
        manufacturer: "Abbott",
        requiresPrescription: false,
        image: getMedicineImage("Lactulose Syrup"),
        rating: 4.4,
        reviews: 340
    },
    // Skin Care
    {
        name: "Hydrocortisone Cream 1%",
        category: "Cream",
        description: "Topical steroid for skin inflammation, rashes, and itching relief.",
        price: 65,
        stock: 220,
        manufacturer: "GSK",
        requiresPrescription: false,
        image: getMedicineImage("Hydrocortisone Cream 1%"),
        rating: 4.6,
        reviews: 480
    },
    {
        name: "Benzoyl Peroxide Gel 5%",
        category: "Gel",
        description: "Acne treatment gel for pimples, blackheads, and oily skin.",
        price: 85,
        stock: 190,
        manufacturer: "Cipla",
        requiresPrescription: false,
        image: getMedicineImage("Benzoyl Peroxide Gel 5%"),
        rating: 4.5,
        reviews: 620
    },
    // Asthma & Respiratory
    {
        name: "Salbutamol Inhaler",
        category: "Inhaler",
        description: "Quick-relief bronchodilator for asthma attacks and breathing difficulties.",
        price: 180,
        stock: 150,
        manufacturer: "Cipla",
        requiresPrescription: true,
        image: getMedicineImage("Salbutamol Inhaler"),
        rating: 4.8,
        reviews: 420
    },
    {
        name: "Montelukast 10mg",
        category: "Tablet",
        description: "Leukotriene receptor antagonist for asthma and allergy prevention.",
        price: 95,
        stock: 200,
        manufacturer: "Sun Pharma",
        requiresPrescription: true,
        image: getMedicineImage("Montelukast 10mg"),
        rating: 4.6,
        reviews: 380
    }
];

async function seedMedicines() {
    let esClient = null;

    try {
        console.log('🌱 Seeding medicines...');
        await connectMongoDB();
        const db = getDB();
        const collection = db.collection('medicines');

        // Connect ES
        try {
            esClient = await connectElasticSearch();
        } catch (e) {
            console.warn('ES not available, skipping index');
        }

        for (const med of medicines) {
            const exists = await collection.findOne({ name: med.name });
            let medicineId;

            if (exists) {
                console.log(`Medicine ${med.name} already exists. Updating image...`);
                medicineId = exists.id;
                
                // Update image if it exists
                await collection.updateOne(
                    { id: medicineId },
                    { 
                        $set: { 
                            image: med.image,
                            reviews: med.reviews || exists.reviews || 0,
                            updatedAt: new Date().toISOString()
                        } 
                    }
                );
            } else {
                medicineId = `med_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const newMed = {
                    ...med,
                    id: medicineId,
                    reviews: med.reviews || 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                await collection.insertOne(newMed);
                console.log(`Created medicine: ${med.name}`);
            }

            // Index to ES
            if (esClient) {
                await indexDocument('medicines', medicineId, {
                    name: med.name,
                    category: med.category,
                    description: med.description,
                    manufacturer: med.manufacturer
                });
            }
        }

        console.log('✅ Medicines seeded and indexed successfully');
    } catch (error) {
        console.error('Seeding error:', error);
    } finally {
        await closeMongoDB();
        if (esClient) {
            // await esClient.close(); // Wrapper might not expose close directly or it closes on exit
        }
        process.exit(0);
    }
}

seedMedicines();
