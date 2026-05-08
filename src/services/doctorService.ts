/**
 * Doctor Service
 * API calls for doctor dashboard features
 */

import api from '../../utils/api';

// Types
export interface DashboardStats {
  todayPatientsCount: number;
  weeklyAppointmentsCount: number;
  satisfactionPercentage: number;
  monthlyEarnings: number;
}

export interface Appointment {
  id: string;
  doctorId: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  patientAge?: number;
  patientGender?: string;
  patientAddress?: string;
  patientBloodType?: string;
  patientEmergencyContact?: string;
  reason?: string;
  doctorName: string;
  doctorEmail: string;
  date: string;
  time: string;
  type: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'pending' | 'confirmed';
  // Payment fields
  paymentStatus?: 'pending' | 'paid' | 'failed';
  paymentMethod?: 'upi' | 'card' | 'netbanking';
  paymentId?: string;
  transactionTime?: string;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  id: string;
  userId: string;
  name: string;
  email: string;
  mobile?: string;
  gender?: string;
  age?: number;
  address?: string;
  medicalHistory?: string[];
  allergies?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Prescription {
  id: string;
  doctorId: string;
  doctorName: string;
  patientId: string;
  patientName: string;
  patientEmail?: string;
  appointmentId?: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  diagnosis?: string;
  instructions?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  userRole: string;
  type: string;
  title: string;
  message: string;
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AddPatientData {
  name: string;
  email: string;
  mobile?: string;
  gender?: string;
  age?: number;
  address?: string;
  medicalHistory?: string[];
  allergies?: string[];
}

export interface CreatePrescriptionData {
  patientId: string;
  patientName?: string;
  patientEmail?: string;
  appointmentId?: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  diagnosis?: string;
  symptoms?: string;
  dosageInstructions?: string;
  followUpDate?: string;
  notes?: string;
  vitalSigns?: Record<string, any>;
}

export interface UpdateAppointmentStatusData {
  status: 'scheduled' | 'completed' | 'cancelled' | 'pending';
  notes?: string;
}

// API Functions
export const doctorAPI = {
  /**
   * Get dashboard statistics
   */
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/doctor/dashboard-stats');
    return response.data.data;
  },

  /**
   * Get today's appointments
   */
  getTodayAppointments: async (): Promise<Appointment[]> => {
    const response = await api.get('/doctor/today-appointments');
    return response.data.data;
  },

  /**
   * Add a new patient
   */
  addPatient: async (data: AddPatientData): Promise<Patient> => {
    const response = await api.post('/doctor/add-patient', data);
    return response.data.data;
  },

  /**
   * Create a prescription for a patient (without appointment)
   */
  createPrescription: async (data: CreatePrescriptionData): Promise<any> => {
    const response = await api.post('/doctor/create-prescription', data);
    return response.data.data;
  },

  /**
   * Update appointment status
   */
  updateAppointmentStatus: async (
    appointmentId: string,
    data: UpdateAppointmentStatusData
  ): Promise<Appointment> => {
    const response = await api.put(`/doctor/update-appointment-status/${appointmentId}`, data);
    return response.data.data;
  },

  /**
   * Get notifications
   */
  getNotifications: async (options?: {
    unreadOnly?: boolean;
    limit?: number;
  }): Promise<{ notifications: Notification[]; unreadCount: number }> => {
    const params: any = {};
    if (options?.unreadOnly) params.unreadOnly = 'true';
    if (options?.limit) params.limit = options.limit.toString();

    const response = await api.get('/doctor/notifications', { params });
    return {
      notifications: response.data.data,
      unreadCount: response.data.unreadCount
    };
  },

  /**
   * Mark notification as read
   */
  markNotificationAsRead: async (notificationId: string): Promise<void> => {
    await api.put(`/doctor/notifications/${notificationId}/read`);
  },

  /**
   * Mark all notifications as read
   */
  markAllNotificationsAsRead: async (): Promise<void> => {
    await api.put('/doctor/notifications/read-all');
  },
  /**
    * Get doctor's patients
    */
  getPatients: async (query?: string): Promise<Patient[]> => {
    const params: any = {};
    if (query) params.query = query;
    const response = await api.get('/doctor/patients', { params });
    return response.data.data;
  },

  /**
   * Get doctor's prescriptions
   */
  getPrescriptions: async (): Promise<Prescription[]> => {
    const response = await api.get('/doctor/prescriptions');
    return response.data.data;
  },

  /**
   * Prescribe for appointment
   */
  prescribeAppointment: async (
    appointmentId: string,
    data: {
      symptoms?: string;
      diagnosis?: string;
      prescribedMedicines: Array<{
        name: string;
        dosage?: string;
        duration?: string;
        instructions?: string;
        timing?: { morning?: boolean; afternoon?: boolean; night?: boolean };
        frequency?: string;
      }>;
      notes?: string;
      vitalSigns?: Record<string, any>;
      dosageInstructions?: string;
      followUpDate?: string;
    }
  ): Promise<any> => {
    const response = await api.put(`/doctor/appointments/${appointmentId}/prescribe`, data);
    return response.data.data;
  },

  /**
   * Get doctor analytics
   */
  getAnalytics: async (options?: { from?: string; to?: string }): Promise<any> => {
    const params: any = {};
    if (options?.from) params.from = options.from;
    if (options?.to) params.to = options.to;
    const response = await api.get('/doctor/analytics', { params });
    return response.data.data;
  },

  /**
   * Export doctor report
   */
  exportReport: async (from: string, to: string, format: 'csv' | 'pdf' = 'csv'): Promise<any> => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const token = localStorage.getItem('token');
    
    if (format === 'csv') {
      const response = await fetch(`${API_BASE_URL}/doctor/report?from=${from}&to=${to}&format=csv`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to export report');
      }
      const blob = await response.blob();
      return blob;
    } else {
      const response = await api.get('/doctor/report', {
        params: { from, to, format }
      });
      return response.data;
    }
  }
};



