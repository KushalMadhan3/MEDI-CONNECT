import React, { useState, useEffect } from 'react';
import { Logo } from '../branding/Logo';
import { MedicalCard } from '../ui-kit/MedicalCard';
import { MedicalButton } from '../ui-kit/MedicalButton';
import { StatusBadge } from '../ui-kit/StatusBadge';
import {
  Users,
  Calendar,
  TrendingUp,
  DollarSign,
  Bell,
  Settings,
  LogOut,
  UserPlus,
  Activity,
  Building2,
  Pill,
  Loader2,
  Edit,
  Trash2,
  X,
  Save,
  Download,
  FileText,
  Eye,
  ChevronDown,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { NavigateFn, UserRole, UserInfo } from '../../types/navigation';
import { adminAPI, type SystemAnalytics, type User, type Appointment } from '../../utils/adminAPI';
import { NotificationDropdown } from '../shared/NotificationDropdown';

interface AdminDashboardProps {
  onNavigate: NavigateFn;
  onLogout?: () => void;
  userRole?: UserRole | null;
  userInfo?: UserInfo | null;
}

export function AdminDashboard({ onNavigate, onLogout, userInfo }: AdminDashboardProps) {
  const [analytics, setAnalytics] = useState<SystemAnalytics | null>(null);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [pendingDoctors, setPendingDoctors] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'appointments' | 'reports' | 'settings'>('dashboard');

  // Edit/Delete states
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<User>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('');

  // New feature states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [newUserData, setNewUserData] = useState<Partial<User>>({
    name: '',
    email: '',
    mobile: '',
    gender: '',
    role: 'patient',
    status: 'active'
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [exportResource, setExportResource] = useState<'users' | 'appointments' | 'payments' | 'logs' | 'analytics'>('users');
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [systemConfig, setSystemConfig] = useState({ lowStockThreshold: 10, maintenanceMode: false });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [appointmentStatus, setAppointmentStatus] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
    loadNotifications();
    
    // Poll notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const result = await adminAPI.getNotifications({ limit: 10 });
      if (result.success) {
        setNotifications(result.data || []);
        setUnreadCount(result.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, usersRes, doctorsRes, appointmentsRes] = await Promise.all([
        adminAPI.getSystemAnalytics(),
        adminAPI.getAllUsers({ search: '' }),
        adminAPI.getPendingDoctors(),
        adminAPI.getAllAppointments()
      ]);

      if (analyticsRes.success) {
        // Ensure all required fields have default values
        const analyticsData = {
          totalUsers: 0,
          totalPatients: 0,
          activeDoctors: 0,
          pendingDoctors: 0,
          totalAppointments: 0,
          completedAppointments: 0,
          pendingAppointments: 0,
          totalRevenue: 0,
          usersByRole: {},
          inventoryStats: {
            totalItems: 0,
            inStock: 0,
            lowStock: 0,
            outOfStock: 0
          },
          lastUpdated: new Date().toISOString(),
          ...analyticsRes.data
        };
        setAnalytics(analyticsData);
      }
      if (usersRes.success) {
        setRecentUsers(usersRes.data.slice(0, 10)); // Latest 10 users
        setAllUsers(usersRes.data); // All users for users tab
      }
      if (doctorsRes.success) setPendingDoctors(doctorsRes.data);
      if (appointmentsRes.success) setAppointments(appointmentsRes.data.slice(0, 5)); // Latest 5 appointments
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (userSearch) params.search = userSearch;
      if (userRoleFilter) params.role = userRoleFilter;
      if (userStatusFilter) params.status = userStatusFilter;

      const usersRes = await adminAPI.getAllUsers(params);
      if (usersRes.success) {
        setAllUsers(usersRes.data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab, userSearch, userRoleFilter, userStatusFilter]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboardData();
    } else if (activeTab === 'appointments') {
      loadAppointments();
    }
  }, [activeTab]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const appointmentsRes = await adminAPI.getAllAppointments();
      if (appointmentsRes.success) {
        setAllAppointments(appointmentsRes.data);
        setAppointments(appointmentsRes.data);
      }
    } catch (error) {
      console.error('Failed to load appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDoctor = async (doctorId: string) => {
    try {
      await adminAPI.approveDoctor(doctorId);
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Failed to approve doctor:', error);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      mobile: user.mobile || '',
      gender: user.gender || '',
      role: user.role,
      status: user.status
    });
    setErrorMessage(null);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const result = await adminAPI.updateUser(editingUser.id, editFormData);
      if (result.success) {
        setEditingUser(null);
        setEditFormData({});
        await loadDashboardData(); // Refresh data
      } else {
        setErrorMessage(result.message || 'Failed to update user');
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || error.message || 'Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const result = await adminAPI.deleteUser(deleteUser.id);
      if (result.success) {
        setDeleteUser(null);
        await loadDashboardData(); // Refresh data
      } else {
        setErrorMessage(result.message || 'Failed to delete user');
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || error.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditFormData({});
    setErrorMessage(null);
  };

  const handleCancelDelete = () => {
    setDeleteUser(null);
    setErrorMessage(null);
  };

  const handleCreateUser = async () => {
    setIsCreatingUser(true);
    setErrorMessage(null);

    try {
      // Note: This would need a backend endpoint to create users
      // For now, we'll show an error message
      setErrorMessage('User creation endpoint not available. Please use the registration system.');
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || error.message || 'Failed to create user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleExportReport = async () => {
    setIsExporting(true);
    setErrorMessage(null);

    try {
      const blob = await adminAPI.exportReport(exportResource, exportFormat);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportResource}-report.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setShowExportModal(false);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || error.message || 'Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const handleUpdateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      const result = await adminAPI.updateAppointmentStatus(appointmentId, status);
      if (result.success) {
        await loadAppointments();
        setEditingAppointment(null);
        setAppointmentStatus('');
      }
    } catch (error: any) {
      console.error('Failed to update appointment status:', error);
      setErrorMessage(error.response?.data?.message || error.message || 'Failed to update appointment');
    }
  };

  const handleSaveSystemConfig = async () => {
    setIsSavingConfig(true);
    setErrorMessage(null);

    try {
      const result = await adminAPI.updateSystemConfig(systemConfig);
      if (result.success) {
        setErrorMessage(null);
        // Show success message
        alert('System configuration updated successfully!');
      } else {
        setErrorMessage(result.message || 'Failed to update configuration');
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || error.message || 'Failed to update configuration');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `₹${(num / 1000000).toFixed(1)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
    return `₹${num}`;
  };

  const stats = analytics ? [
    { label: 'Total Patients', value: (analytics.totalPatients || 0).toLocaleString(), change: '+12%', icon: Users, color: '#1E5FBF' },
    { label: 'Active Doctors', value: (analytics.activeDoctors || 0).toLocaleString(), change: '+8%', icon: Activity, color: '#8A2BE2' },
    { label: 'Appointments', value: (analytics.totalAppointments || 0).toLocaleString(), change: '+23%', icon: Calendar, color: '#008080' },
    { label: 'Revenue', value: formatNumber(analytics.totalRevenue || 0), change: '+18%', icon: DollarSign, color: '#008000' },
  ] : [];

  // Generate department data from analytics (users by role)
  const departmentData = analytics?.usersByRole ? Object.entries(analytics.usersByRole)
    .map(([role, count]) => ({
      name: role.charAt(0).toUpperCase() + role.slice(1),
      value: count
    }))
    .filter(item => item.value > 0) : [];

  const monthlyData = [
    { month: 'Jun', patients: 380, revenue: 720000 },
    { month: 'Jul', patients: 420, revenue: 810000 },
    { month: 'Aug', patients: 460, revenue: 890000 },
    { month: 'Sep', patients: 440, revenue: 850000 },
    { month: 'Oct', patients: 510, revenue: 980000 },
    { month: 'Nov', patients: 580, revenue: 1120000 },
  ];

  const COLORS = ['#1E5FBF', '#8A2BE2', '#008080', '#FF8C00', '#CC0000'];

  return (
    <div className="min-h-screen bg-[#CFE3FF]">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Logo variant="primary" size="md" />
            <div className="flex items-center gap-4">
              <NotificationDropdown
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAsRead={async (notificationId) => {
                  try {
                    await adminAPI.markNotificationAsRead(notificationId);
                    setNotifications(prev => 
                      prev.map(n => (n._id === notificationId || n.id === notificationId) 
                        ? { ...n, isRead: true } 
                        : n
                      )
                    );
                    setUnreadCount(prev => Math.max(0, prev - 1));
                  } catch (error) {
                    console.error('Failed to mark notification as read', error);
                    throw error;
                  }
                }}
                onMarkAllAsRead={async () => {
                  try {
                    await adminAPI.markAllNotificationsAsRead();
                    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                    setUnreadCount(0);
                  } catch (error) {
                    console.error('Failed to mark all as read', error);
                    throw error;
                  }
                }}
                onRefresh={loadNotifications}
              />
              <div className="relative">
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-3 hover:bg-[#CFE3FF] rounded-lg p-2"
                >
                  <div className="w-10 h-10 rounded-full bg-[#C4DCFF] flex items-center justify-center">
                    <Users className="w-6 h-6 text-[#1E5FBF]" />
                  </div>
                  <div className="text-left hidden md:block">
                    <div className="text-sm font-medium text-[#1A1A1A]">
                      {userInfo?.name || 'Admin User'}
                    </div>
                    <div className="text-xs text-[#555555]">
                      {userInfo?.email || 'Administrator'}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#555555] hidden md:block" />
                </button>
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#A0A0A0] z-50">
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          // Navigate to profile settings if available
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#CFE3FF] rounded-lg text-sm text-[#1A1A1A]"
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onLogout ? onLogout() : onNavigate('landing');
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#FFCDD2] rounded-lg text-sm text-[#CC0000]"
                      >
                        <LogOut className="w-4 h-4 inline mr-2" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white min-h-screen shadow-sm hidden lg:block">
          <nav className="p-6 space-y-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === 'dashboard' ? 'bg-[#C4DCFF] text-[#1E5FBF] font-medium' : 'hover:bg-[#CFE3FF] text-[#555555]'}`}
            >
              <Activity className="w-5 h-5" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === 'users' ? 'bg-[#C4DCFF] text-[#1E5FBF] font-medium' : 'hover:bg-[#CFE3FF] text-[#555555]'}`}
            >
              <Users className="w-5 h-5" />
              Users
              {pendingDoctors.length > 0 && (
                <span className="ml-auto bg-[#CC0000] text-white text-xs px-2 py-0.5 rounded-full">
                  {pendingDoctors.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === 'appointments' ? 'bg-[#C4DCFF] text-[#1E5FBF] font-medium' : 'hover:bg-[#CFE3FF] text-[#555555]'}`}
            >
              <Calendar className="w-5 h-5" />
              Appointments
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === 'reports' ? 'bg-[#C4DCFF] text-[#1E5FBF] font-medium' : 'hover:bg-[#CFE3FF] text-[#555555]'}`}
            >
              <TrendingUp className="w-5 h-5" />
              Reports
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === 'settings' ? 'bg-[#C4DCFF] text-[#1E5FBF] font-medium' : 'hover:bg-[#CFE3FF] text-[#555555]'}`}
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
            <div className="pt-4 border-t border-[#A0A0A0]">
              <button
                onClick={() => onLogout ? onLogout() : onNavigate('landing')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#FFCDD2] text-[#CC0000]"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 max-w-7xl">
          {/* Welcome Banner */}
          <div className="mb-8">
            <h2>
              {activeTab === 'dashboard' && 'Admin Dashboard'}
              {activeTab === 'users' && 'User Management'}
              {activeTab === 'appointments' && 'Appointments'}
              {activeTab === 'reports' && 'Reports & Analytics'}
              {activeTab === 'settings' && 'System Settings'}
            </h2>
            <p className="text-[#555555]">
              {activeTab === 'dashboard' && 'System Overview & Analytics'}
              {activeTab === 'users' && 'Manage all user accounts'}
              {activeTab === 'appointments' && 'View and manage appointments'}
              {activeTab === 'reports' && 'Export reports and view analytics'}
              {activeTab === 'settings' && 'Configure system settings'}
            </p>
          </div>

          {/* Users Tab Content */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Filters */}
              <MedicalCard variant="filled" hover={false}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Search</label>
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full rounded-xl border-2 border-[#A0A0A0] bg-white px-4 py-2 text-black focus:border-[#1E5FBF] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Role</label>
                    <select
                      value={userRoleFilter}
                      onChange={(e) => setUserRoleFilter(e.target.value)}
                      className="w-full rounded-xl border-2 border-[#A0A0A0] bg-white px-4 py-2 text-black focus:border-[#1E5FBF] focus:outline-none"
                    >
                      <option value="">All Roles</option>
                      <option value="patient">Patient</option>
                      <option value="doctor">Doctor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Status</label>
                    <select
                      value={userStatusFilter}
                      onChange={(e) => setUserStatusFilter(e.target.value)}
                      className="w-full rounded-xl border-2 border-[#A0A0A0] bg-white px-4 py-2 text-black focus:border-[#1E5FBF] focus:outline-none"
                    >
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="pending_approval">Pending Approval</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              </MedicalCard>

              {/* Users Table */}
              <MedicalCard variant="filled" hover={false}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#A0A0A0]">
                        <th className="text-left py-3 px-4 text-sm font-medium text-[#555555]">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[#555555]">Email</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[#555555]">Role</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[#555555]">Mobile</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[#555555]">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[#555555]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-[#1E5FBF] mx-auto" />
                          </td>
                        </tr>
                      ) : allUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#555555]">
                            No users found
                          </td>
                        </tr>
                      ) : (
                        allUsers.map((user) => (
                          <tr key={user.id} className="border-b border-[#A0A0A0] last:border-0 hover:bg-[#CFE3FF] transition-colors">
                            <td className="py-3 px-4 text-[#1A1A1A] font-medium">{user.name}</td>
                            <td className="py-3 px-4 text-[#555555] text-sm">{user.email}</td>
                            <td className="py-3 px-4">
                              <span className={`text-sm font-medium ${user.role === 'doctor' ? 'text-[#1E5FBF]' : user.role === 'admin' ? 'text-[#8A2BE2]' : 'text-[#555555]'}`}>
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[#555555] text-sm">{user.mobile || 'N/A'}</td>
                            <td className="py-3 px-4">
                              <StatusBadge status={user.status === 'active' ? 'completed' : user.status === 'pending_approval' ? 'pending' : 'pending'}>
                                {user.status === 'active' ? 'Active' : user.status === 'pending_approval' ? 'Pending' : user.status}
                              </StatusBadge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => handleEditUser(user)}
                                  className="text-[#1E5FBF] hover:text-[#1B4AA0] transition-colors p-1 rounded hover:bg-[#C4DCFF]"
                                  title="Edit user"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteUser(user)}
                                  className="text-[#CC0000] hover:text-[#B71C1C] transition-colors p-1 rounded hover:bg-[#FFCDD2]"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {!loading && allUsers.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#A0A0A0] text-sm text-[#555555]">
                    Total Users: {allUsers.length}
                  </div>
                )}
              </MedicalCard>
            </div>
          )}

          {/* Appointments Tab Content */}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              <MedicalCard variant="filled" hover={false}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#A0A0A0]">
                        <th className="text-left py-3 px-4 font-medium text-[#1A1A1A]">Patient</th>
                        <th className="text-left py-3 px-4 font-medium text-[#1A1A1A]">Doctor</th>
                        <th className="text-left py-3 px-4 font-medium text-[#1A1A1A]">Date & Time</th>
                        <th className="text-left py-3 px-4 font-medium text-[#1A1A1A]">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-[#1A1A1A]">Payment</th>
                        <th className="text-left py-3 px-4 font-medium text-[#1A1A1A]">Contact</th>
                        <th className="text-left py-3 px-4 font-medium text-[#1A1A1A]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-[#1E5FBF] mx-auto" />
                          </td>
                        </tr>
                      ) : allAppointments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-[#555555]">
                            No appointments found
                          </td>
                        </tr>
                      ) : (
                        allAppointments.map((appointment) => (
                          <tr key={appointment.id || appointment._id} className="border-b border-[#A0A0A0] hover:bg-[#CFE3FF] transition-colors">
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-medium text-[#1A1A1A]">{appointment.patientName}</div>
                                <div className="text-sm text-[#555555]">{appointment.patientEmail}</div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-medium text-[#1A1A1A]">{appointment.doctorName}</div>
                                <div className="text-sm text-[#8A2BE2]">{appointment.doctorSpecialization || 'General'}</div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-medium text-[#1A1A1A]">{appointment.date}</div>
                                <div className="text-sm text-[#555555]">{appointment.time}</div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <StatusBadge status={appointment.status}>
                                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                              </StatusBadge>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <div className="text-sm font-medium text-[#1A1A1A]">
                                  {appointment.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}
                                </div>
                                <div className="text-xs text-[#555555]">
                                  {appointment.paymentMethod && appointment.paymentMethod !== 'N/A' 
                                    ? appointment.paymentMethod.toUpperCase() 
                                    : 'N/A'}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm text-[#555555]">
                                {appointment.patientPhone || 'N/A'}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingAppointment(appointment);
                                    setAppointmentStatus(appointment.status);
                                  }}
                                  className="text-[#1E5FBF] hover:text-[#1B4AA0] transition-colors p-1 rounded hover:bg-[#C4DCFF]"
                                  title="Edit appointment"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    const newStatus = appointment.status === 'cancelled' ? 'scheduled' : 'cancelled';
                                    handleUpdateAppointmentStatus(appointment.id || appointment._id || '', newStatus);
                                  }}
                                  className={`transition-colors p-1 rounded ${
                                    appointment.status === 'cancelled' 
                                      ? 'text-[#008000] hover:text-[#1B5E20] hover:bg-[#C8E6C9]' 
                                      : 'text-[#CC0000] hover:text-[#B71C1C] hover:bg-[#FFCDD2]'
                                  }`}
                                  title={appointment.status === 'cancelled' ? 'Restore appointment' : 'Cancel appointment'}
                                >
                                  {appointment.status === 'cancelled' ? (
                                    <CheckCircle2 className="w-4 h-4" />
                                  ) : (
                                    <XCircle className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {!loading && allAppointments.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#A0A0A0] text-sm text-[#555555]">
                    Total Appointments: {allAppointments.length}
                  </div>
                )}
              </MedicalCard>
            </div>
          )}

          {/* Dashboard Tab Content */}
          {activeTab === 'dashboard' && (
            <>

              {/* Stats Grid */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#1E5FBF]" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {stats.map((stat, index) => {
                    const IconComponent = stat.icon;
                    return (
                      <MedicalCard key={index} variant="filled" hover={false}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-[#555555] mb-2">{stat.label}</p>
                            <h3 className="mb-2" style={{ color: stat.color }}>{stat.value}</h3>
                            <span className="text-xs text-[#008000] bg-[#C8E6C9] px-2 py-1 rounded-full">
                              {stat.change} this month
                            </span>
                          </div>
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${stat.color}20` }}
                          >
                            <IconComponent className="w-6 h-6" style={{ color: stat.color }} />
                          </div>
                        </div>
                      </MedicalCard>
                    );
                  })}
                </div>
              )}

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Monthly Trends */}
                <div className="lg:col-span-2">
                  <MedicalCard variant="filled" hover={false}>
                    <h3 className="mb-4">Monthly Trends</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#A0A0A0" />
                        <XAxis dataKey="month" stroke="#555555" />
                        <YAxis stroke="#555555" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FFFFFF',
                            border: '2px solid #C4DCFF',
                            borderRadius: '12px'
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="patients"
                          stroke="#1E5FBF"
                          strokeWidth={3}
                          name="Patients"
                          dot={{ fill: '#1E5FBF', r: 4 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#008080"
                          strokeWidth={3}
                          name="Revenue (₹)"
                          dot={{ fill: '#008080', r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </MedicalCard>
                </div>

                {/* Department Distribution */}
                <MedicalCard variant="filled" hover={false}>
                  <h3 className="mb-4">Department Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={departmentData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8A72E0"
                        dataKey="value"
                      >
                        {departmentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </MedicalCard>
              </div>

              {/* User Management */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Users */}
                <div className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3>Recent Users</h3>
                    <MedicalButton 
                      variant="outlined" 
                      size="sm"
                      onClick={() => setShowAddUserModal(true)}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add User
                    </MedicalButton>
                  </div>

                  <MedicalCard variant="filled" hover={false}>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#A0A0A0]">
                            <th className="text-left py-3 px-4 text-sm font-medium text-[#555555]">Name</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-[#555555]">Role</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-[#555555]">Email</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-[#555555]">Status</th>
                            <th className="text-left py-3 px-4 text-sm font-medium text-[#555555]">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center">
                                <Loader2 className="w-6 h-6 animate-spin text-[#1E5FBF] mx-auto" />
                              </td>
                            </tr>
                          ) : recentUsers.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-[#555555]">
                                No users found
                              </td>
                            </tr>
                          ) : (
                            recentUsers.map((user) => (
                              <tr key={user.id} className="border-b border-[#A0A0A0] last:border-0">
                                <td className="py-3 px-4 text-[#1A1A1A]">{user.name}</td>
                                <td className="py-3 px-4">
                                  <span className={`text-sm ${user.role === 'doctor' ? 'text-[#1E5FBF]' : 'text-[#555555]'}`}>
                                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-[#555555] text-sm">{user.email}</td>
                                <td className="py-3 px-4">
                                  <StatusBadge status={user.status === 'active' ? 'completed' : user.status === 'pending_approval' ? 'pending' : 'pending'}>
                                    {user.status === 'active' ? 'Active' : user.status === 'pending_approval' ? 'Pending' : user.status}
                                  </StatusBadge>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => handleEditUser(user)}
                                      className="text-[#1E5FBF] hover:text-[#1B4AA0] transition-colors"
                                      title="Edit user"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setDeleteUser(user)}
                                      className="text-[#CC0000] hover:text-[#B71C1C] transition-colors"
                                      title="Delete user"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </MedicalCard>
                </div>

                {/* Quick Actions */}
                <div>
                  <h3 className="mb-4">System Overview</h3>
                  <div className="space-y-3">
                    <MedicalCard variant="pastel" hover={false}>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-[#1E5FBF] mb-1">94%</div>
                        <div className="text-sm text-[#555555]">System Uptime</div>
                      </div>
                    </MedicalCard>

                    <MedicalCard variant="outlined" hover={false}>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-[#008080] mb-1">156</div>
                        <div className="text-sm text-[#555555]">Active Sessions</div>
                      </div>
                    </MedicalCard>

                    <MedicalCard variant="outlined" hover={false}>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-[#8A2BE2] mb-1">2.4TB</div>
                        <div className="text-sm text-[#555555]">Storage Used</div>
                      </div>
                    </MedicalCard>

                    <MedicalButton 
                      variant="primary" 
                      size="md" 
                      className="w-full"
                      onClick={() => setShowExportModal(true)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Generate Report
                    </MedicalButton>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Reports Tab Content */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <MedicalCard variant="filled" hover={false}>
                <h3 className="mb-4">Export Reports</h3>
                <p className="text-[#555555] mb-6">Generate and download reports in CSV or PDF format</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MedicalCard variant="outlined" hover={true} className="cursor-pointer" onClick={() => { setExportResource('users'); setShowExportModal(true); }}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#C4DCFF] flex items-center justify-center">
                        <Users className="w-6 h-6 text-[#1E5FBF]" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#1A1A1A]">Users Report</h4>
                        <p className="text-sm text-[#555555]">Export all user data</p>
                      </div>
                    </div>
                  </MedicalCard>
                  <MedicalCard variant="outlined" hover={true} className="cursor-pointer" onClick={() => { setExportResource('appointments'); setShowExportModal(true); }}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#C8E6C9] flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-[#008000]" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#1A1A1A]">Appointments Report</h4>
                        <p className="text-sm text-[#555555]">Export appointment records</p>
                      </div>
                    </div>
                  </MedicalCard>
                  <MedicalCard variant="outlined" hover={true} className="cursor-pointer" onClick={() => { setExportResource('payments'); setShowExportModal(true); }}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#FFE0B2] flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-[#FF8C00]" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#1A1A1A]">Payments Report</h4>
                        <p className="text-sm text-[#555555]">Export payment transactions</p>
                      </div>
                    </div>
                  </MedicalCard>
                  <MedicalCard variant="outlined" hover={true} className="cursor-pointer" onClick={() => { setExportResource('analytics'); setShowExportModal(true); }}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#E1BEE7] flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-[#8E24AA]" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-[#1A1A1A]">Analytics Report</h4>
                        <p className="text-sm text-[#555555]">Export system analytics</p>
                      </div>
                    </div>
                  </MedicalCard>
                </div>
              </MedicalCard>

              <MedicalCard variant="filled" hover={false}>
                <h3 className="mb-4">System Analytics</h3>
                {analytics && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-[#C4DCFF] rounded-xl">
                      <div className="text-2xl font-bold text-[#1E5FBF] mb-1">{analytics.totalUsers || 0}</div>
                      <div className="text-sm text-[#555555]">Total Users</div>
                    </div>
                    <div className="p-4 bg-[#C8E6C9] rounded-xl">
                      <div className="text-2xl font-bold text-[#008000] mb-1">{analytics.totalAppointments || 0}</div>
                      <div className="text-sm text-[#555555]">Total Appointments</div>
                    </div>
                    <div className="p-4 bg-[#FFE0B2] rounded-xl">
                      <div className="text-2xl font-bold text-[#FF8C00] mb-1">{formatNumber(analytics.totalRevenue || 0)}</div>
                      <div className="text-sm text-[#555555]">Total Revenue</div>
                    </div>
                  </div>
                )}
              </MedicalCard>
            </div>
          )}

          {/* Settings Tab Content */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <MedicalCard variant="filled" hover={false}>
                <h3 className="mb-6">System Configuration</h3>
                {errorMessage && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                    {errorMessage}
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Low Stock Threshold</label>
                    <input
                      type="number"
                      value={systemConfig.lowStockThreshold}
                      onChange={(e) => setSystemConfig({ ...systemConfig, lowStockThreshold: parseInt(e.target.value) || 10 })}
                      className="w-full rounded-xl border-2 border-[#A0A0A0] bg-white px-4 py-2 text-black focus:border-[#1E5FBF] focus:outline-none"
                      min="1"
                    />
                    <p className="text-xs text-[#555555] mt-1">Items below this quantity will be marked as low stock</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="maintenanceMode"
                      checked={systemConfig.maintenanceMode}
                      onChange={(e) => setSystemConfig({ ...systemConfig, maintenanceMode: e.target.checked })}
                      className="w-5 h-5 rounded border-2 border-[#A0A0A0] text-[#1E5FBF] focus:ring-2 focus:ring-[#1E5FBF]"
                    />
                    <label htmlFor="maintenanceMode" className="text-sm font-medium text-[#1A1A1A]">
                      Maintenance Mode
                    </label>
                  </div>
                  <div className="pt-4">
                    <MedicalButton
                      variant="primary"
                      size="md"
                      onClick={handleSaveSystemConfig}
                      disabled={isSavingConfig}
                    >
                      {isSavingConfig ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Configuration
                        </>
                      )}
                    </MedicalButton>
                  </div>
                </div>
              </MedicalCard>
            </div>
          )}
        </main>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <MedicalCard className="w-full max-w-md glass-strong shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Edit User</h3>
              <button
                onClick={handleCancelEdit}
                className="text-[#555555] hover:text-[#1A1A1A] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {errorMessage}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Name</label>
                <input
                  type="text"
                  value={editFormData.name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full rounded-xl border-2 border-[#A0A0A0] bg-white px-4 py-2 text-black focus:border-[#1E5FBF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Email</label>
                <input
                  type="email"
                  value={editFormData.email || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full rounded-xl border-2 border-[#A0A0A0] bg-white px-4 py-2 text-black focus:border-[#1E5FBF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Mobile</label>
                <input
                  type="tel"
                  value={editFormData.mobile || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                  className="w-full rounded-xl border-2 border-[#A0A0A0] bg-white px-4 py-2 text-black focus:border-[#1E5FBF] focus:outline-none"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Gender</label>
                <select
                  value={editFormData.gender || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                  className="w-full rounded-xl border-2 border-[#A0A0A0] bg-white px-4 py-2 text-black focus:border-[#1E5FBF] focus:outline-none"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Role</label>
                <select
                  value={editFormData.role || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  className="w-full rounded-xl border-2 border-[#A0A0A0] bg-white px-4 py-2 text-black focus:border-[#1E5FBF] focus:outline-none"
                >
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Status</label>
                <select
                  value={editFormData.status || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full rounded-xl border-2 border-[#A0A0A0] bg-white px-4 py-2 text-black focus:border-[#1E5FBF] focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <MedicalButton
                  variant="primary"
                  size="md"
                  onClick={handleSaveUser}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </MedicalButton>
                <MedicalButton
                  variant="outlined"
                  size="md"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  Cancel
                </MedicalButton>
              </div>
            </div>
          </MedicalCard>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <MedicalCard className="w-full max-w-md glass-strong shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-[#CC0000]">Delete User</h3>
              <button
                onClick={handleCancelDelete}
                className="text-[#555555] hover:text-[#1A1A1A] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {errorMessage}
              </div>
            )}

            <div className="space-y-4">
              <p className="text-[#1A1A1A]">
                Are you sure you want to delete the user <strong>{deleteUser.name}</strong>?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> This action cannot be undone. All user data will be permanently deleted from the database.
                </p>
              </div>
              <div className="bg-[#CFE3FF] rounded-lg p-3 text-sm">
                <p className="text-[#555555]"><strong>Email:</strong> {deleteUser.email}</p>
                <p className="text-[#555555]"><strong>Role:</strong> {deleteUser.role.charAt(0).toUpperCase() + deleteUser.role.slice(1)}</p>
              </div>

              <div className="flex gap-3 pt-4">
                <MedicalButton
                  variant="primary"
                  size="md"
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                  className="flex-1 bg-[#CC0000] hover:bg-[#B71C1C]"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete User
                    </>
                  )}
                </MedicalButton>
                <MedicalButton
                  variant="outlined"
                  size="md"
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                >
                  Cancel
                </MedicalButton>
              </div>
            </div>
          </MedicalCard>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <MedicalCard className="w-full max-w-md glass-strong shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Add New User</h3>
              <button
                onClick={() => {
                  setShowAddUserModal(false);
                  setNewUserData({ name: '', email: '', mobile: '', gender: '', role: 'patient', status: 'active' });
                  setErrorMessage(null);
                }}
                className="text-[#555555] hover:text-[#1A1A1A] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {errorMessage}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Name *</label>
                <input
                  type="text"
                  value={newUserData.name || ''}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  className="w-full rounded-xl border-2 border-[#A0A0A0] bg-white px-4 py-2 text-black focus:border-[#1E5FBF] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Email *</label>
                <input
                  type="email"
                  value={newUserData.email || ''}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  className="w-full rounded-xl border-2 border-[#A0A0A0] bg-white px-4 py-2 text-black focus:border-[#1E5FBF] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Mobile</label>
                <input
                  type="tel"
                  value={newUserData.mobile || ''}
                  onChange={(e) => setNewUserData({ ...newUserData, mobile: e.target.value })}
                  className="w-full rounded-xl border-2 border-[#A0A0A0] bg-white px-4 py-2 text-black focus:border-[#1E5FBF] focus:outline-none"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Gender</label>
                <select
                  value={newUserData.gender || ''}
                  onChange={(e) => setNewUserData({ ...newUserData, gender: e.target.value })}
                  className="w-full rounded-xl border-2 border-[#A0A0A0] bg-white px-4 py-2 text-black focus:border-[#1E5FBF] focus:outline-none"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Role *</label>
                <select
                  value={newUserData.role || 'patient'}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                  className="w-full rounded-xl border-2 border-[#A0A0A0] bg-white px-4 py-2 text-black focus:border-[#1E5FBF] focus:outline-none"
                >
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Status *</label>
                <select
                  value={newUserData.status || 'active'}
                  onChange={(e) => setNewUserData({ ...newUserData, status: e.target.value })}
                  className="w-full rounded-xl border-2 border-[#A0A0A0] bg-white px-4 py-2 text-black focus:border-[#1E5FBF] focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <MedicalButton
                  variant="primary"
                  size="md"
                  onClick={handleCreateUser}
                  disabled={isCreatingUser}
                  className="flex-1"
                >
                  {isCreatingUser ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create User
                    </>
                  )}
                </MedicalButton>
                <MedicalButton
                  variant="outlined"
                  size="md"
                  onClick={() => {
                    setShowAddUserModal(false);
                    setNewUserData({ name: '', email: '', mobile: '', gender: '', role: 'patient', status: 'active' });
                    setErrorMessage(null);
                  }}
                  disabled={isCreatingUser}
                >
                  Cancel
                </MedicalButton>
              </div>
            </div>
          </MedicalCard>
        </div>
      )}

      {/* Export Report Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <MedicalCard className="w-full max-w-md glass-strong shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Export Report</h3>
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setErrorMessage(null);
                }}
                className="text-[#555555] hover:text-[#1A1A1A] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {errorMessage}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Resource</label>
                <select
                  value={exportResource}
                  onChange={(e) => setExportResource(e.target.value as any)}
                  className="w-full rounded-xl border-2 border-[#A0A0A0] bg-white px-4 py-2 text-black focus:border-[#1E5FBF] focus:outline-none"
                >
                  <option value="users">Users</option>
                  <option value="appointments">Appointments</option>
                  <option value="payments">Payments</option>
                  <option value="logs">Activity Logs</option>
                  <option value="analytics">Analytics</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Format</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'csv' | 'pdf')}
                  className="w-full rounded-xl border-2 border-[#A0A0A0] bg-white px-4 py-2 text-black focus:border-[#1E5FBF] focus:outline-none"
                >
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <MedicalButton
                  variant="primary"
                  size="md"
                  onClick={handleExportReport}
                  disabled={isExporting}
                  className="flex-1"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Export Report
                    </>
                  )}
                </MedicalButton>
                <MedicalButton
                  variant="outlined"
                  size="md"
                  onClick={() => {
                    setShowExportModal(false);
                    setErrorMessage(null);
                  }}
                  disabled={isExporting}
                >
                  Cancel
                </MedicalButton>
              </div>
            </div>
          </MedicalCard>
        </div>
      )}

      {/* Edit Appointment Modal */}
      {editingAppointment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <MedicalCard className="w-full max-w-md glass-strong shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Update Appointment Status</h3>
              <button
                onClick={() => {
                  setEditingAppointment(null);
                  setAppointmentStatus('');
                  setErrorMessage(null);
                }}
                className="text-[#555555] hover:text-[#1A1A1A] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {errorMessage}
              </div>
            )}

            <div className="space-y-4">
              <div className="bg-[#CFE3FF] rounded-lg p-4">
                <p className="text-sm text-[#555555] mb-1"><strong>Patient:</strong> {editingAppointment.patientName}</p>
                <p className="text-sm text-[#555555] mb-1"><strong>Doctor:</strong> {editingAppointment.doctorName}</p>
                <p className="text-sm text-[#555555]"><strong>Date:</strong> {editingAppointment.date} at {editingAppointment.time}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Status</label>
                <select
                  value={appointmentStatus}
                  onChange={(e) => setAppointmentStatus(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#A0A0A0] bg-white px-4 py-2 text-black focus:border-[#1E5FBF] focus:outline-none"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <MedicalButton
                  variant="primary"
                  size="md"
                  onClick={() => {
                    if (appointmentStatus) {
                      handleUpdateAppointmentStatus(editingAppointment.id || editingAppointment._id || '', appointmentStatus);
                    }
                  }}
                  disabled={!appointmentStatus}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Update Status
                </MedicalButton>
                <MedicalButton
                  variant="outlined"
                  size="md"
                  onClick={() => {
                    setEditingAppointment(null);
                    setAppointmentStatus('');
                    setErrorMessage(null);
                  }}
                >
                  Cancel
                </MedicalButton>
              </div>
            </div>
          </MedicalCard>
        </div>
      )}
    </div>
  );
}
