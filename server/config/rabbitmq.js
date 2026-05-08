import amqp from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

let connection = null;
let channel = null;

export async function connectRabbitMQ() {
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    connection = await amqp.connect(url);
    channel = await connection.createChannel();
    
    // Declare exchanges
    await channel.assertExchange('user_events', 'topic', { durable: true });
    await channel.assertExchange('doctor_events', 'topic', { durable: true });
    await channel.assertExchange('appointment_events', 'topic', { durable: true });
    
    console.log('✅ RabbitMQ connected');
    return { success: true, connection, channel };
  } catch (error) {
    // Return error instead of throwing
    return { success: false, error };
  }
}

export function getChannel() {
  if (!channel) {
    console.warn('⚠️  RabbitMQ channel not initialized. Messages will not be sent.');
    return null;
  }
  
  // Check if channel is still open
  try {
    if (channel.connection && channel.connection.readyState !== 'open') {
      console.warn('⚠️  RabbitMQ channel connection is closed. Messages will not be sent.');
      return null;
    }
  } catch (error) {
    console.warn('⚠️  RabbitMQ channel check failed:', error.message);
    return null;
  }
  
  return channel;
}

export async function closeRabbitMQ() {
  if (channel) await channel.close();
  if (connection) await connection.close();
}

