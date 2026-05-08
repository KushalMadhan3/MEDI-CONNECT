import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

// Routes
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import marketplaceRoutes from './routes/marketplaceRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import imageRoutes from './routes/imageRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

// Config & Services
import { connectRabbitMQ } from './config/rabbitmq.js';
import { connectMongoDB } from './config/mongodb.js';
import { connectElasticSearch } from './services/searchService.js';
import { startNotificationWorker } from './workers/notificationWorker.js';
// import { startOCRWorker } from './workers/ocrWorker.js'; // Will be started via fork or directly if in same process
import { startReminderScheduler } from './services/appointmentReminderService.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Initialize environment variables
dotenv.config();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Logs
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      skip: (req, res) => res.statusCode < 400,
    })
  );
}

// Rate Limiting
app.use(
  '/api/',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000, // Increased to 2000 to prevent blocking during dev/demo
    message: 'Too many requests. Try again later.',
  })
  // Skip rate limit for local dev if needed, or increase for search
);

// Body parsing
app.use(express.json({ limit: '10mb' })); // Increased for image uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', async (req, res) => {
  try {
    const mongoResult = await connectMongoDB();
    let rabbitmqStatus = 'disconnected';

    try {
      const { getChannel } = await import('./config/rabbitmq.js');
      const channel = getChannel();
      if (channel) {
        rabbitmqStatus = 'connected';
      }
    } catch (err) {
      console.warn('⚠️ RabbitMQ not available:', err.message);
    }

    res.status(200).json({
      status: 'ok',
      environment: NODE_ENV,
      timestamp: new Date().toISOString(),
      services: {
        mongodb: mongoResult.success ? 'connected' : 'disconnected',
        rabbitmq: rabbitmqStatus,
      },
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: error.message,
      environment: NODE_ENV,
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/patient', patientRoutes);
console.log('✅ Patient routes registered at /api/patient');
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/store', storeRoutes);
console.log('Store routes registered');
app.use('/api/orders', orderRoutes);
console.log('✅ Order routes registered at /api/orders');
app.use('/api/upload', uploadRoutes);
app.use('/api/payment', paymentRoutes);
console.log('Payment routes registered');

// Serve uploads statically
app.use('/uploads', express.static(path.join(path.resolve(), 'uploads')));

// Serve public assets (images) statically
app.use('/assets', express.static(path.join(__dirname, '../../public/assets')));

// Production static
if (NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
  });
}

// 404
app.use(notFoundHandler);

// Errors
app.use(errorHandler);

// Start Server
async function startServer() {
  try {
    // 1. Connect MongoDB
    const mongoResult = await connectMongoDB();
    if (!mongoResult.success) throw new Error('MongoDB connection failed');

    // 2. Connect RabbitMQ (Optional but recommended)
    try {
      const rabbitmq = await connectRabbitMQ();
      if (rabbitmq.success && rabbitmq.connection) {
        console.log('✅ RabbitMQ connected');
        // Start Notification Worker
        startNotificationWorker();
      } else {
        console.warn('⚠️ RabbitMQ not available. Notifications will be limited.');
      }
    } catch (err) {
      console.warn('⚠️ RabbitMQ connection failed:', err.message);
    }

    // 3. Connect ElasticSearch (Optional)
    try {
      await connectElasticSearch();
    } catch (err) {
      console.warn('⚠️ ElasticSearch not available. Search will fallback to DB.');
    }

    // 4. Start Appointment Reminder Scheduler
    startReminderScheduler();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} (${NODE_ENV})`);
    });

    // Error Handlers
    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION:', err);
      // Don't exit process in dev for better DX
      if (NODE_ENV !== 'development') server.close(() => process.exit(1));
    });

    process.on('uncaughtException', (err) => {
      console.error('UNCAUGHT EXCEPTION:', err);
      // Don't exit process in dev
      if (NODE_ENV !== 'development') server.close(() => process.exit(1));
    });

    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down.');
      server.close();
    });

    return { server };
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, startServer };
