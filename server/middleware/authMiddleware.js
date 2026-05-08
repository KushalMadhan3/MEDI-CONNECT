import jwt from 'jsonwebtoken';
import { getDB } from '../config/mongodb.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Verify JWT token and extract user info
export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from MongoDB to verify they still exist
    const db = getDB();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ id: decoded.userId });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Attach user info to request
    req.user = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
}

// Check if user has required role
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    // Check if doctor is approved (if doctor role)
    if (req.user.role === 'doctor' && req.user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Doctor account pending approval'
      });
    }

    next();
  };
}

// Admin-only middleware
export const requireAdmin = [authenticateToken, requireRole('admin')];















