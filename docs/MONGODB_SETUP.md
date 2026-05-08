# MongoDB Setup Guide for Medi-Connect

MongoDB has replaced Redis for user data storage. This guide will help you set up MongoDB.

## Why MongoDB?

✅ **Persistent storage** - Data survives server restarts  
✅ **Better for complex queries** - Can query by any field  
✅ **Scalable** - Easy to scale horizontally  
✅ **Free cloud option** - MongoDB Atlas free tier (512MB)  
✅ **Better for production** - More features than Redis  
✅ **No Docker needed** - Can install locally or use cloud  

## Option 1: MongoDB Atlas (Cloud - Recommended for Quick Start)

**Best for:** Quick setup, no local installation needed, free tier available

### Steps:

1. **Sign up for MongoDB Atlas**
   - Go to: https://www.mongodb.com/cloud/atlas
   - Click "Try Free" and create an account

2. **Create a Free Cluster**
   - Choose "M0" (Free tier - 512MB)
   - Select a cloud provider and region (closest to you)
   - Click "Create Cluster" (takes 3-5 minutes)

3. **Create Database User**
   - Go to "Database Access" → "Add New Database User"
   - Choose "Password" authentication
   - Username: `mediconnect` (or your choice)
   - Password: Generate a strong password (save it!)
   - Database User Privileges: "Atlas admin" or "Read and write to any database"
   - Click "Add User"

4. **Whitelist Your IP**
   - Go to "Network Access" → "Add IP Address"
   - Click "Allow Access from Anywhere" (for development)
   - Or add your specific IP address
   - Click "Confirm"

5. **Get Connection String**
   - Go to "Database" → "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Replace `<dbname>` with `mediconnect`

6. **Add to .env file**
   ```env
   MONGODB_URI=mongodb+srv://mediconnect:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/mediconnect?retryWrites=true&w=majority
   ```

**Done!** Your MongoDB is ready to use.

---

## Option 2: Local MongoDB Installation

**Best for:** Development, offline work, full control

### Windows Installation

1. **Download MongoDB Community Server**
   - Go to: https://www.mongodb.com/try/download/community
   - Select: Windows, MSI package
   - Click "Download"

2. **Run Installer**
   - Run the downloaded `.msi` file
   - Choose "Complete" installation
   - Check "Install MongoDB as a Service"
   - Check "Install MongoDB Compass" (GUI tool - optional but helpful)
   - Click "Install"

3. **Verify Installation**
   - MongoDB will start automatically as a Windows service
   - Open Command Prompt and test:
     ```powershell
     mongosh
     # Should connect to MongoDB shell
     # Type: exit to leave
     ```

4. **Add to .env file**
   ```env
   MONGODB_URI=mongodb://localhost:27017/mediconnect
   ```

### macOS Installation

```bash
# Install using Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Verify
mongosh
```

### Linux Installation

```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
mongosh
```

---

## Verify MongoDB Connection

### Test Connection

```bash
# Using MongoDB Shell (mongosh)
mongosh "mongodb://localhost:27017/mediconnect"

# Or if using Atlas:
mongosh "mongodb+srv://username:password@cluster.mongodb.net/mediconnect"
```

### Test from Node.js

```javascript
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

try {
  await client.connect();
  console.log('✅ Connected to MongoDB');
  const db = client.db();
  const collections = await db.listCollections().toArray();
  console.log('Collections:', collections);
} catch (error) {
  console.error('❌ MongoDB connection error:', error);
} finally {
  await client.close();
}
```

---

## MongoDB Collections Created

The application will automatically create these collections:

1. **`users`** - All user accounts (patients, doctors, admins, pharmacy)
   - Indexed by: `email` (unique), `id` (unique), `role`

2. **`pending_doctors`** - Doctors awaiting admin approval
   - Contains: `doctorId`, `email`, `name`, `mobile`, `gender`, `createdAt`

---

## MongoDB vs Redis Comparison

| Feature | Redis | MongoDB |
|---------|-------|---------|
| **Type** | In-memory key-value store | Document database |
| **Persistence** | Optional (can lose data) | Always persistent |
| **Queries** | Key-based only | Flexible queries |
| **Scalability** | Vertical scaling | Horizontal scaling |
| **Cloud Option** | Paid services | Free Atlas tier |
| **Best For** | Caching, sessions | User data, documents |

---

## Troubleshooting

### Connection Refused Error

**Local MongoDB:**
```powershell
# Check if MongoDB service is running (Windows)
Get-Service MongoDB

# Start MongoDB service
net start MongoDB

# Or restart
Restart-Service MongoDB
```

**MongoDB Atlas:**
- Check IP whitelist in Network Access
- Verify username/password in connection string
- Check cluster is running (not paused)

### Authentication Failed

- Verify username and password in connection string
- Check database user has correct privileges
- For Atlas: Ensure IP is whitelisted

### Port Already in Use

```powershell
# Find process using port 27017
netstat -ano | findstr :27017

# Kill process (replace PID)
taskkill /PID <PID> /F
```

---

## MongoDB Compass (GUI Tool)

MongoDB Compass is a visual tool to view and manage your data:

1. **Download:** https://www.mongodb.com/try/download/compass
2. **Connect:**
   - Local: `mongodb://localhost:27017`
   - Atlas: Use connection string from Atlas dashboard
3. **Browse collections, documents, and run queries**

---

## Production Recommendations

1. **Use MongoDB Atlas** for production (managed service)
2. **Enable authentication** (already done in Atlas)
3. **Set up backups** (Atlas provides automatic backups)
4. **Monitor performance** using Atlas metrics
5. **Use connection pooling** (already handled in code)
6. **Add indexes** for frequently queried fields (already done for email, id, role)

---

## Next Steps

1. ✅ Install MongoDB (local or Atlas)
2. ✅ Add `MONGODB_URI` to your `.env` file
3. ✅ Start your server: `npm run server`
4. ✅ Verify connection in server logs
5. ✅ Test signup/login functionality

---

## Support

- **MongoDB Documentation:** https://docs.mongodb.com/
- **Atlas Documentation:** https://docs.atlas.mongodb.com/
- **Community Forum:** https://developer.mongodb.com/community/forums/















