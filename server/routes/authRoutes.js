import express from 'express';
import { signupUser, loginUser, approveDoctor, getPendingDoctors } from '../services/authService.js';

const router = express.Router();

// Signup endpoint
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, mobile, gender } = req.body;
    
    if (!name || !email || !password || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: name, email, password, role' 
      });
    }
    
    const result = await signupUser({ name, email, password, role, mobile, gender });
    
    res.status(201).json({
      success: true,
      message: role === 'doctor' 
        ? 'Account created. Awaiting admin approval.'
        : 'Account created successfully.',
      data: result
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Signup failed'
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, password, role'
      });
    }
    
    const result = await loginUser(email, password, role);
    
    res.json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    console.error('Login error:', error);
    
    if (error.message === 'DOCTOR_PENDING_APPROVAL') {
      return res.status(403).json({
        success: false,
        code: 'DOCTOR_PENDING_APPROVAL',
        message: 'Your doctor account is awaiting admin approval. You will receive an email once approved.'
      });
    }
    
    if (error.message === 'DOCTOR_REJECTED') {
      return res.status(403).json({
        success: false,
        code: 'DOCTOR_REJECTED',
        message: 'Your doctor account was not approved. Please contact support.'
      });
    }
    
    res.status(401).json({
      success: false,
      message: error.message || 'Login failed'
    });
  }
});

// Get pending doctors (admin only)
router.get('/pending-doctors', async (req, res) => {
  try {
    const doctors = await getPendingDoctors();
    res.json({
      success: true,
      data: doctors
    });
  } catch (error) {
    console.error('Get pending doctors error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch pending doctors'
    });
  }
});

// Approve doctor (admin only)
router.post('/approve-doctor', async (req, res) => {
  try {
    const { doctorId } = req.body;
    
    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID is required'
      });
    }
    
    const result = await approveDoctor(doctorId);
    
    res.json({
      success: true,
      message: 'Doctor approved successfully',
      data: result
    });
  } catch (error) {
    console.error('Approve doctor error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to approve doctor'
    });
  }
});

// Forgot password endpoint
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, role } = req.body;
    
    if (!email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email and role are required'
      });
    }

    const { getDB } = await import('../config/mongodb.js');
    const db = getDB();
    const usersCollection = db.collection('users');

    // Find user by email and role
    const user = await usersCollection.findOne({ 
      email: email.toLowerCase().trim(),
      role: role
    });

    if (!user) {
      // Don't reveal if user exists for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate a simple reset token (in production, use crypto.randomBytes)
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Token expires in 1 hour

    // Store reset token in user document
    await usersCollection.updateOne(
      { id: user.id },
      {
        $set: {
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetTokenExpiry.toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    );

    // In production, send email with reset link
    // For now, we'll just return success
    // TODO: Implement email service to send reset link
    
    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
      // In development, return token for testing (remove in production)
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    });
  }
});

// Reset password endpoint
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword, email, role } = req.body;
    
    if (!token || !newPassword || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Token, new password, email, and role are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const { getDB } = await import('../config/mongodb.js');
    const db = getDB();
    const usersCollection = db.collection('users');

    // Find user by email, role, and valid token
    const user = await usersCollection.findOne({
      email: email.toLowerCase().trim(),
      role: role,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date().toISOString() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const { hashPassword } = await import('../services/authService.js');
    const hashedPassword = await hashPassword(newPassword);

    // Update password and clear reset token
    await usersCollection.updateOne(
      { id: user.id },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date().toISOString()
        },
        $unset: {
          resetPasswordToken: '',
          resetPasswordExpires: ''
        }
      }
    );

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

export default router;















