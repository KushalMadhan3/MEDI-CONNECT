import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDB } from '../config/mongodb.js';
import { getChannel } from '../config/rabbitmq.js';
import { 
  sendAdminNotification, 
  sendUserWelcomeEmail, 
  sendAdminLoginNotification,
  sendFirstLoginWelcomeEmail,
  sendRoleBasedLoginEmail
} from './emailService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Generate unique user ID
function generateUserId() {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Hash password
export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export function generateToken(userId, email, role) {
  return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '7d' });
}

// Store user in MongoDB
async function storeUserInMongoDB(userData) {
  const db = getDB();
  const usersCollection = db.collection('users');
  
  // Insert user document
  await usersCollection.insertOne(userData);
  
  // If doctor, also add to pending_doctors collection
  if (userData.role === 'doctor' && userData.status === 'pending_approval') {
    const pendingCollection = db.collection('pending_doctors');
    await pendingCollection.insertOne({
      doctorId: userData.id,
      email: userData.email,
      name: userData.name,
      mobile: userData.mobile,
      gender: userData.gender,
      createdAt: userData.createdAt
    });

    // Notify Admin - New Doctor Signup
    const { createNotification } = await import('../models/notificationModel.js');
    await createNotification({
      userId: 'admin',
      userRole: 'admin',
      type: 'doctor',
      title: 'New Doctor Signup Pending Verification',
      message: `New doctor registration: ${userData.name} (${userData.email}) is pending approval.`,
      relatedId: userData.id
    });
  }
  
  return userData.id;
}

// Get user from MongoDB by email
export async function getUserByEmail(email) {
  const db = getDB();
  const usersCollection = db.collection('users');
  return await usersCollection.findOne({ email });
}

// Get user from MongoDB by ID
export async function getUserById(userId) {
  const db = getDB();
  const usersCollection = db.collection('users');
  return await usersCollection.findOne({ id: userId });
}

// Check if email exists
export async function emailExists(email) {
  const db = getDB();
  const usersCollection = db.collection('users');
  const count = await usersCollection.countDocuments({ email });
  return count > 0;
}

// Signup new user
export async function signupUser(userData) {
  const { name, email, password, role, mobile, gender } = userData;
  
  // Check if email already exists
  if (await emailExists(email)) {
    throw new Error('Email already registered');
  }
  
  // Hash password
  const hashedPassword = await hashPassword(password);
  
  // Determine status based on role
  let status = 'active';
  if (role === 'doctor') {
    status = 'pending_approval';
  }
  
  // Create user object
  const userId = generateUserId();
  const user = {
    id: userId,
    name,
    email,
    password: hashedPassword,
    role,
    mobile: mobile || null,
    gender: gender || null,
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Store in MongoDB
  await storeUserInMongoDB(user);
  
  // Publish to RabbitMQ for email notifications (optional - won't break if unavailable)
  try {
    const channel = getChannel();
    if (channel) {
      const eventData = {
        type: 'signup',
        userId,
        name,
        email,
        role,
        mobile,
        gender,
        status,
        timestamp: new Date().toISOString()
      };
      
      // Publish to user_events exchange
      channel.publish(
        'user_events',
        `signup.${role}`,
        Buffer.from(JSON.stringify(eventData)),
        { persistent: true }
      );
      
      // If doctor, also publish to doctor_events
      if (role === 'doctor') {
        channel.publish(
          'doctor_events',
          'doctor.signup',
          Buffer.from(JSON.stringify(eventData)),
          { persistent: true }
        );
      }
      
      console.log(`📨 Signup event published to RabbitMQ for ${email} (${role})`);
    }
  } catch (error) {
    // RabbitMQ is optional - log but don't fail the signup
    console.warn('⚠️  Failed to publish signup event to RabbitMQ:', error.message);
  }
  
  // Welcome email will be sent via RabbitMQ worker (no need to send directly here)
  // The emailWorker will consume the signup event and send role-based welcome email
  
  return {
    userId,
    email,
    name,
    role,
    status,
    token: status === 'active' ? generateToken(userId, email, role) : null
  };
}

// Login user
export async function loginUser(email, password, role) {
  // Get user from MongoDB
  const user = await getUserByEmail(email);
  
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Optional: Send login notification
  try {
    const { createNotification } = await import('../models/notificationModel.js');
    await createNotification({
      userId: user.id,
      userRole: role,
      type: 'system',
      title: 'Login Notification',
      message: `You logged in to your account at ${new Date().toLocaleString('en-US')}.`,
      relatedId: null
    });
  } catch (notifError) {
    // Don't fail login if notification fails
    console.warn('Failed to send login notification:', notifError.message);
  }
  
  // Check role matches
  if (user.role !== role) {
    throw new Error(`Invalid role. Expected ${user.role}`);
  }
  
  // Verify password
  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }
  
  // Check doctor approval status
  if (user.role === 'doctor') {
    if (user.status === 'pending_approval') {
      throw new Error('DOCTOR_PENDING_APPROVAL');
    }
    if (user.status === 'rejected') {
      throw new Error('DOCTOR_REJECTED');
    }
  }
  
  // Check if this is the first login (no lastLoginAt field or it's null)
  const isFirstLogin = !user.lastLoginAt;
  const now = new Date().toISOString();
  
  // Update lastLoginAt in database
  const db = getDB();
  const usersCollection = db.collection('users');
  await usersCollection.updateOne(
    { id: user.id },
    { 
      $set: { 
        lastLoginAt: now,
        updatedAt: now
      } 
    }
  );
  
  // Helper to send login email directly (fallback when RabbitMQ is unavailable)
  const sendDirectLoginEmail = async () => {
    try {
      if (isFirstLogin) {
        await sendFirstLoginWelcomeEmail(user.email, user.name, user.role, now);
      } else {
        await sendRoleBasedLoginEmail(user.email, user.name, user.role, now);
      }
      console.log(`📧 Login email sent directly to ${user.email}`);
    } catch (error) {
      console.error('❌ Login email send error:', error);
    }
  };
  
  // Publish login event to RabbitMQ for both user and admin notifications (optional)
  let loginEventPublished = false;
  
  try {
    const channel = getChannel();
    if (channel) {
      const eventData = {
        type: 'login',
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isFirstLogin,
        timestamp: now
      };
      
      channel.publish(
        'user_events',
        `login.${role}`,
        Buffer.from(JSON.stringify(eventData)),
        { persistent: true }
      );
      
      loginEventPublished = true;
      console.log(`📨 Login event published to RabbitMQ for ${user.email} (${user.role}) - First Login: ${isFirstLogin}`);
    }
  } catch (error) {
    // RabbitMQ is optional - log but don't fail the login
    console.warn('⚠️  Failed to publish login event to RabbitMQ:', error.message);
  }
  
  // Fallback when RabbitMQ is unavailable
  if (!loginEventPublished) {
    console.warn('⚠️  RabbitMQ channel not available. Sending login email directly.');
    await sendDirectLoginEmail();
    
    // Also notify admin directly
  sendAdminLoginNotification({
    name: user.name,
    email: user.email,
    role: user.role,
      timestamp: now
  }).catch(console.error);
  }
  
  // Generate token
  const token = generateToken(user.id, user.email, user.role);
  
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    token
  };
}

// Approve doctor
export async function approveDoctor(doctorId) {
  const db = getDB();
  const usersCollection = db.collection('users');
  const pendingCollection = db.collection('pending_doctors');
  
  const user = await getUserById(doctorId);
  
  if (!user) {
    throw new Error('Doctor not found');
  }
  
  if (user.role !== 'doctor') {
    throw new Error('User is not a doctor');
  }
  
  // Update user status in MongoDB
  await usersCollection.updateOne(
    { id: doctorId },
    { 
      $set: { 
        status: 'active', 
        updatedAt: new Date().toISOString() 
      } 
    }
  );
  
  // Remove from pending doctors collection
  await pendingCollection.deleteOne({ doctorId });
  
  // Publish approval event (optional - won't break if RabbitMQ unavailable)
  try {
    const channel = getChannel();
    if (channel) {
      channel.publish(
        'doctor_events',
        'doctor.approved',
        Buffer.from(JSON.stringify({
          doctorId,
          email: user.email,
          name: user.name,
          timestamp: new Date().toISOString()
        })),
        { persistent: true }
      );
      console.log(`📨 Doctor approval event published to RabbitMQ for ${user.email}`);
    }
  } catch (error) {
    // RabbitMQ is optional - log but don't fail the approval
    console.warn('⚠️  Failed to publish doctor approval event to RabbitMQ:', error.message);
  }
  
  return { success: true, doctorId, email: user.email };
}

// Get pending doctors
export async function getPendingDoctors() {
  const db = getDB();
  const pendingCollection = db.collection('pending_doctors');
  const usersCollection = db.collection('users');
  
  // Get all pending doctors
  const pendingList = await pendingCollection.find({}).toArray();
  const doctors = [];
  
  for (const pending of pendingList) {
    const doctor = await usersCollection.findOne({ id: pending.doctorId });
    if (doctor && doctor.status === 'pending_approval') {
      doctors.push({
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        mobile: doctor.mobile,
        gender: doctor.gender,
        createdAt: doctor.createdAt
      });
    }
  }
  
  return doctors;
}
