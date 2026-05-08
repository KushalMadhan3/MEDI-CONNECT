/**
 * Patient Service
 * API calls for patient dashboard features
 */

import api from '../../utils/api';

// Types
export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  experience: string;
  rating: number;
  consultationPrice: number;
  image: string;
  availability?: string[];
  about?: string;
}

export interface Appointment {
  id: string;
  _id?: string; // MongoDB ID
  doctorId: string;
  doctorName: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  type: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'pending' | 'rescheduled' | 'confirmed';
  // Payment fields
  paymentStatus?: 'pending' | 'paid' | 'failed';
  paymentMethod?: 'upi' | 'card' | 'netbanking';
  paymentId?: string;
  transactionTime?: string;
  // Other fields
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Medicine {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  requiresPrescription: boolean;
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

export interface Order {
  id: string;
  userId: string;
  items: Array<{
    medicineId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  status: string;
  createdAt: string;
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
  bloodType?: string;
  emergencyContact?: string;
  dateOfBirth?: string;
  medicalHistory: string[];
  allergies: string[];
  createdAt: string;
  updatedAt: string;
}

// Add this after the Order interface
export interface OrderWithTracking extends Order {
  trackingInfo?: {
    status: string;
    estimatedDelivery?: string;
    carrier?: string;
    trackingNumber?: string;
  };
}

export interface PrescriptionOCRResult {
  rawText: string;
  extractedMedicines: string[];
  matches: Array<{
    extractedName: string;
    matchedMedicines: Medicine[];
  }>
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientAge: number | null;
  patientGender: string | null;
  doctorId: string;
  doctorName: string;
  appointmentId: string;
  appointmentDate: string;
  appointmentTime: string;
  diagnosis: string | null;
  symptoms: string | null;
  prescribedMedicines: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  dosageInstructions: string | null;
  followUpDate: string | null;
  notes: string | null;
  vitalSigns: any;
  createdAt: string;
  updatedAt: string;
}

export interface TreatmentSummary {
  totalRecords: number;
  latestDiagnosis: string | null;
  commonDiagnoses: string[];
  prescribedMedicinesHistory: string[];
  lastVisit: string | null;
  doctorsVisited: string[];
  records: MedicalRecord[];
}

// API Functions
export const patientAPI = {
  /**
   * Get doctors by category
   */
  getDoctors: async (category?: string, search?: string): Promise<Doctor[]> => {
    const params: any = {};
    if (category) params.category = category;
    if (search) params.search = search;
    
    const response = await api.get('/patient/doctors', { params });
    return response.data.data;
  },

  /**
   * Book an appointment (REQUIRES PAYMENT)
   */
  bookAppointment: async (data: {
    doctorId: string;
    date: string;
    time: string;
    status?: string;
    paymentStatus: string;
    paymentMethod: string;
    paymentId: string;
    transactionTime?: string;
    notes?: string;
  }): Promise<Appointment> => {
    const response = await api.post('/patient/appointments', data);
    return response.data.data;
  },

  /**
   * Get patient's appointments
   */
  getAppointments: async (): Promise<Appointment[]> => {
    const response = await api.get('/patient/appointments');
    return response.data.data;
  },

  /**
   * Get patient notifications
   */
  getNotifications: async (options?: {
    unreadOnly?: boolean;
    limit?: number;
  }): Promise<{ notifications: Notification[]; unreadCount: number }> => {
    const params: any = {};
    if (options?.unreadOnly) params.unreadOnly = 'true';
    if (options?.limit) params.limit = options.limit.toString();
    
    const response = await api.get('/patient/notifications', { params });
    return {
      notifications: response.data.data,
      unreadCount: response.data.unreadCount
    };
  },

  /**
   * Mark notification as read
   */
  markNotificationAsRead: async (notificationId: string): Promise<void> => {
    await api.put(`/patient/notifications/${notificationId}/read`);
  },

  /**
   * Mark all notifications as read
   */
  markAllNotificationsAsRead: async (): Promise<void> => {
    await api.put('/patient/notifications/read-all');
  },

  /**
   * Get patient profile
   */
  getProfile: async (): Promise<any> => {
    const response = await api.get('/patient/profile');
    return response.data.data;
  },

  /**
   * Update patient profile
   */
  updateProfile: async (data: {
    name?: string;
    mobile?: string;
    address?: string;
    gender?: string;
    age?: number;
    profilePhoto?: string;
    bloodType?: string;
    emergencyContact?: string;
    dateOfBirth?: string;
  }): Promise<any> => {
    const response = await api.put('/patient/profile', data);
    return response.data.data;
  },

  /**
   * Get patient medical records
   */
  getMedicalRecords: async (): Promise<{
    medicalRecords: MedicalRecord[];
    treatmentSummary: TreatmentSummary;
  }> => {
    const response = await api.get('/patient/medical-records');
    return response.data.data;
  },
  
  /**
   * Reschedule an appointment
   */
  rescheduleAppointment: async (appointmentId: string, newDate: string, newTime: string): Promise<void> => {
    const encodedId = encodeURIComponent(appointmentId);
    await api.put(`/patient/appointments/${encodedId}/reschedule`, {
      newDate: newDate,
      newTime: newTime
    });
  },
  
  /**
   * Cancel an appointment
   */
  cancelAppointment: async (appointmentId: string, reason?: string): Promise<void> => {
    const encodedId = encodeURIComponent(appointmentId);
    await api.put(`/patient/appointments/${encodedId}/cancel`, {
      reason
    });
  }
};

export const marketplaceAPI = {
  /**
   * Get medicines
   */
  getMedicines: async (filters?: {
    category?: string;
    search?: string;
    limit?: number;
    page?: number;
  }): Promise<Medicine[]> => {
    const params: any = {};
    if (filters?.category) params.category = filters.category;
    if (filters?.search) params.search = filters.search;
    if (filters?.limit) params.limit = filters.limit.toString();
    if (filters?.page) params.page = filters.page.toString();
    
    const response = await api.get('/marketplace/medicines', { params });
    return response.data.data;
  },

  /**
   * Get medicine by ID
   */
  getMedicine: async (id: string): Promise<Medicine> => {
    const response = await api.get(`/marketplace/medicines/${id}`);
    return response.data.data;
  },

  /**
   * Place order
   */
  placeOrder: async (data: {
    items: Array<{ medicineId: string; quantity: number }>;
    shippingAddress: string;
    totalAmount: number;
    paymentId?: string;
  }): Promise<Order> => {
    const response = await api.post('/marketplace/order', data);
    return response.data.data;
  },

  /**
   * Get user orders
   */
  getOrders: async (): Promise<Order[]> => {
    const response = await api.get('/marketplace/orders');
    return response.data.data;
  },

  /**
   * Cancel an order
   */
  cancelOrder: async (orderId: string): Promise<Order> => {
    const encodedId = encodeURIComponent(orderId);
    const response = await api.put(`/marketplace/orders/${encodedId}/cancel`);
    return response.data.data;
  },

  /**
   * Get order tracking information
   */
  trackOrder: async (orderId: string): Promise<OrderWithTracking> => {
    const encodedId = encodeURIComponent(orderId);
    const response = await api.get(`/marketplace/orders/${encodedId}/track`);
    return response.data.data;
  }
};

export const searchAPI = {
  /**
   * Upload and analyze prescription image
   */
  uploadPrescription: async (image: string): Promise<PrescriptionOCRResult> => {
    const response = await api.post('/search/upload-prescription', { image });
    return response.data.data;
  },

  /**
   * Global search
   */
  globalSearch: async (query: string, options?: {
    category?: string;
    type?: 'medicine' | 'doctor';
  }): Promise<{ medicines: Medicine[]; doctors: Doctor[] }> => {
    const params: any = { q: query };
    if (options?.category) params.category = options.category;
    if (options?.type) params.type = options.type;
    
    const response = await api.get('/search/global', { params });
    return response.data.data;
  }
};


