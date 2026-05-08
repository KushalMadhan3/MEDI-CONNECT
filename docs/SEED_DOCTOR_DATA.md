# How to Seed Doctor Dashboard Data

The doctor dashboard needs sample data to display properly. Follow these steps:

## Step 1: Get Your Doctor ID

1. Login as a doctor in your application
2. Open browser console (F12)
3. Run: `JSON.parse(localStorage.getItem('user')).userId`
4. Copy the doctor ID (e.g., `user_1234567890_abc123`)

OR

Check your MongoDB `users` collection:
```bash
# In MongoDB shell or Compass
db.users.find({ role: "doctor" })
```

## Step 2: Run the Seed Script

```bash
node server/scripts/seedDoctorData.js YOUR_DOCTOR_ID
```

Example:
```bash
node server/scripts/seedDoctorData.js user_1701234567890_abc123xyz
```

With optional doctor name and email:
```bash
node server/scripts/seedDoctorData.js user_1701234567890_abc123xyz "Dr. John Doe" "john@example.com"
```

## Step 3: Verify

1. Refresh your doctor dashboard
2. You should now see:
   - 4 appointments for today
   - Weekly appointment count
   - Monthly earnings
   - Dashboard statistics

## What the Script Creates

- **4 appointments for today** (different statuses: completed, scheduled, pending)
- **6 appointments for this week** (last 7 days)
- **20 completed appointments for this month** (for earnings calculation)

## Troubleshooting

### Error: "Failed to connect to MongoDB"
- Make sure MongoDB is running
- Check your `MONGODB_URI` in `.env` file

### Error: "Doctor ID is required"
- Make sure you're passing the doctor ID as an argument
- The ID should start with `user_`

### Still seeing zeros?
- Check browser console for API errors
- Verify the doctor ID matches your logged-in user
- Check MongoDB `appointments` collection has data with your `doctorId`

