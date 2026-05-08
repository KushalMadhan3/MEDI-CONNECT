import { connectRabbitMQ, getChannel } from '../config/rabbitmq.js';
import { 
  sendAdminNotification, 
  sendUserWelcomeEmail, 
  sendRoleBasedWelcomeEmail,
  sendRoleBasedLoginEmail,
  sendFirstLoginWelcomeEmail,
  sendEmail,
  ADMIN_EMAIL 
} from '../services/emailService.js';

async function startEmailWorker() {
  try {
    const connectionResult = await connectRabbitMQ();
    const channel = getChannel();
    
    if (!channel) {
      console.error('❌ Email worker could not obtain RabbitMQ channel. Make sure RabbitMQ is running.');
      if (!connectionResult.success) {
        console.error('   → Error:', connectionResult.error?.message || 'Unknown error');
      }
      return;
    }
    
    // Queue for user notifications (signup/login events)
    const userQueue = 'user_notifications';
    await channel.assertQueue(userQueue, { durable: true });
    
    // Bind to user_events exchange for all signup/login events
    await channel.bindQueue(userQueue, 'user_events', 'signup.*');
    await channel.bindQueue(userQueue, 'user_events', 'login.*');
    
    // Queue for admin notifications
    const adminQueue = 'admin_notifications';
    await channel.assertQueue(adminQueue, { durable: true });
    
    // Bind to user_events for admin notifications (all signups and logins)
    await channel.bindQueue(adminQueue, 'user_events', 'signup.patient');
    await channel.bindQueue(adminQueue, 'user_events', 'signup.doctor');
    await channel.bindQueue(adminQueue, 'user_events', 'signup.admin');
    await channel.bindQueue(adminQueue, 'user_events', 'signup.pharmacy');
    await channel.bindQueue(adminQueue, 'user_events', 'login.patient');
    await channel.bindQueue(adminQueue, 'user_events', 'login.doctor');
    await channel.bindQueue(adminQueue, 'user_events', 'login.admin');
    await channel.bindQueue(adminQueue, 'user_events', 'login.pharmacy');
    
    // Queue for doctor-specific events
    const doctorQueue = 'doctor_notifications';
    await channel.assertQueue(doctorQueue, { durable: true });
    await channel.bindQueue(doctorQueue, 'doctor_events', 'doctor.signup');
    await channel.bindQueue(doctorQueue, 'doctor_events', 'doctor.approved');
    
    console.log('📧 Email worker started, waiting for messages...');
    
    // Consume user notifications - send role-based welcome/login emails
    channel.consume(userQueue, async (msg) => {
      if (!msg) return;
      
      try {
        const event = JSON.parse(msg.content.toString());
        const { type, email, name, role, timestamp, isFirstLogin } = event;
        
        console.log(`📧 Processing user ${type} event for ${email} (${role})`);
        
        if (type === 'signup') {
          // Send role-based welcome email on signup
          await sendRoleBasedWelcomeEmail(email, name, role);
          console.log(`✅ Welcome email sent to ${email} (${role})`);
        } else if (type === 'login') {
          // Check if this is the first login - send welcoming greeting message
          if (isFirstLogin) {
            await sendFirstLoginWelcomeEmail(email, name, role, timestamp || new Date().toISOString());
            console.log(`✅ First login welcome email sent to ${email} (${role}) - Greetings and Welcome!`);
          } else {
            // Send regular login notification for subsequent logins
            await sendRoleBasedLoginEmail(email, name, role, timestamp || new Date().toISOString());
            console.log(`✅ Login notification email sent to ${email} (${role})`);
          }
        }
        
        channel.ack(msg);
      } catch (error) {
        console.error('❌ Error processing user notification:', error);
        channel.nack(msg, false, true);
      }
    });
    
    // Consume admin notifications (send to company email)
    channel.consume(adminQueue, async (msg) => {
      if (!msg) return;
      
      try {
        const event = JSON.parse(msg.content.toString());
        const { type, name, email, role, mobile, gender, timestamp } = event;
        
        const subject = `New ${role} ${type === 'signup' ? 'Registration' : 'Login'} - Medi-Connect`;
        
        const text = `
New ${role} ${type === 'signup' ? 'Registration' : 'Login'} Notification

User Details:
- Name: ${name || 'N/A'}
- Email: ${email}
- Role: ${role.charAt(0).toUpperCase() + role.slice(1)}
${mobile ? `- Mobile: ${mobile}` : ''}
${gender ? `- Gender: ${gender.charAt(0).toUpperCase() + gender.slice(1)}` : ''}
- Time: ${new Date(timestamp).toLocaleString()}
- Date: ${new Date(timestamp).toLocaleDateString()}

${type === 'signup' && role === 'doctor' 
  ? '\n⚠️ ACTION REQUIRED: This doctor needs approval before they can access the system.\n   Please review and approve/reject their account from the Admin Dashboard.'
  : type === 'signup'
  ? '\n✅ New user has been registered and can now access the system.'
  : '\n📋 User has logged into the system.'
}

---
This is an automated notification from Medi-Connect Healthcare System.
        `.trim();
        
        const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3F53D9 0%, #7C74EB 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3F53D9; }
    .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>New ${role.charAt(0).toUpperCase() + role.slice(1)} ${type === 'signup' ? 'Registration' : 'Login'}</h2>
    </div>
    <div class="content">
      <div class="info-box">
        <strong>User Details:</strong><br>
        - Name: ${name || 'N/A'}<br>
        - Email: ${email}<br>
        - Role: ${role.charAt(0).toUpperCase() + role.slice(1)}<br>
        ${mobile ? `- Mobile: ${mobile}<br>` : ''}
        ${gender ? `- Gender: ${gender.charAt(0).toUpperCase() + gender.slice(1)}<br>` : ''}
        - Time: ${new Date(timestamp).toLocaleString()}<br>
        - Date: ${new Date(timestamp).toLocaleDateString()}
      </div>
      ${type === 'signup' && role === 'doctor' 
        ? '<div class="alert"><strong>⚠️ ACTION REQUIRED:</strong> This doctor needs approval before they can access the system.<br>Please review and approve/reject their account from the Admin Dashboard.</div>'
        : type === 'signup'
        ? '<p><strong>✅ New user has been registered and can now access the system.</strong></p>'
        : '<p><strong>📋 User has logged into the system.</strong></p>'
      }
    </div>
    <div class="footer">
      <p>This is an automated notification from Medi-Connect Healthcare System.</p>
    </div>
  </div>
</body>
</html>`;
        
        // Send email to admin/company email
        await sendEmail(ADMIN_EMAIL, subject, text, html);
        console.log(`📧 Company email notification sent for ${role} ${type}: ${email}`);
        
        channel.ack(msg);
      } catch (error) {
        console.error('Error processing admin notification:', error);
        channel.nack(msg, false, true);
      }
    });
    
    // Consume doctor-specific events
    channel.consume(doctorQueue, async (msg) => {
      if (!msg) return;
      
      try {
        const event = JSON.parse(msg.content.toString());
        
        if (event.type === 'signup' || event.type === 'doctor.signup') {
          // Additional doctor signup handling if needed
          console.log(`📧 Doctor signup event: ${event.email}`);
        } else if (event.type === 'doctor.approved') {
          // Send approval email to doctor
          const { email, name } = event;
          const subject = 'Your Medi-Connect Doctor Account Has Been Approved';
          const text = `Hi ${name},\n\nYour doctor account has been approved. You can now log in and access the system.\n\nBest regards,\nMedi-Connect Team`;
          
          await sendEmail(email, subject, text);
          console.log(`📧 Doctor approval email sent to ${email}`);
        }
        
        channel.ack(msg);
      } catch (error) {
        console.error('Error processing doctor notification:', error);
        channel.nack(msg, false, true);
      }
    });
    
  } catch (error) {
    console.error('Email worker error:', error);
    process.exit(1);
  }
}

// Start worker
startEmailWorker().catch(console.error);

