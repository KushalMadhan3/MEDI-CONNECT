/**
 * Notification Service
 * Unified service for sending in-app and email notifications
 */

import { createNotification } from '../models/notificationModel.js';
import { sendEmail } from '../services/emailService.js';
import { getDB } from '../config/mongodb.js';

/**
 * Send notification to user (in-app + email)
 * @param {Object} options - Notification options
 * @param {string} options.toRole - Target role (patient, doctor, admin)
 * @param {string} options.userId - Target user ID
 * @param {string} options.message - Notification message
 * @param {string} options.title - Notification title
 * @param {string} options.type - Notification type
 * @param {string} options.relatedId - Related entity ID
 * @param {Object} options.metadata - Additional metadata
 */
export async function notify({ toRole, userId, message, title, type = 'info', relatedId = null, metadata = {} }) {
  try {
    // Get user email for email notification
    const db = getDB();
    const user = await db.collection('users').findOne({ id: userId });
    
    if (!user) {
      console.warn(`User not found for notification: ${userId}`);
      return;
    }

    // Create in-app notification
    await createNotification({
      userId,
      userRole: toRole,
      type,
      title: title || 'Notification',
      message,
      relatedId,
      metadata
    });

    // Send email notification (if email exists)
    if (user.email) {
      try {
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #3F53D9;">${title || 'Notification'}</h2>
            <p>${message}</p>
            ${metadata.appointmentDate ? `<p><strong>Date:</strong> ${metadata.appointmentDate}</p>` : ''}
            ${metadata.appointmentTime ? `<p><strong>Time:</strong> ${metadata.appointmentTime}</p>` : ''}
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">This is an automated notification from Medi-Connect.</p>
          </div>
        `;
        await sendEmail(
          user.email,
          title || 'Medi-Connect Notification',
          message,
          htmlContent
        );
      } catch (emailError) {
        console.warn('Failed to send email notification:', emailError.message);
        // Don't fail the whole operation if email fails
      }
    }

    console.log(`✅ Notification sent to ${toRole} ${userId}: ${title}`);
  } catch (error) {
    console.error('Notification service error:', error);
    throw error;
  }
}

/**
 * Notify multiple users
 * @param {Array} notifications - Array of notification options
 */
export async function notifyMultiple(notifications) {
  const results = await Promise.allSettled(
    notifications.map(n => notify(n))
  );
  
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length > 0) {
    console.warn(`Failed to send ${failed.length} notifications`);
  }
  
  return results;
}

