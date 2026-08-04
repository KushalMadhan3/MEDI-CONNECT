import React, { useState } from 'react';
import { MedicalCard } from '../ui-kit/MedicalCard';
import { MedicalButton } from '../ui-kit/MedicalButton';
import { StatusBadge } from '../ui-kit/StatusBadge';
import { 
  Video, 
  CheckCircle, 
  X, 
  FileText, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Clock,
  Loader2,
  Eye
} from 'lucide-react';
import type { Appointment } from '../../src/services/doctorService';
import { doctorAPI } from '../../src/services/doctorService';

interface TodayAppointmentsListProps {
  appointments: Appointment[];
  onStatusUpdate?: () => void;
  onPrescribe?: (appointment: Appointment) => void;
  onViewPatient?: (appointment: Appointment) => void;
}

export function TodayAppointmentsList({ 
  appointments, 
  onStatusUpdate,
  onPrescribe,
  onViewPatient 
}: TodayAppointmentsListProps) {
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    if (!window.confirm(`Are you sure you want to mark this appointment as ${newStatus}?`)) {
      return;
    }

    setUpdatingStatus(appointmentId);
    setError(null);

    try {
      await doctorAPI.updateAppointmentStatus(appointmentId, { status: newStatus });
      if (onStatusUpdate) {
        onStatusUpdate();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update appointment status');
      console.error('Status update error:', err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleJoinVideoCall = (appointment: Appointment) => {
    // Check if appointment is within 15 minutes
    const appointmentDateTime = new Date(`${appointment.date} ${appointment.time}`);
    const now = new Date();
    const timeDiff = appointmentDateTime.getTime() - now.getTime();
    const minutesDiff = Math.floor(timeDiff / 60000);

    if (minutesDiff > 15) {
      alert(`Video call will be available 15 minutes before your appointment time (${minutesDiff} minutes remaining)`);
      return;
    }

    if (minutesDiff < -30) {
      alert('This appointment time has passed.');
      return;
    }

    // Generate video call link
    const videoCallUrl = `https://meet.jit.si/medi-connect-${appointment.id}`;
    window.open(videoCallUrl, '_blank', 'width=1200,height=800,noopener,noreferrer');
  };

  if (appointments.length === 0) {
    return (
      <MedicalCard variant="filled" className="bg-white/80 border-2 border-[#C4DCFF]">
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-[#555555] mx-auto mb-4 opacity-50" />
          <p className="text-[#555555] mb-4">No appointments scheduled for today</p>
        </div>
      </MedicalCard>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}

      {appointments.map((appointment) => (
        <MedicalCard key={appointment.id} variant="filled" className="bg-white/80 border border-[#C4DCFF]">
          <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-bold text-lg">{appointment.patientName}</h4>
                  <StatusBadge status={appointment.status}>
                    {appointment.status}
                  </StatusBadge>
                </div>
                <div className="text-sm text-[#555555] space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {appointment.patientEmail}
                  </div>
                  {appointment.patientPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {appointment.patientPhone}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {appointment.date} at {appointment.time}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-[#555555] mb-1">Payment</div>
                <div className={`text-sm font-semibold ${
                  appointment.payment?.status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {appointment.payment?.status === 'paid' 
                    ? `₹${appointment.payment?.paidAmount || 500}` 
                    : 'Pending'}
                </div>
              </div>
            </div>

            {/* Reason */}
            {appointment.reason && (
              <div className="bg-[#CFE3FF] p-3 rounded-xl">
                <div className="text-sm font-medium text-[#555555] mb-1">Reason for visit:</div>
                <div className="text-sm">{appointment.reason}</div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[#C4DCFF]">
              <MedicalButton
                variant="outlined"
                size="sm"
                onClick={() => onViewPatient && onViewPatient(appointment)}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Patient
              </MedicalButton>

              {appointment.status === 'scheduled' && (
                <MedicalButton
                  variant="outlined"
                  size="sm"
                  onClick={() => handleJoinVideoCall(appointment)}
                >
                  <Video className="w-4 h-4 mr-2" />
                  Join Video Call
                </MedicalButton>
              )}

              {appointment.status === 'scheduled' && (
                <MedicalButton
                  variant="primary"
                  size="sm"
                  onClick={() => onPrescribe && onPrescribe(appointment)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Prescribe
                </MedicalButton>
              )}

              {appointment.status === 'scheduled' && (
                <MedicalButton
                  variant="outlined"
                  size="sm"
                  onClick={() => handleStatusChange(appointment.id, 'completed')}
                  disabled={updatingStatus === appointment.id}
                >
                  {updatingStatus === appointment.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Completed
                    </>
                  )}
                </MedicalButton>
              )}

              {appointment.status !== 'cancelled' && (
                <MedicalButton
                  variant="outlined"
                  size="sm"
                  onClick={() => handleStatusChange(appointment.id, 'cancelled')}
                  disabled={updatingStatus === appointment.id}
                  className="text-red-600 hover:text-red-700"
                >
                  {updatingStatus === appointment.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </>
                  )}
                </MedicalButton>
              )}
            </div>
          </div>
        </MedicalCard>
      ))}
    </div>
  );
}









