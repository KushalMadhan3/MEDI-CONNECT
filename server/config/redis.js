import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  // Don't log connection errors here, handle in connectRedis()
  if (err.code !== 'ECONNREFUSED') {
    console.error('Redis Client Error', err);
  }
});

// Connect function
export async function connectRedis() {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    return { success: true, client: redisClient };
  } catch (error) {
    // Return error instead of throwing
    return { success: false, error };
  }
}

export default redisClient;

