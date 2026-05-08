import api from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  mobile?: string;
  gender?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  _id?: string;
  // Patient information
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  // Doctor information
  doctorId: string;
  doctorName: string;
  doctorSpecialization?: string;
  doctorEmail?: string;
  specialty?: string;
  // Appointment details
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'pending' | 'confirmed';
  // Payment information
  paymentStatus?: 'pending' | 'paid' | 'failed';
  paymentMethod?: 'upi' | 'card' | 'netbanking' | 'N/A';
  paymentId?: string;
  transactionTime?: string;
  // Additional fields
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PharmacyItem {
  id: string;
  name: string;
  type: string;
  price: number;
  stock: number;
  supplier: string;
  expiryDate: string;
  status: string;
}

export interface SystemAnalytics {
  totalUsers: number;
  totalPatients: number;
  activeDoctors: number;
  pendingDoctors: number;
  totalAppointments: number;
  completedAppointments: number;
  pendingAppointments: number;
  totalRevenue: number;
  usersByRole: Record<string, number>;
  newUsersByDay?: Array<{ date: string; count: number }>;
  appointmentsByStatus?: Record<string, number>;
  revenueByDay?: Array<{ date: string; amount: number }>;
  lowStockItems?: Array<{ id: string; name: string; stock: number; price: number; category?: string }>;
  revenueSummary?: {
    totalRevenue: number;
    totalTransactions: number;
    averageTransaction: number;
    revenueByMethod: Record<string, number>;
  };
  activeUsers24h?: number;
  systemHealth?: {
    status: string;
    checks: Record<string, string>;
  };
  inventoryStats: {
    totalItems: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
  };
  lastUpdated: string;
}

export interface Payment {
  transactionId: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  amount: number;
  method: string;
  status: string;
  timestamp: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string;
  details: Record<string, any>;
  ip?: string;
  timestamp: string;
}

export interface PendingDoctor {
  id: string;
  doctorId: string;
  specialization?: string;
  qualifications?: string;
  documents?: Array<{ type: string; url: string }>;
  user?: User;
  credentials?: {
    name?: string;
    email?: string;
    mobile?: string;
    specialization?: string;
    qualifications?: string;
    documents?: Array<{ type: string; url: string }>;
  };
  createdAt: string;
}

export const adminAPI = {
  // User Management
  getAllUsers: async (params?: {
    role?: string;
    status?: string;
    q?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  getUserById: async (userId: string) => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  updateUser: async (userId: string, data: Partial<User>) => {
    const response = await api.put(`/admin/users/${userId}`, data);
    return response.data;
  },

  deleteUser: async (userId: string) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  bulkUpdateUsers: async (userIds: string[], action: 'role' | 'status', value: string) => {
    const response = await api.post('/admin/users/bulk', { userIds, action, value });
    return response.data;
  },

  // Doctor Approval
  getPendingDoctors: async (): Promise<{ success: boolean; data: PendingDoctor[] }> => {
    const response = await api.get('/admin/doctors/pending');
    return response.data;
  },

  approveDoctor: async (doctorId: string) => {
    const response = await api.post(`/admin/doctors/${doctorId}/approve`);
    return response.data;
  },

  verifyDoctor: async (doctorId: string, action: 'approve' | 'reject', note?: string) => {
    const response = await api.put(`/admin/doctors/${doctorId}/verify`, { action, note });
    return response.data;
  },

  // Appointments
  getAllAppointments: async (params?: {
    status?: string;
    date?: string;
    doctorId?: string;
    patientId?: string;
    fromDate?: string;
    toDate?: string;
    paymentStatus?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/admin/appointments', { params });
    return response.data;
  },

  getAppointmentById: async (appointmentId: string) => {
    const response = await api.get(`/admin/appointments/${appointmentId}`);
    return response.data;
  },

  updateAppointmentStatus: async (appointmentId: string, status: string) => {
    const response = await api.put(`/admin/appointments/${appointmentId}/status`, { status });
    return response.data;
  },

  // Pharmacy Inventory
  getPharmacyInventory: async (params?: { status?: string; type?: string; search?: string }) => {
    const response = await api.get('/admin/pharmacy/inventory', { params });
    return response.data;
  },

  updatePharmacyInventory: async (itemId: string, data: { stock?: number; price?: number; status?: string }) => {
    const response = await api.put(`/admin/pharmacy/inventory/${itemId}`, data);
    return response.data;
  },

  // Payments
  getAllPayments: async (params?: {
    status?: string;
    method?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/admin/payments', { params });
    return response.data;
  },

  // System Analytics
  getSystemAnalytics: async (params?: { from?: string; to?: string }) => {
    const response = await api.get('/admin/analytics', { params });
    return response.data;
  },

  // Activity Logs
  getActivityLogs: async (params?: {
    actorId?: string;
    actorRole?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const response = await api.get('/admin/activity-logs', { params });
    return response.data;
  },

  // Export Reports
  exportReport: async (resource: 'users' | 'appointments' | 'payments' | 'logs' | 'analytics', format: 'csv' | 'pdf' = 'csv', from?: string, to?: string): Promise<Blob | any> => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const token = localStorage.getItem('token');
    
    if (format === 'csv') {
      const params = new URLSearchParams({ resource, format });
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      
      const response = await fetch(`${API_BASE_URL}/admin/export?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to export report');
      }
      
      return await response.blob();
    } else {
      const response = await api.get('/admin/export', {
        params: { resource, format, from, to }
      });
      return response.data;
    }
  },

  // System Configuration
  updateSystemConfig: async (data: { lowStockThreshold?: number; maintenanceMode?: boolean }) => {
    const response = await api.put('/admin/system/config', data);
    return response.data;
  },

  // Notifications
  getNotifications: async (params?: {
    unreadOnly?: boolean;
    limit?: number;
  }) => {
    const response = await api.get('/admin/notifications', { params });
    return response.data;
  },

  markNotificationAsRead: async (notificationId: string) => {
    const response = await api.put(`/admin/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllNotificationsAsRead: async () => {
    const response = await api.put('/admin/notifications/read-all');
    return response.data;
  },
};















