import React, { useState, useEffect } from 'react';
import { Logo } from '../branding/Logo';
import { MedicalCard } from '../ui-kit/MedicalCard';
import { StatusBadge } from '../ui-kit/StatusBadge';
import { MedicalButton } from '../ui-kit/MedicalButton';
import {
  Calendar,
  Users,
  Clock,
  Bell,
  Settings,
  LogOut,
  Video,
  FileText,
  TrendingUp,
  Loader2,
  X,
  User,
  CreditCard,
  ChevronDown
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { NavigateFn, UserRole, UserInfo } from '../../types/navigation';
import { doctorAPI, type DashboardStats, type Appointment, type Notification } from '../../src/services/doctorService';
import { DoctorPatients } from './doctor/DoctorPatients';
import { DoctorRecords } from './doctor/DoctorRecords';
import { TodayAppointmentsList } from '../doctor/TodayAppointmentsList';
import { PrescriptionModal } from '../doctor/PrescriptionModal';
import { PatientQuickLookup } from '../doctor/PatientQuickLookup';
import { AddPatientModal } from '../doctor/AddPatientModal';
import { CreatePrescriptionModal } from '../doctor/CreatePrescriptionModal';
import { NotificationDropdown } from '../doctor/NotificationDropdown';

interface DoctorDashboardProps {
  onNavigate: NavigateFn;
  onLogout?: () => void;
  userRole?: UserRole | null;
  userInfo?: UserInfo | null;
}

type DoctorSection = 'dashboard' | 'schedule' | 'patients' | 'records' | 'analytics' | 'settings';

export function DoctorDashboard({ onNavigate, onLogout, userInfo }: DoctorDashboardProps) {
  // Current section state
  const [currentSection, setCurrentSection] = useState<DoctorSection>('dashboard');

  // State for dashboard data
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [prescriptionAppointment, setPrescriptionAppointment] = useState<Appointment | null>(null);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [showCreatePrescriptionModal, setShowCreatePrescriptionModal] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Loading and error states
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Fetch dashboard stats
  useEffect(() => {
    // Only fetch if on dashboard section
    if (currentSection !== 'dashboard') return;

    const fetchStats = async () => {
      try {
        setLoadingStats(true);
        setError(null);
        console.log('Fetching dashboard stats...');
        const stats = await doctorAPI.getDashboardStats();
        console.log('Dashboard stats received:', stats);
        setDashboardStats(stats);
      } catch (err: any) {
        console.error('Error fetching dashboard stats:', err);
        const errorMessage = err.isNetworkError
          ? 'Cannot connect to server. Make sure backend is running on port 3001.'
          : err.response?.data?.message || err.message || 'Failed to load dashboard stats';
        setError(errorMessage);
        console.error('Full error:', err.response?.data || err);
        // Set default values on error
        setDashboardStats({
          todayPatientsCount: 0,
          weeklyAppointmentsCount: 0,
          satisfactionPercentage: 0,
          monthlyEarnings: 0
        });
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [currentSection]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.profile-menu-container')) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch today's appointments
  useEffect(() => {
    // Only fetch if on dashboard or schedule section
    if (currentSection !== 'dashboard' && currentSection !== 'schedule') return;

    const fetchAppointments = async () => {
      try {
        setLoadingAppointments(true);
        setError(null);
        console.log('Fetching today\'s appointments...');
        const appointments = await doctorAPI.getTodayAppointments();
        console.log('Appointments received:', appointments);
        setTodayAppointments(appointments);
      } catch (err: any) {
        console.error('Error fetching appointments:', err);
        const errorMessage = err.isNetworkError
          ? 'Cannot connect to server. Make sure backend is running on port 3001.'
          : err.response?.data?.message || err.message || 'Failed to load appointments';
        setError(errorMessage);
        console.error('Full error:', err.response?.data || err);
        setTodayAppointments([]);
      } finally {
        setLoadingAppointments(false);
      }
    };

    fetchAppointments();
  }, [currentSection]);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoadingNotifications(true);
        const result = await doctorAPI.getNotifications({ limit: 10 });
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
      } catch (err: any) {
        console.error('Error fetching notifications:', err);
        setNotifications([]);
      } finally {
        setLoadingNotifications(false);
      }
    };

    fetchNotifications();
    // Poll notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch analytics
  useEffect(() => {
    if (currentSection !== 'analytics' && currentSection !== 'dashboard') return;

    const fetchAnalytics = async () => {
      try {
        setLoadingAnalytics(true);
        const data = await doctorAPI.getAnalytics();
        setAnalytics(data);
      } catch (err: any) {
        console.error('Error fetching analytics:', err);
        setAnalytics(null);
      } finally {
        setLoadingAnalytics(false);
      }
    };

    fetchAnalytics();
  }, [currentSection]);

  const handlePrescribe = (appointment: Appointment) => {
    setPrescriptionAppointment(appointment);
    setShowPrescriptionModal(true);
  };

  const handlePrescriptionSuccess = () => {
    // Refresh appointments and analytics
    if (currentSection === 'dashboard' || currentSection === 'schedule') {
      const fetchAppointments = async () => {
        try {
          const appointments = await doctorAPI.getTodayAppointments();
          setTodayAppointments(appointments);
        } catch (err) {
          console.error('Error refreshing appointments:', err);
        }
      };
      fetchAppointments();
    }
    if (currentSection === 'analytics' || currentSection === 'dashboard') {
      const fetchAnalytics = async () => {
        try {
          const data = await doctorAPI.getAnalytics();
          setAnalytics(data);
        } catch (err) {
          console.error('Error refreshing analytics:', err);
        }
      };
      fetchAnalytics();
    }
  };

  const handleViewPatient = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentDetails(true);
  };

  // Format earnings for display
  const formatEarnings = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(0)}K`;
    }
    return `₹${amount}`;
  };

  // Format time from 24h to 12h format
  const formatTime = (time: string) => {
    // If already in 12h format (contains AM/PM), return as is
    if (time.includes('AM') || time.includes('PM')) {
      return time;
    }
    // Convert 24h to 12h format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Chart data from analytics or fallback to static
  const weeklyData = analytics?.weekCounts?.map((item: any) => ({
    day: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
    patients: item.count
  })) || [
    { day: 'Mon', patients: 0 },
    { day: 'Tue', patients: 0 },
    { day: 'Wed', patients: 0 },
    { day: 'Thu', patients: 0 },
    { day: 'Fri', patients: 0 },
    { day: 'Sat', patients: 0 },
    { day: 'Sun', patients: 0 },
  ];

  const monthlyRevenue = analytics?.monthRevenue?.map((item: any) => ({
    month: item.month,
    revenue: item.revenue
  })) || [
    { month: 'Jul', revenue: 0 },
    { month: 'Aug', revenue: 0 },
    { month: 'Sep', revenue: 0 },
    { month: 'Oct', revenue: 0 },
    { month: 'Nov', revenue: 0 },
  ];

  return (
    <div className="min-h-screen bg-[#F5F3FA]">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Logo variant="primary" size="md" />
            <div className="flex items-center gap-4">
              <NotificationDropdown
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAsRead={(notificationId) => {
                  setNotifications(prev => 
                    prev.map(n => (n._id === notificationId || n.id === notificationId) 
                      ? { ...n, isRead: true } 
                      : n
                    )
                  );
                  setUnreadCount(prev => Math.max(0, prev - 1));
                }}
                onMarkAllAsRead={() => {
                  setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                  setUnreadCount(0);
                }}
                onRefresh={async () => {
                  try {
                    const result = await doctorAPI.getNotifications({ limit: 10 });
                    setNotifications(result.notifications);
                    setUnreadCount(result.unreadCount);
                  } catch (err) {
                    console.error('Error refreshing notifications', err);
                  }
                }}
              />
              <div className="relative profile-menu-container">
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-3 hover:bg-[#F5F3FA] rounded-lg p-2"
                >
                  <div className="w-10 h-10 rounded-full bg-[#E8EAFF] flex items-center justify-center">
                    <Users className="w-6 h-6 text-[#3F53D9]" />
                  </div>
                  <div className="text-left hidden md:block">
                    <div className="text-sm font-medium text-[#333333]">
                      {userInfo?.name ? `Dr. ${userInfo.name}` : 'Doctor'}
                    </div>
                    <div className="text-xs text-[#6E6E6E]">
                      {userInfo?.email || 'Doctor Account'}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#6E6E6E] hidden md:block" />
                </button>
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#E5E5E5] z-50">
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          setCurrentSection('settings');
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#F5F3FA] rounded-lg text-sm text-[#333333] flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Profile Settings
                      </button>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onLogout ? onLogout() : onNavigate('landing');
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#FFEBEE] rounded-lg text-sm text-[#E53935] flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
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
              onClick={() => setCurrentSection('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${currentSection === 'dashboard'
                ? 'bg-[#E8EAFF] text-[#3F53D9]'
                : 'hover:bg-[#F5F3FA] text-[#6E6E6E]'
                }`}
            >
              <Calendar className="w-5 h-5" />
              Dashboard
            </button>
            <button
              onClick={() => setCurrentSection('schedule')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${currentSection === 'schedule'
                ? 'bg-[#E8EAFF] text-[#3F53D9]'
                : 'hover:bg-[#F5F3FA] text-[#6E6E6E]'
                }`}
            >
              <Clock className="w-5 h-5" />
              Schedule
            </button>
            <button
              onClick={() => setCurrentSection('patients')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${currentSection === 'patients'
                ? 'bg-[#E8EAFF] text-[#3F53D9]'
                : 'hover:bg-[#F5F3FA] text-[#6E6E6E]'
                }`}
            >
              <Users className="w-5 h-5" />
              Patients
            </button>
            <button
              onClick={() => setCurrentSection('records')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${currentSection === 'records'
                ? 'bg-[#E8EAFF] text-[#3F53D9]'
                : 'hover:bg-[#F5F3FA] text-[#6E6E6E]'
                }`}
            >
              <FileText className="w-5 h-5" />
              Records
            </button>
            <button
              onClick={() => setCurrentSection('analytics')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${currentSection === 'analytics'
                ? 'bg-[#E8EAFF] text-[#3F53D9]'
                : 'hover:bg-[#F5F3FA] text-[#6E6E6E]'
                }`}
            >
              <TrendingUp className="w-5 h-5" />
              Analytics
            </button>
            <button
              onClick={() => setCurrentSection('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${currentSection === 'settings'
                ? 'bg-[#E8EAFF] text-[#3F53D9]'
                : 'hover:bg-[#F5F3FA] text-[#6E6E6E]'
                }`}
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
            <div className="pt-4 border-t border-[#E5E5E5]">
              <button
                onClick={() => onLogout ? onLogout() : onNavigate('landing')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#FFEBEE] text-[#E53935]"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 max-w-7xl">
          {/* Render different sections based on currentSection */}
          {currentSection === 'dashboard' && (
            <>
              {/* Welcome Banner */}
              <div className="mb-8">
                <h2>Good Morning, {userInfo?.name ? `Dr. ${userInfo.name}` : 'Doctor'}!</h2>
                <p className="text-[#6E6E6E]">
                  {loadingAppointments ? (
                    'Loading appointments...'
                  ) : (
                    `You have ${todayAppointments.length} appointment${todayAppointments.length !== 1 ? 's' : ''} today`
                  )}
                </p>
                {error && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    ⚠️ {error}
                    {error.includes('connect to server') && (
                      <div className="mt-2 text-xs">
                        Make sure the backend server is running: <code className="bg-red-100 px-2 py-1 rounded">npm run server</code>
                      </div>
                    )}
                    {error.includes('No data') && (
                      <div className="mt-2 text-xs">
                        Tip: Run the seed script to add sample data: <code className="bg-red-100 px-2 py-1 rounded">node server/scripts/seedDoctorData.js YOUR_DOCTOR_ID</code>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <MedicalCard variant="pastel" hover={false}>
                  <div className="flex items-center justify-between">
                    <div>
                      {loadingStats ? (
                        <Loader2 className="w-8 h-8 text-[#3F53D9] animate-spin" />
                      ) : (
                        <div className="text-3xl font-bold text-[#3F53D9]">
                          {dashboardStats?.todayPatientsCount ?? 0}
                        </div>
                      )}
                      <div className="text-sm text-[#6E6E6E] mt-1">Today's Patients</div>
                    </div>
                    <Users className="w-8 h-8 text-[#7C74EB]" />
                  </div>
                </MedicalCard>

                <MedicalCard variant="filled" hover={false}>
                  <div className="flex items-center justify-between">
                    <div>
                      {loadingStats ? (
                        <Loader2 className="w-8 h-8 text-[#7C74EB] animate-spin" />
                      ) : (
                        <div className="text-3xl font-bold text-[#7C74EB]">
                          {dashboardStats?.weeklyAppointmentsCount ?? 0}
                        </div>
                      )}
                      <div className="text-sm text-[#6E6E6E] mt-1">This Week</div>
                    </div>
                    <Calendar className="w-8 h-8 text-[#7C74EB]" />
                  </div>
                </MedicalCard>

                <MedicalCard variant="filled" hover={false}>
                  <div className="flex items-center justify-between">
                    <div>
                      {loadingStats ? (
                        <Loader2 className="w-8 h-8 text-[#34D1BF] animate-spin" />
                      ) : (
                        <div className="text-3xl font-bold text-[#34D1BF]">
                          {dashboardStats?.satisfactionPercentage ?? 0}%
                        </div>
                      )}
                      <div className="text-sm text-[#6E6E6E] mt-1">Satisfaction</div>
                    </div>
                    <TrendingUp className="w-8 h-8 text-[#34D1BF]" />
                  </div>
                </MedicalCard>

                <MedicalCard variant="filled" hover={false}>
                  <div className="flex items-center justify-between">
                    <div>
                      {loadingStats ? (
                        <Loader2 className="w-8 h-8 text-[#4CAF50] animate-spin" />
                      ) : (
                        <div className="text-3xl font-bold text-[#4CAF50]">
                          {dashboardStats ? formatEarnings(dashboardStats.monthlyEarnings) : '₹0'}
                        </div>
                      )}
                      <div className="text-sm text-[#6E6E6E] mt-1">This Month</div>
                    </div>
                    <TrendingUp className="w-8 h-8 text-[#4CAF50]" />
                  </div>
                </MedicalCard>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today's Appointments */}
                <div className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3>Today's Schedule</h3>
                    <MedicalButton variant="outlined" size="sm">
                      View All
                    </MedicalButton>
                  </div>

                  <TodayAppointmentsList
                    appointments={todayAppointments}
                    onStatusUpdate={() => {
                      const fetchAppointments = async () => {
                        try {
                          const appointments = await doctorAPI.getTodayAppointments();
                          setTodayAppointments(appointments);
                        } catch (err) {
                          console.error('Error refreshing appointments:', err);
                        }
                      };
                      fetchAppointments();
                    }}
                    onPrescribe={handlePrescribe}
                    onViewPatient={handleViewPatient}
                  />
                </div>

                {/* Quick Actions */}
                <div>
                  <h3 className="mb-4">Quick Actions</h3>
                  
                  {/* Patient Quick Lookup */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-[#6E6E6E] mb-2">Quick Patient Lookup</label>
                    <PatientQuickLookup
                      onSelectPatient={(patient) => {
                        alert(`Selected patient: ${patient.name}\nEmail: ${patient.email}\nPhone: ${patient.mobile || 'N/A'}`);
                      }}
                    />
                  </div>

                  <div className="space-y-3">
                    <MedicalCard variant="outlined" hover={true} className="cursor-pointer" onClick={() => setShowAddPatientModal(true)}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#E8EAFF] flex items-center justify-center">
                          <Users className="w-5 h-5 text-[#3F53D9]" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-[#333333]">Add Patient</div>
                          <div className="text-xs text-[#6E6E6E]">Register new patient</div>
                        </div>
                      </div>
                    </MedicalCard>

                    <MedicalCard variant="outlined" hover={true} className="cursor-pointer" onClick={() => setShowCreatePrescriptionModal(true)}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#F0EDFF] flex items-center justify-center">
                          <FileText className="w-5 h-5 text-[#7C74EB]" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-[#333333]">Create Prescription</div>
                          <div className="text-xs text-[#6E6E6E]">Write new prescription</div>
                        </div>
                      </div>
                    </MedicalCard>

                    <MedicalCard variant="outlined" hover={true} className="cursor-pointer" onClick={() => setCurrentSection('schedule')}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#E8F5E9] flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-[#4CAF50]" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-[#333333]">Manage Schedule</div>
                          <div className="text-xs text-[#6E6E6E]">Update availability</div>
                        </div>
                      </div>
                    </MedicalCard>
                  </div>
                </div>
              </div>

              {/* Analytics Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Weekly Patients */}
                <MedicalCard variant="filled" hover={false}>
                  <h3 className="mb-4">Weekly Patients</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                      <XAxis dataKey="day" stroke="#6E6E6E" />
                      <YAxis stroke="#6E6E6E" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '2px solid #E8EAFF',
                          borderRadius: '12px'
                        }}
                      />
                      <Bar dataKey="patients" fill="#7C74EB" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </MedicalCard>

                {/* Monthly Revenue */}
                <MedicalCard variant="filled" hover={false}>
                  <h3 className="mb-4">Monthly Revenue</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                      <XAxis dataKey="month" stroke="#6E6E6E" />
                      <YAxis stroke="#6E6E6E" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '2px solid #E8EAFF',
                          borderRadius: '12px'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#3F53D9"
                        strokeWidth={3}
                        dot={{ fill: '#3F53D9', r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </MedicalCard>
              </div>
            </>
          )}

          {currentSection === 'schedule' && (
            <div>
              <h2 className="mb-6">Schedule Management</h2>
              <TodayAppointmentsList
                appointments={todayAppointments}
                onStatusUpdate={() => {
                  const fetchAppointments = async () => {
                    try {
                      const appointments = await doctorAPI.getTodayAppointments();
                      setTodayAppointments(appointments);
                    } catch (err) {
                      console.error('Error refreshing appointments:', err);
                    }
                  };
                  fetchAppointments();
                }}
                onPrescribe={handlePrescribe}
                onViewPatient={handleViewPatient}
              />
            </div>
          )}

          {currentSection === 'patients' && (
            <DoctorPatients />
          )}

          {currentSection === 'records' && (
            <DoctorRecords />
          )}

          {currentSection === 'analytics' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2>Analytics & Reports</h2>
                <div className="flex gap-2">
                  <MedicalButton
                    variant="outlined"
                    size="sm"
                    onClick={async () => {
                      const from = new Date();
                      from.setMonth(from.getMonth() - 1);
                      const to = new Date();
                      try {
                        const blob = await doctorAPI.exportReport(
                          from.toISOString().split('T')[0],
                          to.toISOString().split('T')[0],
                          'csv'
                        );
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `doctor-report-${from.toISOString().split('T')[0]}-to-${to.toISOString().split('T')[0]}.csv`;
                        a.click();
                        window.URL.revokeObjectURL(url);
                      } catch (err) {
                        console.error('Export error:', err);
                        alert('Failed to export report');
                      }
                    }}
                  >
                    Export CSV
                  </MedicalButton>
                  <MedicalButton
                    variant="outlined"
                    size="sm"
                    onClick={async () => {
                      const from = new Date();
                      from.setMonth(from.getMonth() - 1);
                      const to = new Date();
                      try {
                        const data = await doctorAPI.exportReport(
                          from.toISOString().split('T')[0],
                          to.toISOString().split('T')[0],
                          'pdf'
                        );
                        // For PDF, you can use a library like jsPDF or pdfmake
                        // For now, just show the data
                        console.log('PDF data:', data);
                        alert('PDF export data ready. In production, use a PDF library to generate the file.');
                      } catch (err) {
                        console.error('Export error:', err);
                        alert('Failed to export report');
                      }
                    }}
                  >
                    Export PDF
                  </MedicalButton>
                </div>
              </div>

              {loadingAnalytics ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-[#3F53D9] animate-spin" />
                </div>
              ) : (
                <>
                  {/* Analytics Summary */}
                  {analytics && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <MedicalCard variant="filled" hover={false}>
                        <div className="text-sm text-[#6E6E6E] mb-1">Today's Patients</div>
                        <div className="text-3xl font-bold text-[#3F53D9]">{analytics.todayCount || 0}</div>
                      </MedicalCard>
                      <MedicalCard variant="filled" hover={false}>
                        <div className="text-sm text-[#6E6E6E] mb-1">Avg. Appointment Duration</div>
                        <div className="text-3xl font-bold text-[#7C74EB]">{analytics.avgAppointmentDuration || 0} min</div>
                      </MedicalCard>
                      <MedicalCard variant="filled" hover={false}>
                        <div className="text-sm text-[#6E6E6E] mb-1">Top Diagnoses</div>
                        <div className="text-lg font-semibold text-[#34D1BF]">
                          {analytics.topDiagnoses?.length > 0 ? analytics.topDiagnoses[0]?.diagnosis || 'N/A' : 'N/A'}
                        </div>
                      </MedicalCard>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <MedicalCard variant="filled" hover={false}>
                      <h3 className="mb-4">Weekly Patients</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={weeklyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                          <XAxis dataKey="day" stroke="#6E6E6E" />
                          <YAxis stroke="#6E6E6E" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: '2px solid #E8EAFF',
                              borderRadius: '12px'
                            }}
                          />
                          <Bar dataKey="patients" fill="#7C74EB" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </MedicalCard>

                    <MedicalCard variant="filled" hover={false}>
                      <h3 className="mb-4">Monthly Revenue</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={monthlyRevenue}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                          <XAxis dataKey="month" stroke="#6E6E6E" />
                          <YAxis stroke="#6E6E6E" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: '2px solid #E8EAFF',
                              borderRadius: '12px'
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#3F53D9"
                            strokeWidth={3}
                            dot={{ fill: '#3F53D9', r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </MedicalCard>
                  </div>

                  {/* Top Diagnoses */}
                  {analytics?.topDiagnoses && analytics.topDiagnoses.length > 0 && (
                    <MedicalCard variant="filled" className="mt-6">
                      <h3 className="mb-4">Top Diagnoses</h3>
                      <div className="space-y-2">
                        {analytics.topDiagnoses.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-[#F5F3FA] rounded-lg">
                            <span className="font-medium">{item.diagnosis}</span>
                            <span className="text-[#3F53D9] font-semibold">{item.count} cases</span>
                          </div>
                        ))}
                      </div>
                    </MedicalCard>
                  )}
                </>
              )}
            </div>
          )}

          {currentSection === 'settings' && (
            <div>
              <h2 className="mb-6">Settings</h2>
              <MedicalCard variant="filled">
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="mb-2">Profile Information</h3>
                    <div className="space-y-2 text-[#6E6E6E]">
                      <p><strong>Name:</strong> {userInfo?.name ? `Dr. ${userInfo.name}` : 'Not set'}</p>
                      <p><strong>Email:</strong> {userInfo?.email || 'Not set'}</p>
                      <p><strong>Role:</strong> {userInfo?.role || 'doctor'}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-[#E5E5E5]">
                    <h3 className="mb-2">Account Actions</h3>
                    <MedicalButton
                      variant="outlined"
                      onClick={() => onLogout ? onLogout() : onNavigate('landing')}
                    >
                      Logout
                    </MedicalButton>
                  </div>
                </div>
              </MedicalCard>
            </div>
          )}
        </main>

        {/* Prescription Modal */}
        <PrescriptionModal
          appointment={prescriptionAppointment}
          isOpen={showPrescriptionModal}
          onClose={() => {
            setShowPrescriptionModal(false);
            setPrescriptionAppointment(null);
          }}
          onSuccess={handlePrescriptionSuccess}
        />

        {/* Add Patient Modal */}
        <AddPatientModal
          isOpen={showAddPatientModal}
          onClose={() => setShowAddPatientModal(false)}
          onSuccess={() => {
            // Refresh dashboard stats
            if (currentSection === 'dashboard') {
              const fetchStats = async () => {
                try {
                  const stats = await doctorAPI.getDashboardStats();
                  setDashboardStats(stats);
                } catch (err) {
                  console.error('Error refreshing stats', err);
                }
              };
              fetchStats();
            }
          }}
        />

        {/* Create Prescription Modal */}
        <CreatePrescriptionModal
          isOpen={showCreatePrescriptionModal}
          onClose={() => setShowCreatePrescriptionModal(false)}
          onSuccess={() => {
            // Refresh dashboard stats
            if (currentSection === 'dashboard') {
              const fetchStats = async () => {
                try {
                  const stats = await doctorAPI.getDashboardStats();
                  setDashboardStats(stats);
                } catch (err) {
                  console.error('Error refreshing stats', err);
                }
              };
              fetchStats();
            }
          }}
        />

        {/* Appointment Details Modal */}
        {showAppointmentDetails && selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <MedicalCard className="w-full max-w-2xl glass-strong shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6 sticky top-0 bg-white/80 dark:bg-gray-800/80 py-4 -mx-6 px-6 border-b border-[#E8EAFF]">
                <h3 className="text-xl font-semibold">Appointment Details</h3>
                <button
                  onClick={() => setShowAppointmentDetails(false)}
                  className="text-[#6E6E6E] hover:text-[#333333] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Patient Information */}
                <div>
                  <h4 className="font-medium text-lg mb-3 flex items-center gap-2">
                    <User className="w-5 h-5 text-[#3F53D9]" />
                    Patient Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F5F3FA] p-4 rounded-xl">
                    <div>
                      <div className="text-sm text-[#6E6E6E]">Name</div>
                      <div className="font-medium">{selectedAppointment.patientName}</div>
                    </div>
                    <div>
                      <div className="text-sm text-[#6E6E6E]">Email</div>
                      <div className="font-medium">{selectedAppointment.patientEmail}</div>
                    </div>
                    <div>
                      <div className="text-sm text-[#6E6E6E]">Phone</div>
                      <div className="font-medium">{selectedAppointment.patientPhone || 'Not provided'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-[#6E6E6E]">Age</div>
                      <div className="font-medium">{selectedAppointment.patientAge ? `${selectedAppointment.patientAge} years` : 'Not provided'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-[#6E6E6E]">Gender</div>
                      <div className="font-medium">{selectedAppointment.patientGender || 'Not provided'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-[#6E6E6E]">Blood Type</div>
                      <div className="font-medium">{selectedAppointment.patientBloodType || 'Not provided'}</div>
                    </div>
                    {selectedAppointment.patientEmergencyContact && (
                      <div>
                        <div className="text-sm text-[#6E6E6E]">Emergency Contact</div>
                        <div className="font-medium">{selectedAppointment.patientEmergencyContact}</div>
                      </div>
                    )}
                  </div>
                  {selectedAppointment.patientAddress && (
                    <div className="mt-3">
                      <div className="text-sm text-[#6E6E6E]">Address</div>
                      <div className="font-medium">{selectedAppointment.patientAddress}</div>
                    </div>
                  )}
                </div>

                {/* Appointment Details */}
                <div>
                  <h4 className="font-medium text-lg mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#3F53D9]" />
                    Appointment Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F5F3FA] p-4 rounded-xl">
                    <div>
                      <div className="text-sm text-[#6E6E6E]">Date</div>
                      <div className="font-medium">{new Date(selectedAppointment.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    </div>
                    <div>
                      <div className="text-sm text-[#6E6E6E]">Time</div>
                      <div className="font-medium">{selectedAppointment.time}</div>
                    </div>
                    <div>
                      <div className="text-sm text-[#6E6E6E]">Type</div>
                      <div className="font-medium capitalize">{selectedAppointment.type}</div>
                    </div>
                    <div>
                      <div className="text-sm text-[#6E6E6E]">Status</div>
                      <div className="font-medium">
                        <StatusBadge status={selectedAppointment.status}>
                          {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                        </StatusBadge>
                      </div>
                    </div>
                    {selectedAppointment.location && (
                      <div className="md:col-span-2">
                        <div className="text-sm text-[#6E6E6E]">Location</div>
                        <div className="font-medium">{selectedAppointment.location}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reason/Notes */}
                {(selectedAppointment.reason || selectedAppointment.notes) && (
                  <div>
                    <h4 className="font-medium text-lg mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#3F53D9]" />
                      Reason for Visit
                    </h4>
                    <div className="bg-[#F5F3FA] p-4 rounded-xl">
                      <div className="font-medium">{selectedAppointment.reason || selectedAppointment.notes}</div>
                    </div>
                  </div>
                )}

                {/* Payment Information */}
                <div>
                  <h4 className="font-medium text-lg mb-3 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#3F53D9]" />
                    Payment Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F5F3FA] p-4 rounded-xl">
                    <div>
                      <div className="text-sm text-[#6E6E6E]">Status</div>
                      <div className="font-medium">
                        {selectedAppointment.paymentStatus === 'paid' ? (
                          <span className="text-green-600">✅ Paid</span>
                        ) : selectedAppointment.paymentStatus === 'failed' ? (
                          <span className="text-red-600">❌ Failed</span>
                        ) : (
                          <span className="text-yellow-600">⏳ Pending</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-[#6E6E6E]">Method</div>
                      <div className="font-medium capitalize">
                        {selectedAppointment.paymentMethod ? selectedAppointment.paymentMethod.replace('upi', 'UPI').replace('card', 'Card').replace('netbanking', 'Net Banking') : 'Not specified'}
                      </div>
                    </div>
                    {selectedAppointment.paymentId && (
                      <div>
                        <div className="text-sm text-[#6E6E6E]">Transaction ID</div>
                        <div className="font-medium text-sm font-mono">{selectedAppointment.paymentId}</div>
                      </div>
                    )}
                    {selectedAppointment.transactionTime && (
                      <div>
                        <div className="text-sm text-[#6E6E6E]">Transaction Time</div>
                        <div className="font-medium text-sm">
                          {new Date(selectedAppointment.transactionTime).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[#6E6E6E] pt-4 border-t border-[#E8EAFF]">
                  <div>
                    <div>Created</div>
                    <div>
                      {new Date(selectedAppointment.createdAt).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div>
                    <div>Last Updated</div>
                    <div>
                      {new Date(selectedAppointment.updatedAt).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </MedicalCard>
          </div>
        )}
      </div>
    </div>
  );
}
