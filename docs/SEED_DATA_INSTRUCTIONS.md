# Seed Data Instructions

## How to Add Doctors and Medicines to Database

### Step 1: Seed Doctors
Run the following command to add doctors with images and details:

```bash
cd medi-connect-3
node server/scripts/seedDoctors.js
```

This will create **12 doctors** across 4 specializations:
- **Cardiology**: 3 doctors
- **Dermatology**: 3 doctors  
- **Orthopedics**: 3 doctors
- **General Medicine**: 4 doctors

**Default Password for all doctors**: `password123`

### Step 2: Seed Medicines
Run the following command to add medicines with images and details:

```bash
node server/scripts/seedMedicines.js
```

This will create **25+ medicines** across multiple categories:
- Pain & Fever Relief (4 medicines)
- Antibiotics (3 medicines)
- Cough & Cold (4 medicines)
- Diabetes (2 medicines)
- Hypertension (2 medicines)
- Supplements (6 medicines)
- Digestive Health (3 medicines)
- Skin Care (2 medicines)
- Asthma & Respiratory (2 medicines)

### Step 3: Verify Data
After seeding, you can:
1. Login as a doctor using any doctor email from the list
2. Browse medicines in the patient dashboard
3. Test appointment booking with real doctor data
4. Test medicine purchase with real medicine data

## Doctor Login Credentials

All doctors use the same password: `password123`

**Sample Doctor Emails:**
- `priya.sharma@mediconnect.com` (Cardiology)
- `vikram.singh@mediconnect.com` (Dermatology)
- `amit.verma@mediconnect.com` (Orthopedics)
- `sunita.desai@mediconnect.com` (General Medicine)

## Medicine Categories

Medicines are organized by:
- **Tablet**: Oral tablets and capsules
- **Syrup**: Liquid medications
- **Supplement**: Vitamins and nutritional supplements
- **Cream/Gel**: Topical applications
- **Inhaler**: Respiratory medications

## Image Sources

- **Doctors**: Using Dicebear API for consistent avatar generation
- **Medicines**: Using Unsplash for realistic medicine images

All images are loaded from external CDNs and will display properly in the application.

## Notes

- Running the seed scripts multiple times will update existing records (won't create duplicates)
- Medicines are automatically indexed to ElasticSearch if available
- All doctors are set to `status: 'active'` and ready for appointments
- All medicines have realistic stock levels and pricing


