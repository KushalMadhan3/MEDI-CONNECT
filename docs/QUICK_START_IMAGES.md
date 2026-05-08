# Quick Start: Replace Images

## Step 1: Place Your Images

### For Doctors:
1. Copy your doctor images to: `public/assets/doctors/`
2. Name them: `doctor_1.png`, `doctor_2.png`, etc. (or any name you prefer)

### For Medicines:
1. Copy your medicine images to: `public/assets/medicines/`
2. Name them: `medicine_1.png`, `medicine_2.png`, etc. (or use medicine names like `paracetamol.png`)

## Step 2: Update the Database

Run this command from the project root:

```bash
cd medi-connect-3/medi-connect/server
node scripts/updateImages.js
```

This will:
- Scan your image folders
- Update the database with local image paths
- Map images to doctors/medicines automatically

## Step 3: Restart Your Server

Restart your development server to see the changes:

```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm run dev  # or your start command
```

## That's It! 🎉

Your images should now appear in the app instead of placeholders.

## Troubleshooting

**Images not showing?**
- Check that images are in the correct folders
- Verify image file names don't have spaces
- Make sure the server is running
- Check browser console for 404 errors

**Want to update specific images?**
- Edit the database directly, or
- Update the seed scripts in `server/scripts/`

## Need More Help?

See the full guide: `docs/IMAGE_REPLACEMENT_GUIDE.md`








