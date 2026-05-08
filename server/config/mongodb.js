import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

// Connection URI and options
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mediconnect';
const DB_NAME = process.env.MONGODB_DB_NAME || 'mediconnect';

// Connection options with connection pooling
const mongoOptions = {
  maxPoolSize: 10, // Maximum number of connections in the connection pool
  serverSelectionTimeoutMS: 5000, // Time to wait for server selection
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4 // Use IPv4, skip trying IPv6
};

let client = null;
let db = null;
let isConnecting = false;
let connectionPromise = null;

/**
 * Establishes a connection to MongoDB with retry logic
 */
const connectWithRetry = async (retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = new MongoClient(MONGODB_URI, mongoOptions);
      await client.connect();
      console.log('✅ MongoDB connected successfully');
      return client;
    } catch (error) {
      console.warn(`⚠️ MongoDB connection attempt ${i + 1} failed:`, error.message);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw new Error(`Failed to connect to MongoDB after ${retries} attempts: ${error.message}`);
      }
    }
  }
};

/**
 * Connects to MongoDB and returns the database instance
 */
export async function connectMongoDB() {
  // If already connected, return the existing connection
  if (db) return { success: true, client, db };
  
  // If connection is in progress, return the existing promise
  if (isConnecting) return connectionPromise;
  
  try {
    isConnecting = true;
    connectionPromise = (async () => {
      try {
        // Connect to MongoDB with retry logic
        client = await connectWithRetry();
        db = client.db(DB_NAME);
        
        // Create indexes for better performance
        const usersCollection = db.collection('users');
        await Promise.all([
          usersCollection.createIndex({ email: 1 }, { unique: true, background: true }),
          usersCollection.createIndex({ id: 1 }, { unique: true, background: true }),
          usersCollection.createIndex({ role: 1 }, { background: true })
        ]);
        
        console.log('✅ MongoDB indexes created/verified');
        return { success: true, client, db };
      } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        await closeMongoDB();
        throw error;
      } finally {
        isConnecting = false;
        connectionPromise = null;
      }
    })();
    
    return await connectionPromise;
  } catch (error) {
    return { success: false, error };
  }
}

export function getDB() {
  if (!db) {
    throw new Error('MongoDB not connected. Call connectMongoDB() first.');
  }
  return db;
}

export async function closeMongoDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

export default { connectMongoDB, getDB, closeMongoDB };















