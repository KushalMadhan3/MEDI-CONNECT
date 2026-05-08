# Image Replacement Guide

This guide explains how to replace placeholder images with your own images for doctors and medicines.

## Folder Structure

Place your images in the following directories:

```
public/
├── assets/
│   ├── doctors/          # Doctor profile images
│   │   ├── doctor_1.png
│   │   ├── doctor_2.png
│   │   └── ...
│   └── medicines/        # Medicine product images
│       ├── medicine_1.png
│       ├── medicine_2.png
│       └── ...
```

## Image Naming Convention

### For Doctors:
- Name your images as: `doctor_1.png`, `doctor_2.png`, etc.
- Or use specific names: `doctor_cardiologist.png`, `doctor_dermatologist.png`
- Supported formats: `.png`, `.jpg`, `.jpeg`, `.webp`

### For Medicines:
- Name your images as: `medicine_1.png`, `medicine_2.png`, etc.
- Or use medicine names: `paracetamol.png`, `ibuprofen.png`
- Supported formats: `.png`, `.jpg`, `.jpeg`, `.webp`

## How to Update Images

### Option 1: Automatic Update (Recommended)
Run the update script after placing your images:

```bash
cd medi-connect-3/medi-connect/server
node scripts/updateImages.js
```

This script will:
- Scan the `public/assets/doctors/` and `public/assets/medicines/` folders
- Update the database with local image paths
- Map images to doctors/medicines automatically

### Option 2: Manual Update via Database
1. Place your images in the appropriate folders
2. Update the database directly:
   - For doctors: Update the `image` field in the `users` collection
   - For medicines: Update the `image` field in the `medicines` collection
3. Use paths like: `/assets/doctors/doctor_1.png` or `/assets/medicines/paracetamol.png`

### Option 3: Update Seed Scripts
Edit the seed scripts to use your local images:
- `server/scripts/seedDoctors.js` - Update the `image` field for each doctor
- `server/scripts/seedMedicines.js` - Update the `image` field for each medicine

## Image Path Format

When referencing images in the database, use one of these formats:

1. **Relative path** (recommended): `/assets/doctors/doctor_1.png`
2. **Full URL**: `http://localhost:3001/assets/doctors/doctor_1.png`
3. **Absolute path**: Not recommended for web applications

## Example

If you have a doctor image named `doctor_priya_sharma.png`:
1. Place it in: `public/assets/doctors/doctor_priya_sharma.png`
2. Update the database: Set `image: "/assets/doctors/doctor_priya_sharma.png"`

## Notes

- Images in the `public` folder are served statically by the web server
- Make sure image file names don't contain spaces (use underscores or hyphens)
- Recommended image size: 400x400px or larger (square aspect ratio works best)
- The app will automatically fallback to placeholder images if local images are not found








