# Medi-Connect - Healthcare Management Platform

A comprehensive healthcare management system built with React, TypeScript, Node.js, and MongoDB. This platform enables patients to book appointments, manage medical records, purchase medicines, and interact with healthcare providers seamlessly.

## 🚀 Features

### 👤 Patient Portal

#### 📅 **Intelligent Appointment Management**
- **Seamless Booking System** - Browse doctors by specialization, view availability, and book appointments with real-time slot validation
- **Secure Payment Integration** - Multiple payment methods (UPI, Card, Net Banking) with instant confirmation and transaction tracking
- **Appointment Flexibility** - Reschedule or cancel appointments with automated notifications to all parties
- **Video Consultation Ready** - Join video calls directly from the dashboard 15 minutes before scheduled time
- **Smart Reminders** - Automated email and in-app notifications for upcoming appointments

#### 📋 **Comprehensive Medical Records**
- **Complete Treatment History** - Access all past consultations, diagnoses, and treatment plans in one centralized location
- **Prescription Archive** - Digital storage of all prescriptions with detailed medication information, dosages, and instructions
- **Treatment Analytics** - Visual summaries of medical history, common diagnoses, and prescribed medications over time
- **Doctor Network** - Track all healthcare providers you've consulted with
- **Export Capabilities** - Download medical records and prescriptions in various formats for personal records

#### 💊 **Advanced Medicine Marketplace**
- **Curated Pharmacy Catalog** - Browse medicines by category with detailed descriptions, pricing, and stock availability
- **Smart Search & Filters** - Find medicines quickly using advanced search with category, price range, and availability filters
- **Shopping Cart & Checkout** - Secure cart management with real-time inventory updates and streamlined checkout process
- **Order Tracking** - Track order status from placement to delivery with detailed shipping information
- **Prescription Validation** - Automatic verification for prescription-required medications

#### 🤖 **AI-Powered Prescription Scanner**
- **OCR Technology** - Upload prescription images and automatically extract medicine names using advanced OCR
- **Intelligent Medicine Matching** - AI-powered matching of extracted medicine names with available inventory
- **Smart Recommendations** - Get personalized medicine recommendations based on prescription analysis
- **One-Click Purchase** - Add matched medicines directly to cart from scan results
- **Accuracy Validation** - Review and verify extracted information before purchase

#### 👤 **Personal Health Profile**
- **Comprehensive Profile Management** - Update personal information, medical history, allergies, and emergency contacts
- **Health Metrics Tracking** - Record and monitor vital signs, blood type, and other health indicators
- **Privacy Controls** - Granular control over profile visibility and data sharing preferences
- **Document Management** - Upload and store important health documents securely

---

### 👨‍⚕️ Doctor Dashboard

#### 📊 **Advanced Analytics & Insights**
- **Real-Time Dashboard** - Comprehensive overview of today's patients, weekly appointments, and monthly earnings
- **Performance Metrics** - Track patient satisfaction, appointment completion rates, and revenue trends
- **Visual Analytics** - Interactive charts and graphs for weekly patient flow and monthly revenue analysis
- **Earnings Reports** - Detailed financial reports with period-based filtering (weekly, monthly, yearly)
- **Patient Statistics** - Monitor patient demographics, visit frequency, and treatment outcomes

#### 🗓️ **Efficient Schedule Management**
- **Today's Appointments** - View all scheduled appointments with complete patient information and appointment details
- **Patient Quick Access** - Instant access to patient medical history, previous prescriptions, and treatment records
- **Appointment Status Control** - Update appointment status (scheduled, completed, cancelled) with automated notifications
- **Schedule Optimization** - View weekly and monthly schedules with conflict detection and availability management
- **Video Consultation Integration** - Launch video calls directly from appointment cards

#### 👥 **Comprehensive Patient Management**
- **Patient Registry** - Add new patients manually or access existing patient records from appointments
- **Medical History Access** - View complete patient medical history, allergies, and previous treatments
- **Patient Search & Filter** - Advanced search functionality to quickly find patients by name, email, or mobile
- **Quick Patient Lookup** - Fast access to patient information during consultations
- **Patient Communication** - Send notifications and updates directly to patients

#### 💉 **Digital Prescription System**
- **Prescription Creation** - Create detailed prescriptions with multiple medications, dosages, frequencies, and durations
- **Medical Record Generation** - Automatically generate comprehensive medical records from consultations
- **Treatment Documentation** - Record diagnoses, symptoms, vital signs, and follow-up instructions
- **Prescription History** - Access all previously created prescriptions with search and filter capabilities
- **Template Management** - Save and reuse common prescription templates for efficiency

#### 📈 **Business Intelligence**
- **Revenue Tracking** - Monitor earnings from consultations with detailed breakdowns and trends
- **Patient Analytics** - Analyze patient demographics, visit patterns, and treatment outcomes
- **Performance Benchmarking** - Compare performance metrics against system averages
- **Export Reports** - Generate and export detailed reports for accounting and analysis

---

#### 🔐 Admin Control Panel

#### 👥 **Advanced User Management**
- **Unified User Directory** - Comprehensive view of all users (patients, doctors, admins) with advanced filtering
- **User Profile Management** - Edit user information, update roles, and manage account status
- **Bulk Operations** - Perform actions on multiple users simultaneously
- **User Search & Analytics** - Search users by name, email, role, or status with real-time filtering
- **Account Lifecycle Management** - Create, update, activate, deactivate, or delete user accounts

#### ✅ **Doctor Verification System**
- **Approval Workflow** - Review and approve/reject doctor registrations with detailed verification process
- **Pending Doctors Queue** - View all doctors awaiting approval with their credentials and information
- **Status Management** - Update doctor status (active, pending, rejected) with automated notifications
- **Verification History** - Track all approval/rejection actions with timestamps and admin notes
- **Bulk Approval** - Approve multiple doctors at once for efficient processing

#### 📊 **System-Wide Analytics**
- **Real-Time Dashboard** - Monitor system health, user activity, and platform performance metrics
- **User Statistics** - Track total users, active users, and user growth trends by role
- **Appointment Analytics** - View appointment statistics including total, completed, pending, and cancelled appointments
- **Revenue Analytics** - Monitor total revenue, revenue trends, and payment method distribution
- **Inventory Management** - Track pharmacy inventory with stock levels, low stock alerts, and inventory statistics
- **Department Distribution** - Visual representation of user distribution across different roles and departments

#### 🎯 **Platform Oversight**
- **Appointment Monitoring** - View all appointments across the platform with filtering by status, date, doctor, or patient
- **Payment Tracking** - Monitor all payment transactions with status, method, and transaction details
- **System Health Monitoring** - Track system uptime, active sessions, and storage usage
- **Activity Logs** - Comprehensive audit trail of all system activities and user actions
- **Report Generation** - Generate detailed system reports for analysis and compliance

#### 🔒 **Security & Compliance**
- **Access Control** - Role-based access control ensuring users only access authorized features
- **Audit Trails** - Complete logging of all administrative actions for security and compliance
- **Data Management** - Secure handling of sensitive medical and personal information
- **System Configuration** - Manage system settings, configurations, and feature toggles

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd medi-connect
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # MongoDB
   MONGODB_URI=mongodb://localhost:27017/mediconnect
   # Or for MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mediconnect
   
   # JWT Secret
   JWT_SECRET=your-secret-key-change-in-production
   
   # Server
   PORT=3001
   NODE_ENV=development
   
   # Client URL
   CLIENT_URL=http://localhost:5173
   
   # Optional: RabbitMQ (for notifications)
   RABBITMQ_URL=amqp://localhost:5672
   
   # Optional: Redis (for caching)
   REDIS_URL=redis://localhost:6379
   ```

4. **Set up MongoDB**
   - See [docs/MONGODB_SETUP.md](./docs/MONGODB_SETUP.md) for detailed instructions
   - Choose either local MongoDB or MongoDB Atlas (cloud)

5. **Seed initial data (optional)**
   ```bash
   # Seed doctors
   node server/scripts/seedDoctors.js
   
   # Seed medicines
   node server/scripts/seedMedicines.js
   ```
   See [docs/SEED_DATA_INSTRUCTIONS.md](./docs/SEED_DATA_INSTRUCTIONS.md) for more details.

## 🏃 Running the Application

### Development Mode

Run both frontend and backend concurrently:
```bash
npm run dev:all
```

Or run them separately:

**Backend Server:**
```bash
npm run server
```

**Frontend Development Server:**
```bash
npm run dev
```

**Email Worker (optional):**
```bash
npm run worker
```

### Production Build

```bash
# Build frontend
npm run build

# Start production server
npm run server
```

## 📁 Project Structure

```
medi-connect/
├── components/          # React components
│   ├── pages/         # Page components (Landing, Login, Dashboards)
│   ├── patient/       # Patient-specific components
│   ├── ui/            # Reusable UI components (shadcn/ui)
│   └── ui-kit/        # Custom medical-themed components
├── server/            # Backend server
│   ├── config/        # Database and service configurations
│   ├── controllers/   # Route controllers
│   ├── models/        # Data models
│   ├── routes/        # API routes
│   ├── services/      # Business logic services
│   ├── middleware/    # Express middleware
│   ├── workers/       # Background workers
│   └── scripts/       # Utility scripts (seed data, etc.)
├── src/               # Source files
│   └── services/      # Frontend API services
├── utils/             # Utility functions
├── types/             # TypeScript type definitions
├── styles/            # Global styles
├── public/            # Static assets
└── docs/              # Documentation
```

## 🔐 Default Credentials

After seeding data, you can use these credentials:

**Doctors:**
- Email: `priya.sharma@mediconnect.com` (Cardiology)
- Password: `password123`

**Note:** All seeded doctors use the same password: `password123`

## 📚 Documentation

- [MongoDB Setup Guide](./docs/MONGODB_SETUP.md)
- [Seed Data Instructions](./docs/SEED_DATA_INSTRUCTIONS.md)
- [Attributions](./docs/Attributions.md)

## 🛡️ Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Input validation and sanitization
- CORS protection
- Rate limiting

## 🧪 Tech Stack

**Frontend:**
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components
- Recharts (for analytics)

**Backend:**
- Node.js
- Express.js
- MongoDB
- JWT authentication
- RabbitMQ (optional, for notifications)
- Redis (optional, for caching)

## 📝 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login

### Patient
- `GET /api/patient/doctors` - Get available doctors
- `POST /api/patient/appointments` - Book appointment
- `GET /api/patient/appointments` - Get patient appointments
- `GET /api/patient/medical-records` - Get medical records

### Doctor
- `GET /api/doctor/dashboard-stats` - Get dashboard statistics
- `GET /api/doctor/today-appointments` - Get today's appointments
- `POST /api/doctor/create-prescription` - Create prescription

### Admin
- `GET /api/admin/users` - Get all users
- `POST /api/admin/doctors/:id/approve` - Approve doctor
- `GET /api/admin/analytics` - Get system analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- Check the [documentation](./docs/)
- Open an issue on GitHub
- Contact the development team

---

**Built with ❤️ for better healthcare management**

