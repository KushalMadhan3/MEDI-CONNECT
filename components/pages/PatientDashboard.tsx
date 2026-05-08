import React, { useState, useEffect } from 'react';
import { Logo } from '../branding/Logo';
import { MedicalCard } from '../ui-kit/MedicalCard';
import { StatusBadge } from '../ui-kit/StatusBadge';
import { MedicalButton } from '../ui-kit/MedicalButton';
import { MedicalBackground } from '../illustrations/MedicalBackground';
import {
  Calendar,
  FileText,
  Pill,
  User,
  Bell,
  Settings,
  LogOut,
  Clock,
  MapPin,
  Download,
  Home,
  CalendarPlus,
  ChevronRight,
  ChevronDown,
  Activity,
  Stethoscope,
  ShoppingBag,
  Upload,
  Package
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import type { NavigateFn, UserRole, UserInfo } from '../../types/navigation';
import { DoctorCategorySection } from '../patient/DoctorCategorySection';
import MedicineMarketplace from '../patient/MedicineMarketplace';
import { PrescriptionUpload } from '../patient/PrescriptionUpload';
import { ProfileSettings } from '../patient/ProfileSettings';
import OrdersPage from '../patient/OrdersPage';
import { NotificationDropdown } from '../shared/NotificationDropdown';

interface PatientDashboardProps {
  onNavigate: NavigateFn;
  onLogout?: () => void;
  userRole?: UserRole | null;
  userInfo?: UserInfo | null;
}

type Tab = 'home' | 'appointments' | 'marketplace' | 'prescriptions' | 'orders' | 'records' | 'settings';

export function PatientDashboard({ onNavigate, onLogout, userInfo }: PatientDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Medical Records State
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [treatmentSummary, setTreatmentSummary] = useState<any>(null);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  // Check for selected specialty or showDoctors flag after login
  useEffect(() => {
    const selectedSpecialty = sessionStorage.getItem('selectedSpecialty');
    const showDoctorsAfterLogin = sessionStorage.getItem('showDoctorsAfterLogin');
    
    if (selectedSpecialty || showDoctorsAfterLogin) {
      // Switch to appointments tab to show doctors
      setActiveTab('appointments');
      // Clear the flags (selectedSpecialty will be read by DoctorCategorySection)
      if (showDoctorsAfterLogin) {
        sessionStorage.removeItem('showDoctorsAfterLogin');
      }
      // Note: Don't remove selectedSpecialty here - let DoctorCategorySection use it and clear it
    }
  }, []);

  // Poll Notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const { patientAPI } = await import('../../src/services/patientService');
        const result = await patientAPI.getNotifications({ limit: 10 });
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
      } catch (e) {
        console.error('Failed to fetch notifications:', e);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch Medical Records
  useEffect(() => {
    const fetchMedicalRecords = async () => {
      try {
        setLoadingRecords(true);
        setRecordsError(null);
        const token = localStorage.getItem('token');
        if (!token) {
          setLoadingRecords(false);
          return;
        }

        const { patientAPI } = await import('../../src/services/patientService');
        const result = await patientAPI.getMedicalRecords();
        
        // Safely set medical records with fallback
        setMedicalRecords(result?.medicalRecords || []);
        setTreatmentSummary(result?.treatmentSummary || null);
      } catch (e: any) {
        console.error('Failed to fetch medical records:', e);
        // Don't show error if it's just empty data
        if (e.response?.status !== 404) {
          setRecordsError(e.response?.data?.message || 'Failed to load medical records');
        }
        setMedicalRecords([]);
        setTreatmentSummary(null);
      } finally {
        setLoadingRecords(false);
      }
    };

    fetchMedicalRecords();
  }, []);

  const [upcomingAppointment, setUpcomingAppointment] = useState<any>(null);
  const [loadingAppointment, setLoadingAppointment] = useState(true);
  const [actionLoading, setActionLoading] = useState<{
    joinCall: boolean;
    reschedule: boolean;
    cancel: boolean;
  }>({ joinCall: false, reschedule: false, cancel: false });
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    try {
      setLoadingAppointment(true);
      setError(null);
      const { patientAPI } = await import('../../src/services/patientService');
      const appointments = await patientAPI.getAppointments();
      
      console.log('Fetched appointments:', appointments);

      // Find next upcoming appointment
      const now = new Date();
      const upcoming = appointments
        .filter(apt => apt.status === 'scheduled' || apt.status === 'rescheduled' || apt.status === 'confirmed')
        .sort((a, b) => {
          const dateA = new Date(`${a.date} ${a.time}`);
          const dateB = new Date(`${b.date} ${b.time}`);
          return dateA.getTime() - dateB.getTime();
        })[0];
      
      console.log('Upcoming appointment (raw):', upcoming);

      if (upcoming) {
        const formattedAppointment = {
          id: upcoming.id || upcoming._id,
          doctor: upcoming.doctorName,
          specialty: upcoming.type,
          date: new Date(upcoming.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          time: upcoming.time,
          location: upcoming.location || 'Clinic',
          status: upcoming.status,
          image: `/api/images/doctor/${upcoming.doctorId}?specialization=${encodeURIComponent(upcoming.type)}`
        };
        
        console.log('Setting upcoming appointment:', formattedAppointment);
        setUpcomingAppointment(formattedAppointment);
      } else {
        setUpcomingAppointment(null);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      setError('Failed to load appointments. Please try again.');
    } finally {
      setLoadingAppointment(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [activeTab]); // Refresh when switching tabs

  const handleJoinVideoCall = async () => {
    if (!upcomingAppointment) return;
    
    try {
      setActionLoading(prev => ({ ...prev, joinCall: true }));
      setError(null);
      
      // Check if appointment is within 15 minutes of scheduled time
      const appointmentDateTime = new Date(`${upcomingAppointment.date} ${upcomingAppointment.time}`);
      const now = new Date();
      const timeDiff = appointmentDateTime.getTime() - now.getTime();
      const minutesDiff = Math.floor(timeDiff / 60000);
      
      if (minutesDiff > 15) {
        setError(`Video call will be available 15 minutes before your appointment time (${minutesDiff} minutes remaining)`);
        setActionLoading(prev => ({ ...prev, joinCall: false }));
        return;
      }
      
      if (minutesDiff < -30) {
        setError('This appointment time has passed. Please book a new appointment.');
        setActionLoading(prev => ({ ...prev, joinCall: false }));
        return;
      }
      
      // Generate video call link - in production, integrate with Twilio/Daily.co/Jitsi
      const videoCallUrl = `https://meet.jit.si/medi-connect-${upcomingAppointment.id}`;
      
      // Open video call in new window
      window.open(videoCallUrl, '_blank', 'width=1200,height=800,noopener,noreferrer');
      
      // Show success notification
      setNotifications(prev => [{
        id: `call-${Date.now()}`,
        type: 'video_call',
        title: 'Video Call Started',
        message: `Joined video call with Dr. ${upcomingAppointment.doctor.split(' ')[1] || upcomingAppointment.doctor}`,
        isRead: false,
        createdAt: new Date().toISOString()
      }, ...prev]);
      
    } catch (error) {
      console.error('Failed to start video call:', error);
      setError('Failed to start video call. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, joinCall: false }));
    }
  };

  const handleReschedule = async () => {
    console.log('Handle reschedule called');
    
    if (!upcomingAppointment) {
      setError('No appointment selected');
      console.log('No upcoming appointment');
      return;
    }
    
    console.log('Upcoming appointment:', upcomingAppointment);
    
    if (!upcomingAppointment.id) {
      setError('Invalid appointment - missing ID');
      console.error('Appointment data:', upcomingAppointment);
      return;
    }
    
    // Validate appointment ID format
    const appointmentId = upcomingAppointment.id;
    console.log('Appointment ID type:', typeof appointmentId);
    console.log('Appointment ID value:', appointmentId);
    
    if (!appointmentId || typeof appointmentId !== 'string' || appointmentId.length < 5) {
      console.error('Invalid appointment ID format:', appointmentId);
      setError('Invalid appointment ID format');
      return;
    }
    
    // Prompt for new date and time
    const newDateInput = prompt('Enter new date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (newDateInput === null) return; // User cancelled
    if (!newDateInput) {
      setError('Date is required');
      return;
    }
    const newDate = newDateInput.trim();
    
    const newTimeInput = prompt('Enter new time (HH:MM - 24 hour format):', '10:00');
    if (newTimeInput === null) return; // User cancelled
    if (!newTimeInput) {
      setError('Time is required');
      return;
    }
    const newTime = newTimeInput.trim();
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newDate)) {
      setError('Invalid date format. Please use YYYY-MM-DD');
      return;
    }
    
    // Check if new date is in the future
    const selectedDate = new Date(newDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      setError('Please select a future date');
      return;
    }
    
    // Validate time format (24-hour format)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(newTime)) {
      setError('Invalid time format. Please use HH:MM in 24-hour format (e.g., 10:00 or 14:30)');
      return;
    }
    
    try {
      setActionLoading(prev => ({ ...prev, reschedule: true }));
      setError(null);
      
      // Import patient API and make request
      const { patientAPI } = await import('../../src/services/patientService');
      
      console.log('Making reschedule request:', { 
        appointmentId, 
        newDate, 
        newTime
      });
      
      // Make API call to reschedule appointment
      console.log('Calling patientAPI.rescheduleAppointment with:', appointmentId, newDate, newTime);
      await patientAPI.rescheduleAppointment(appointmentId, newDate, newTime);
      
      console.log('Reschedule success');
      
      // Show success notification
      setNotifications(prev => [{
        id: `reschedule-${Date.now()}`,
        type: 'appointment_rescheduled',
        title: 'Appointment Rescheduled',
        message: `Your appointment has been rescheduled to ${newDate} at ${newTime}`,
        isRead: false,
        createdAt: new Date().toISOString()
      }, ...prev]);
      
      // Refresh appointments to show updated data
      await fetchAppointments();
      
    } catch (error: any) {
      console.error('Failed to reschedule appointment:', error);
      
      // Handle network errors
      if (error.isNetworkError) {
        setError('Cannot connect to server. Please check your internet connection.');
        return;
      }
      
      // Handle unauthorized errors
      if (error.response?.status === 401) {
        setError('Session expired. Please log in again.');
        // Optionally redirect to login
        return;
      }
      
      // Handle forbidden errors
      if (error.response?.status === 403) {
        setError('You do not have permission to reschedule this appointment.');
        return;
      }
      
      // Handle not found errors
      if (error.response?.status === 404) {
        setError('Appointment not found. It may have been deleted or the ID is invalid.');
        return;
      }
      
      // Handle conflict errors (slot already booked)
      if (error.response?.status === 409 && error.response?.data?.suggestions) {
        const suggestions = error.response.data.suggestions;
        let errorMessage = error.response.data.message || 'Time slot already booked. Please choose another time.';
        
        if (suggestions && suggestions.length > 0) {
          errorMessage += '\n\nAvailable slots:\n' + suggestions.map((s: any) => 
            `- ${s.date} at ${s.time}`
          ).join('\n');
        }
        
        setError(errorMessage);
        return;
      }
      
      // Handle validation errors
      if (error.response?.status === 400) {
        setError(error.response.data?.message || 'Invalid date or time format.');
        return;
      }
      
      // Handle server errors
      if (error.response?.status >= 500) {
        setError('Server error. Please try again later.');
        return;
      }
      
      // Handle generic errors
      setError(error.response?.data?.message || error.message || 'Failed to reschedule appointment. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, reschedule: false }));
    }
  };

  const handleCancel = async () => {
    console.log('Handle cancel called');
    
    if (!upcomingAppointment) {
      setError('No appointment selected');
      console.log('No upcoming appointment');
      return;
    }
    
    console.log('Upcoming appointment:', upcomingAppointment);
    
    if (!upcomingAppointment.id) {
      setError('Invalid appointment - missing ID');
      console.error('Appointment data:', upcomingAppointment);
      return;
    }
    
    // Validate appointment ID format
    const appointmentId = upcomingAppointment.id;
    console.log('Appointment ID type:', typeof appointmentId);
    console.log('Appointment ID value:', appointmentId);
    
    if (!appointmentId || typeof appointmentId !== 'string' || appointmentId.length < 5) {
      console.error('Invalid appointment ID format:', appointmentId);
      setError('Invalid appointment ID format');
      return;
    }
    
    // Confirm cancellation
    const confirmCancel = window.confirm(
      'Are you sure you want to cancel this appointment?\n\n' +
      `Doctor: ${upcomingAppointment.doctor}\n` +
      `Date: ${upcomingAppointment.date}\n` +
      `Time: ${upcomingAppointment.time}`
    );
    if (!confirmCancel) return;
    
    const reasonInput = prompt('Please provide a reason for cancellation (optional):');
    const reason = reasonInput !== null ? reasonInput.trim() : undefined;
    
    try {
      setActionLoading(prev => ({ ...prev, cancel: true }));
      setError(null);
      
      // Import patient API and make request
      const { patientAPI } = await import('../../src/services/patientService');
      
      console.log('Making cancel request:', { 
        appointmentId, 
        reason
      });
      
      // Make API call to cancel appointment
      await patientAPI.cancelAppointment(appointmentId, reason || undefined);
      
      console.log('Cancel success');
      
      // Clear upcoming appointment
      setUpcomingAppointment(null);
      
      // Show success notification
      setNotifications(prev => [{
        id: `cancel-${Date.now()}`,
        type: 'appointment_cancelled',
        title: 'Appointment Cancelled',
        message: `Your appointment on ${upcomingAppointment.date} has been cancelled successfully.`,
        isRead: false,
        createdAt: new Date().toISOString()
      }, ...prev]);
      
      // Refresh appointments
      await fetchAppointments();
      
    } catch (error: any) {
      console.error('Failed to cancel appointment:', error);
      
      // Handle network errors
      if (error.isNetworkError) {
        setError('Cannot connect to server. Please check your internet connection.');
        return;
      }
      
      // Handle unauthorized errors
      if (error.response?.status === 401) {
        setError('Session expired. Please log in again.');
        // Optionally redirect to login
        return;
      }
      
      // Handle forbidden errors
      if (error.response?.status === 403) {
        setError('You do not have permission to cancel this appointment.');
        return;
      }
      
      // Handle not found errors
      if (error.response?.status === 404) {
        setError('Appointment not found. It may have been deleted or the ID is invalid.');
        return;
      }
      
      // Handle validation errors
      if (error.response?.status === 400) {
        setError(error.response.data?.message || 'Invalid cancellation request.');
        return;
      }
      
      // Handle server errors
      if (error.response?.status >= 500) {
        setError('Server error. Please try again later.');
        return;
      }
      
      // Handle generic errors
      setError(error.response?.data?.message || error.message || 'Failed to cancel appointment. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, cancel: false }));
    }
  };

  const recentPrescriptions = (medicalRecords || [])
    .filter(record => record.prescribedMedicines && record.prescribedMedicines.length > 0)
    .slice(0, 2)
    .map(record => ({
      id: record.id,
      medication: record.prescribedMedicines.map((m: any) => m.name).join(', '),
      doctor: record.doctorName,
      date: new Date(record.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      duration: record.prescribedMedicines[0]?.duration || 'N/A',
      dosage: record.prescribedMedicines[0]?.frequency || 'N/A',
      medicines: record.prescribedMedicines
    }));

  const recentReports = (medicalRecords || [])
    .slice(0, 3)
    .map(record => ({
      id: record.id,
      type: 'Consultation',
      name: record.diagnosis || record.symptoms || 'General Consultation',
      date: new Date(record.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      fullRecord: record // Store full record for download
    }));

  const handleDownloadReport = (report: any) => {
    if (!report.fullRecord) return;
    
    const record = report.fullRecord;
    
    // Create report content
    const reportData = {
      patientName: record.patientName || userInfo?.name || 'Patient',
      doctorName: record.doctorName || 'Doctor',
      appointmentDate: record.appointmentDate,
      appointmentTime: record.appointmentTime,
      diagnosis: record.diagnosis || 'N/A',
      symptoms: record.symptoms || 'N/A',
      prescribedMedicines: record.prescribedMedicines || [],
      dosageInstructions: record.dosageInstructions || 'N/A',
      followUpDate: record.followUpDate || 'N/A',
      notes: record.notes || record.doctorNotes || 'N/A',
      vitalSigns: record.vitalSigns || {},
      reportDate: new Date().toISOString()
    };
    
    // Format as text/PDF-like content
    let reportContent = `MEDICAL CONSULTATION REPORT\n`;
    reportContent += `========================================\n\n`;
    reportContent += `Patient Name: ${reportData.patientName}\n`;
    reportContent += `Doctor: ${reportData.doctorName}\n`;
    reportContent += `Date: ${new Date(record.appointmentDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\n`;
    reportContent += `Time: ${record.appointmentTime}\n\n`;
    reportContent += `----------------------------------------\n`;
    reportContent += `DIAGNOSIS\n`;
    reportContent += `----------------------------------------\n`;
    reportContent += `${reportData.diagnosis}\n\n`;
    reportContent += `----------------------------------------\n`;
    reportContent += `SYMPTOMS\n`;
    reportContent += `----------------------------------------\n`;
    reportContent += `${reportData.symptoms}\n\n`;
    
    if (reportData.prescribedMedicines.length > 0) {
      reportContent += `----------------------------------------\n`;
      reportContent += `PRESCRIPTION\n`;
      reportContent += `----------------------------------------\n`;
      reportData.prescribedMedicines.forEach((med: any, idx: number) => {
        reportContent += `${idx + 1}. ${med.name}\n`;
        reportContent += `   Dosage: ${med.dosage || 'N/A'}\n`;
        reportContent += `   Frequency: ${med.frequency || 'N/A'}\n`;
        reportContent += `   Duration: ${med.duration || 'N/A'}\n\n`;
      });
    }
    
    if (reportData.dosageInstructions && reportData.dosageInstructions !== 'N/A') {
      reportContent += `----------------------------------------\n`;
      reportContent += `DOSAGE INSTRUCTIONS\n`;
      reportContent += `----------------------------------------\n`;
      reportContent += `${reportData.dosageInstructions}\n\n`;
    }
    
    if (reportData.followUpDate && reportData.followUpDate !== 'N/A') {
      reportContent += `----------------------------------------\n`;
      reportContent += `FOLLOW-UP\n`;
      reportContent += `----------------------------------------\n`;
      reportContent += `Follow-up Date: ${new Date(reportData.followUpDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\n\n`;
    }
    
    if (reportData.notes && reportData.notes !== 'N/A') {
      reportContent += `----------------------------------------\n`;
      reportContent += `DOCTOR'S NOTES\n`;
      reportContent += `----------------------------------------\n`;
      reportContent += `${reportData.notes}\n\n`;
    }
    
    if (record.vitalSigns && Object.keys(record.vitalSigns).length > 0) {
      reportContent += `----------------------------------------\n`;
      reportContent += `VITAL SIGNS\n`;
      reportContent += `----------------------------------------\n`;
      if (record.vitalSigns.bloodPressure) reportContent += `Blood Pressure: ${record.vitalSigns.bloodPressure}\n`;
      if (record.vitalSigns.heartRate) reportContent += `Heart Rate: ${record.vitalSigns.heartRate} bpm\n`;
      if (record.vitalSigns.temperature) reportContent += `Temperature: ${record.vitalSigns.temperature}°F\n`;
      if (record.vitalSigns.weight) reportContent += `Weight: ${record.vitalSigns.weight} kg\n`;
      if (record.vitalSigns.height) reportContent += `Height: ${record.vitalSigns.height} cm\n`;
      if (record.vitalSigns.bloodSugar) reportContent += `Blood Sugar: ${record.vitalSigns.bloodSugar} mg/dL\n`;
      reportContent += `\n`;
    }
    
    reportContent += `========================================\n`;
    reportContent += `Report Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}\n`;
    reportContent += `Medi-Connect Healthcare Platform\n`;
    
    // Create and download file
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Consultation-Report-${record.appointmentDate}-${report.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleViewReport = (report: any) => {
    if (!report.fullRecord) return;
    
    // Navigate to records tab and show this specific record
    setActiveTab('records');
    // Scroll to the specific record if needed
    setTimeout(() => {
      const recordElement = document.getElementById(`record-${report.id}`);
      if (recordElement) {
        recordElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight the record briefly
        recordElement.classList.add('ring-2', 'ring-[#3F53D9]', 'ring-offset-2');
        setTimeout(() => {
          recordElement.classList.remove('ring-2', 'ring-[#3F53D9]', 'ring-offset-2');
        }, 2000);
      }
    }, 100);
  };

  const sidebarItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'appointments', icon: CalendarPlus, label: 'Book Appointment' },
    { id: 'marketplace', icon: ShoppingBag, label: 'Medicine Store' },
    { id: 'prescriptions', icon: Upload, label: 'Upload Prescription' },
    { id: 'orders', icon: Package, label: 'My Orders' },
    { id: 'records', icon: FileText, label: 'Medical Records' },
    { id: 'settings', icon: Settings, label: 'Profile Settings' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'appointments':
        return <DoctorCategorySection onNavigateToHome={() => setActiveTab('home')} />;
      case 'marketplace':
        return <MedicineMarketplace />;
      case 'prescriptions':
        return <PrescriptionUpload />;
      case 'orders':
        return <OrdersPage />;
      case 'records':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="mb-2">Medical Records</h1>
                <p className="text-lg text-[#6E6E6E]">
                  Your complete treatment history and prescriptions
                </p>
              </div>
              <div className="flex gap-3">
                <MedicalButton
                  variant="outlined"
                  size="sm"
                  onClick={() => {
                    // Export medical records as JSON
                    const dataStr = JSON.stringify({
                      patientName: userInfo?.name || 'Patient',
                      exportDate: new Date().toISOString(),
                      totalRecords: medicalRecords.length,
                      treatmentSummary,
                      medicalRecords
                    }, null, 2);
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `medical-records-${new Date().toISOString().split('T')[0]}.json`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export JSON
                </MedicalButton>
                <MedicalButton
                  variant="outlined"
                  size="sm"
                  onClick={() => {
                    // Export as PDF-like text format
                    let textContent = `MEDICAL RECORDS REPORT\n`;
                    textContent += `Patient: ${userInfo?.name || 'Patient'}\n`;
                    textContent += `Export Date: ${new Date().toLocaleDateString()}\n`;
                    textContent += `Total Records: ${medicalRecords.length}\n\n`;
                    textContent += `========================================\n\n`;
                    
                    medicalRecords.forEach((record, idx) => {
                      textContent += `Record #${idx + 1}\n`;
                      textContent += `Doctor: ${record.doctorName}\n`;
                      textContent += `Date: ${new Date(record.appointmentDate).toLocaleDateString()} at ${record.appointmentTime}\n`;
                      if (record.diagnosis) textContent += `Diagnosis: ${record.diagnosis}\n`;
                      if (record.symptoms) textContent += `Symptoms: ${record.symptoms}\n`;
                      if (record.prescribedMedicines?.length > 0) {
                        textContent += `Prescribed Medicines:\n`;
                        record.prescribedMedicines.forEach((med: any) => {
                          textContent += `  - ${med.name} (${med.dosage || 'N/A'}, ${med.frequency || 'N/A'})\n`;
                        });
                      }
                      if (record.notes) textContent += `Notes: ${record.notes}\n`;
                      textContent += `\n========================================\n\n`;
                    });
                    
                    const dataBlob = new Blob([textContent], { type: 'text/plain' });
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `medical-records-${new Date().toISOString().split('T')[0]}.txt`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Text
                </MedicalButton>
              </div>
            </div>

            {loadingRecords ? (
              <div className="flex items-center justify-center py-12">
                <Clock className="w-8 h-8 text-[#3F53D9] animate-pulse" />
                <span className="ml-3 text-[#6E6E6E]">Loading medical records...</span>
              </div>
            ) : recordsError ? (
              <MedicalCard variant="filled" className="bg-white/80 border border-red-200">
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <p className="text-red-600 mb-2">Failed to load medical records</p>
                  <p className="text-sm text-[#6E6E6E]">{recordsError}</p>
                </div>
              </MedicalCard>
            ) : medicalRecords.length === 0 ? (
              <MedicalCard variant="filled" className="bg-white/80 border-2 border-[#E8EAFF]">
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-[#6E6E6E] mx-auto mb-4 opacity-50" />
                  <p className="text-[#6E6E6E] mb-4">No medical records found</p>
                  <p className="text-sm text-[#6E6E6E]">Your medical records will appear here after appointments</p>
                </div>
              </MedicalCard>
            ) : (
              <>
                {/* Treatment Summary */}
                {treatmentSummary && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <MedicalCard variant="pastel" className="bg-gradient-to-br from-[#E8EAFF] to-white">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                          <FileText className="w-7 h-7 text-[#3F53D9]" />
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-[#3F53D9]">{treatmentSummary.totalRecords}</div>
                          <div className="text-sm text-[#6E6E6E]">Total Records</div>
                        </div>
                      </div>
                    </MedicalCard>

                    <MedicalCard variant="pastel" className="bg-gradient-to-br from-[#F0EDFF] to-white">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                          <Stethoscope className="w-7 h-7 text-[#7C74EB]" />
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-[#7C74EB]">{treatmentSummary.doctorsVisited.length}</div>
                          <div className="text-sm text-[#6E6E6E]">Doctors Visited</div>
                        </div>
                      </div>
                    </MedicalCard>

                    <MedicalCard variant="pastel" className="bg-gradient-to-br from-[#E8F9F7] to-white">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                          <Pill className="w-7 h-7 text-[#34D1BF]" />
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-[#34D1BF]">
                            {medicalRecords.filter(r => r.prescribedMedicines?.length > 0).length}
                          </div>
                          <div className="text-sm text-[#6E6E6E]">Prescriptions</div>
                        </div>
                      </div>
                    </MedicalCard>

                    <MedicalCard variant="pastel" className="bg-gradient-to-br from-[#FFF4E6] to-white">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                          <Calendar className="w-7 h-7 text-[#FF9800]" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[#FF9800]">
                            {treatmentSummary.lastVisit
                              ? new Date(treatmentSummary.lastVisit).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              : 'N/A'}
                          </div>
                          <div className="text-sm text-[#6E6E6E]">Last Visit</div>
                        </div>
                      </div>
                    </MedicalCard>
                  </div>
                )}

                {/* Medical Records List */}
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-lg font-medium">
                    <FileText className="w-5 h-5 text-[#3F53D9]" /> Treatment History
                  </h3>

                  {medicalRecords.map((record) => (
                    <MedicalCard key={record.id} id={`record-${record.id}`} variant="filled" className="bg-white/80 border border-[#E8EAFF]">
                      <div className="flex flex-col gap-4">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-lg">{record.doctorName}</h4>
                              <StatusBadge status="completed">Completed</StatusBadge>
                            </div>
                            <div className="text-sm text-[#6E6E6E] mt-1">
                              {new Date(record.appointmentDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                              {' • '}
                              {record.appointmentTime}
                            </div>
                          </div>
                        </div>

                        {/* Symptoms */}
                        {record.symptoms && (
                          <div className="bg-[#FFF9E6] p-3 rounded-xl">
                            <div className="text-sm font-medium text-[#6E6E6E] mb-1">Symptoms:</div>
                            <div className="text-sm">{record.symptoms}</div>
                          </div>
                        )}

                        {/* Diagnosis */}
                        {record.diagnosis && (
                          <div className="bg-[#E8F9F7] p-3 rounded-xl">
                            <div className="text-sm font-medium text-[#34D1BF] mb-1 flex items-center gap-2">
                              <Activity className="w-4 h-4" /> Diagnosis:
                            </div>
                            <div className="text-sm">{record.diagnosis}</div>
                          </div>
                        )}

                        {/* Prescribed Medicines */}
                        {record.prescribedMedicines && record.prescribedMedicines.length > 0 && (
                          <div className="bg-[#F0EDFF] p-4 rounded-xl">
                            <div className="text-sm font-medium text-[#7C74EB] mb-3 flex items-center gap-2">
                              <Pill className="w-4 h-4" /> Prescribed Medicines:
                            </div>
                            <div className="space-y-2">
                              {record.prescribedMedicines.map((med: any, idx: number) => (
                                <div key={idx} className="flex items-start gap-2">
                                  <div className="w-2 h-2 mt-1.5 rounded-full bg-[#7C74EB] flex-shrink-0"></div>
                                  <div className="flex-1">
                                    <div className="font-medium">{med.name}</div>
                                    <div className="text-xs text-[#6E6E6E] mt-1">
                                      {med.dosage && <span className="mr-3">Dosage: {med.dosage}</span>}
                                      {med.frequency && <span className="mr-3">Frequency: {med.frequency}</span>}
                                      {med.duration && <span>Duration: {med.duration}</span>}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {record.dosageInstructions && (
                              <div className="mt-3 pt-3 border-t border-[#E8EAFF] text-sm text-[#6E6E6E]">
                                <span className="font-medium">Instructions:</span> {record.dosageInstructions}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Notes */}
                        {record.notes && (
                          <div className="bg-[#F5F3FA] p-3 rounded-xl">
                            <div className="text-sm font-medium text-[#6E6E6E] mb-1">Doctor's Notes:</div>
                            <div className="text-sm">{record.notes}</div>
                          </div>
                        )}

                        {/* Follow-up */}
                        {record.followUpDate && (
                          <div className="flex items-center gap-2 text-sm text-[#FF9800]">
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">Follow-up on:</span>
                            {new Date(record.followUpDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        )}
                      </div>
                    </MedicalCard>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      case 'settings':
        return <ProfileSettings userInfo={userInfo} />;
      case 'home':
      default:
        return (
          <>
            <h1 className="mb-2">Welcome back, {userInfo?.name || 'Patient'}! 👋</h1>
            <p className="text-lg text-[#6E6E6E] mb-8">Here's your health dashboard overview</p>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <MedicalCard variant="pastel" className="bg-gradient-to-br from-[#E8EAFF] to-white">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                    <Calendar className="w-7 h-7 text-[#3F53D9]" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-[#3F53D9]">
                      {loadingAppointment ? '...' : upcomingAppointment ? '1' : '0'}
                    </div>
                    <div className="text-sm text-[#6E6E6E]">Upcoming</div>
                  </div>
                </div>
              </MedicalCard>

              <MedicalCard variant="pastel" className="bg-gradient-to-br from-[#F0EDFF] to-white">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                    <FileText className="w-7 h-7 text-[#7C74EB]" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-[#7C74EB]">
                      {loadingRecords ? '...' : medicalRecords.length}
                    </div>
                    <div className="text-sm text-[#6E6E6E]">Records</div>
                  </div>
                </div>
              </MedicalCard>

              <MedicalCard variant="pastel" className="bg-gradient-to-br from-[#E8F9F7] to-white">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                    <Pill className="w-7 h-7 text-[#34D1BF]" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-[#34D1BF]">
                      {loadingRecords ? '...' : recentPrescriptions.length}
                    </div>
                    <div className="text-sm text-[#6E6E6E]">Prescriptions</div>
                  </div>
                </div>
              </MedicalCard>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left */}
              <div className="lg:col-span-2 space-y-6">
                {/* Appointment */}
                {loadingAppointment ? (
                  <MedicalCard variant="filled" className="bg-white/80 border-2 border-[#E8EAFF]">
                    <div className="flex items-center justify-center py-12">
                      <Clock className="w-8 h-8 text-[#3F53D9] animate-pulse" />
                      <span className="ml-3 text-[#6E6E6E]">Loading appointments...</span>
                    </div>
                  </MedicalCard>
                ) : upcomingAppointment ? (
                  <MedicalCard variant="filled" className="bg-white/80 border-2 border-[#E8EAFF]">
                    <div className="flex gap-6">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden bg-[#E8EAFF]">
                        <ImageWithFallback
                          src={upcomingAppointment.image}
                          alt={upcomingAppointment.doctor}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex justify-between mb-3">
                          <div>
                            <h4>{upcomingAppointment.doctor}</h4>
                            <p className="text-sm text-[#7C74EB] flex items-center gap-1">
                              <Stethoscope className="w-4 h-4" />
                              {upcomingAppointment.specialty}
                            </p>
                          </div>
                          <StatusBadge status={upcomingAppointment.status}>
                            {upcomingAppointment.status === 'rescheduled' ? 'Rescheduled' : upcomingAppointment.status === 'confirmed' ? 'Confirmed' : 'Scheduled'}
                          </StatusBadge>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="bg-[#F5F3FA] p-3 rounded-xl">
                            <div className="text-xs text-[#6E6E6E] flex items-center gap-2">
                              <Calendar className="w-3 h-3" /> Date
                            </div>
                            <div>{upcomingAppointment.date}</div>
                          </div>

                          <div className="bg-[#F5F3FA] p-3 rounded-xl">
                            <div className="text-xs text-[#6E6E6E] flex items-center gap-2">
                              <Clock className="w-3 h-3" /> Time
                            </div>
                            <div>{upcomingAppointment.time}</div>
                          </div>

                          <div className="bg-[#F5F3FA] p-3 rounded-xl">
                            <div className="text-xs text-[#6E6E6E] flex items-center gap-2">
                              <MapPin className="w-3 h-3" /> Location
                            </div>
                            <div>{upcomingAppointment.location}</div>
                          </div>
                        </div>

                        {error && (
                          <div className="mb-3 text-red-500 text-sm">{error}</div>
                        )}
                        <div className="flex flex-wrap gap-3">
                          <MedicalButton 
                            variant="primary" 
                            size="sm"
                            onClick={handleJoinVideoCall}
                            disabled={actionLoading.joinCall || actionLoading.reschedule || actionLoading.cancel}
                          >
                            {actionLoading.joinCall ? 'Joining...' : 'Join Video Call'}
                          </MedicalButton>
                          <MedicalButton 
                            variant="outlined" 
                            size="sm"
                            onClick={handleReschedule}
                            disabled={actionLoading.joinCall || actionLoading.reschedule || actionLoading.cancel}
                          >
                            {actionLoading.reschedule ? 'Rescheduling...' : 'Reschedule'}
                          </MedicalButton>
                          <MedicalButton 
                            variant="outlined" 
                            size="sm"
                            onClick={handleCancel}
                            disabled={actionLoading.joinCall || actionLoading.reschedule || actionLoading.cancel}
                            className="text-red-500 border-red-300 hover:bg-red-50"
                          >
                            {actionLoading.cancel ? 'Cancelling...' : 'Cancel'}
                          </MedicalButton>
                        </div>
                      </div>
                    </div>
                  </MedicalCard>
                ) : (
                  <MedicalCard variant="filled" className="bg-white/80 border-2 border-[#E8EAFF]">
                    <div className="text-center py-12">
                      <Calendar className="w-12 h-12 text-[#6E6E6E] mx-auto mb-4 opacity-50" />
                      <p className="text-[#6E6E6E] mb-4">No upcoming appointments</p>
                      <MedicalButton variant="primary" onClick={() => setActiveTab('appointments')}>
                        Book Appointment
                      </MedicalButton>
                    </div>
                  </MedicalCard>
                )}

                {/* Prescriptions */}
                <div>
                  <h3 className="mb-4 flex items-center gap-2">
                    <Pill className="w-5 h-5 text-[#7C74EB]" /> Recent Prescriptions
                  </h3>

                  {loadingRecords ? (
                    <MedicalCard variant="filled" className="bg-white/80 border border-[#E8EAFF]">
                      <div className="flex items-center justify-center py-8">
                        <Clock className="w-6 h-6 text-[#7C74EB] animate-pulse" />
                        <span className="ml-2 text-sm text-[#6E6E6E]">Loading prescriptions...</span>
                      </div>
                    </MedicalCard>
                  ) : recentPrescriptions.length === 0 ? (
                    <MedicalCard variant="filled" className="bg-white/80 border border-[#E8EAFF]">
                      <div className="text-center py-8">
                        <Pill className="w-8 h-8 text-[#6E6E6E] mx-auto mb-2 opacity-50" />
                        <p className="text-sm text-[#6E6E6E]">No prescriptions yet</p>
                      </div>
                    </MedicalCard>
                  ) : (
                    recentPrescriptions.map((p) => (
                      <MedicalCard key={p.id} variant="filled" className="bg-white/80 border border-[#E8EAFF] mb-4">
                        <div className="flex gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-[#F0EDFF] flex items-center justify-center">
                            <Pill className="w-8 h-8 text-[#7C74EB]" />
                          </div>

                          <div className="flex-1">
                            <div className="flex justify-between mb-2">
                              <div>
                                <h4 className="font-medium">
                                  {p.medicines.length} Medicine{p.medicines.length > 1 ? 's' : ''} Prescribed
                                </h4>
                                <p className="text-sm text-[#6E6E6E]">Prescribed by {p.doctor}</p>
                              </div>
                              <span className="text-xs bg-[#F5F3FA] px-3 py-1 rounded-full">{p.date}</span>
                            </div>

                            <div className="space-y-1 mb-2">
                              {p.medicines.slice(0, 2).map((med: any, idx: number) => (
                                <div key={idx} className="text-sm text-[#6E6E6E]">
                                  • {med.name} - {med.dosage || med.frequency}
                                </div>
                              ))}
                              {p.medicines.length > 2 && (
                                <div className="text-xs text-[#7C74EB] cursor-pointer" onClick={() => setActiveTab('records')}>
                                  +{p.medicines.length - 2} more...
                                </div>
                              )}
                            </div>

                            <button 
                              onClick={() => setActiveTab('records')}
                              className="text-sm text-[#3F53D9] hover:underline flex items-center gap-1"
                            >
                              View Full Details <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </MedicalCard>
                    ))
                  )}
                </div>
              </div>

              {/* Right */}
              <div className="space-y-6">
                <MedicalCard
                  variant="pastel"
                  className="bg-gradient-to-br from-[#3F53D9] to-[#7C74EB] text-white cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setActiveTab('appointments')}
                >
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-white/20 mx-auto rounded-2xl flex items-center justify-center mb-4">
                      <CalendarPlus className="w-8 h-8 text-white" />
                    </div>
                    <h3>Book Appointment</h3>
                    <p className="text-white/80 text-sm">Schedule a visit with our specialists</p>
                    <div className="flex items-center justify-center gap-2 font-medium mt-4">
                      Book Now <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </MedicalCard>

                <MedicalCard
                  variant="pastel"
                  className="bg-gradient-to-br from-[#34D1BF] to-[#20B2AA] text-white cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setActiveTab('marketplace')}
                >
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-white/20 mx-auto rounded-2xl flex items-center justify-center mb-4">
                      <ShoppingBag className="w-8 h-8 text-white" />
                    </div>
                    <h3>Medicine Store</h3>
                    <p className="text-white/80 text-sm">Order medicines online</p>
                    <div className="flex items-center justify-center gap-2 font-medium mt-4">
                      Shop Now <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </MedicalCard>

                {/* Reports */}
                <div>
                  <h3 className="mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#3F53D9]" /> Recent Reports
                  </h3>

                  <MedicalCard variant="filled" className="bg-white/80 border border-[#E8EAFF]">
                    {loadingRecords ? (
                      <div className="flex items-center justify-center py-8">
                        <Activity className="w-5 h-5 animate-spin text-[#3F53D9]" />
                        <span className="ml-2 text-sm text-[#6E6E6E]">Loading reports...</span>
                      </div>
                    ) : recentReports.length === 0 ? (
                      <div className="text-center py-8 text-[#6E6E6E]">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No reports available</p>
                        <p className="text-xs mt-1">Your consultation reports will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentReports.map((r) => (
                          <div
                            key={r.id}
                            onClick={() => handleViewReport(r)}
                            className="flex items-center justify-between p-3 rounded-xl hover:bg-[#F5F3FA] cursor-pointer transition-all group"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 bg-[#E8EAFF] rounded-xl flex items-center justify-center group-hover:bg-[#3F53D9] transition-colors">
                                <FileText className="w-5 h-5 text-[#3F53D9] group-hover:text-white transition-colors" />
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-black">{r.name}</div>
                                <div className="text-xs text-[#6E6E6E]">
                                  {r.type} • {r.date}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadReport(r);
                              }}
                              className="p-2 hover:bg-[#E8EAFF] rounded-lg transition-colors border border-transparent hover:border-[#3F53D9]"
                              title="Download Report"
                            >
                              <Download className="w-4 h-4 text-black" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </MedicalCard>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3FA] via-[#FAFBFF] to-[#F0EDFF] relative overflow-hidden">
      <MedicalBackground />

      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-[#E8EAFF]">
        <div className="w-full px-8 py-4 flex items-center justify-between">
          <Logo variant="primary" size="md" />

          <div className="flex items-center gap-6">
            <NotificationDropdown
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={async (notificationId) => {
                try {
                  const { patientAPI } = await import('../../src/services/patientService');
                  await patientAPI.markNotificationAsRead(notificationId);
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
                  const { patientAPI } = await import('../../src/services/patientService');
                  await patientAPI.markAllNotificationsAsRead();
                  setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                  setUnreadCount(0);
                } catch (error) {
                  console.error('Failed to mark all as read', error);
                  throw error;
                }
              }}
              onRefresh={async () => {
                try {
                  const { patientAPI } = await import('../../src/services/patientService');
                  const result = await patientAPI.getNotifications({ limit: 10 });
                  setNotifications(result.notifications);
                  setUnreadCount(result.unreadCount);
                } catch (error) {
                  console.error('Error refreshing notifications', error);
                }
              }}
            />

            <div className="relative profile-menu-container">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 hover:bg-[#F5F3FA] rounded-xl p-2 pr-4 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3F53D9] to-[#7C74EB] flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-sm font-medium text-[#333]">
                    {userInfo?.name || 'Patient'}
                  </div>
                  <div className="text-xs text-[#6E6E6E]">
                    {userInfo?.email || 'Patient Account'}
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
                        setActiveTab('settings');
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
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-72 bg-white/60 backdrop-blur-sm min-h-screen border-r border-[#E8EAFF] p-6 space-y-2 sticky top-20 h-[calc(100vh-5rem)]">
          {sidebarItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={i}
                onClick={() => setActiveTab(item.id as Tab)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${isActive
                  ? 'bg-gradient-to-r from-[#E8EAFF] to-[#F0EDFF] text-[#3F53D9] shadow-sm'
                  : 'text-[#6E6E6E] hover:bg-[#F5F3FA] hover:text-[#3F53D9]'
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <div className="w-2 h-2 rounded-full bg-[#3F53D9]"></div>}
              </button>
            );
          })}

          <button
            onClick={() => (onLogout ? onLogout() : onNavigate('landing'))}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[#E53935] hover:bg-[#FFEBEE]"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </aside>

        {/* Main */}
        <main className="flex-1 p-8 max-w-7xl">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
