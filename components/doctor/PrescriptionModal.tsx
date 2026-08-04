import React, { useState } from 'react';
import { MedicalCard } from '../ui-kit/MedicalCard';
import { MedicalButton } from '../ui-kit/MedicalButton';
import { X, Plus, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import type { Appointment } from '../../src/services/doctorService';
import { doctorAPI } from '../../src/services/doctorService';

interface PrescriptionModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Medicine {
  name: string;
  dosage: string;
  duration: string;
  instructions: string;
  timing: {
    morning: boolean;
    afternoon: boolean;
    night: boolean;
  };
  frequency: string;
}

export function PrescriptionModal({ appointment, isOpen, onClose, onSuccess }: PrescriptionModalProps) {
  const [medicines, setMedicines] = useState<Medicine[]>([
    {
      name: '',
      dosage: '',
      duration: '',
      instructions: '',
      timing: { morning: false, afternoon: false, night: false },
      frequency: ''
    }
  ]);
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !appointment) return null;

  const addMedicine = () => {
    setMedicines([...medicines, {
      name: '',
      dosage: '',
      duration: '',
      instructions: '',
      timing: { morning: false, afternoon: false, night: false },
      frequency: ''
    }]);
  };

  const removeMedicine = (index: number) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const updateMedicine = (index: number, field: keyof Medicine, value: any) => {
    const updated = [...medicines];
    if (field === 'timing') {
      updated[index].timing = { ...updated[index].timing, ...value };
    } else {
      (updated[index] as any)[field] = value;
    }
    setMedicines(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate
    const validMedicines = medicines.filter(m => m.name.trim());
    if (validMedicines.length === 0) {
      setError('At least one medicine with name is required');
      return;
    }

    for (const med of validMedicines) {
      if (!med.name.trim()) {
        setError('Medicine name is required for all medicines');
        return;
      }
    }

    setSaving(true);

    try {
      await doctorAPI.prescribeAppointment(appointment.id, {
        symptoms: symptoms.trim() || undefined,
        diagnosis: diagnosis.trim() || undefined,
        prescribedMedicines: validMedicines.map(med => ({
          name: med.name.trim(),
          dosage: med.dosage.trim() || undefined,
          duration: med.duration.trim() || undefined,
          instructions: med.instructions.trim() || undefined,
          timing: med.timing,
          frequency: med.frequency.trim() || undefined
        })),
        notes: notes.trim() || undefined,
        followUpDate: followUpDate || undefined
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        // Reset form
        setMedicines([{
          name: '',
          dosage: '',
          duration: '',
          instructions: '',
          timing: { morning: false, afternoon: false, night: false },
          frequency: ''
        }]);
        setSymptoms('');
        setDiagnosis('');
        setNotes('');
        setFollowUpDate('');
        setSuccess(false);
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save prescription');
      console.error('Prescription save error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#C4DCFF] p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-[#1A1A1A]">Create Prescription</h2>
          <button onClick={onClose} className="text-[#555555] hover:text-[#1A1A1A]">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Patient Info */}
          <div className="bg-[#CFE3FF] p-4 rounded-xl">
            <div className="text-sm font-medium text-[#555555] mb-2">Patient Information</div>
            <div className="text-lg font-semibold">{appointment.patientName}</div>
            <div className="text-sm text-[#555555]">{appointment.patientEmail}</div>
            <div className="text-sm text-[#555555]">
              Appointment: {appointment.date} at {appointment.time}
            </div>
          </div>

          {/* Symptoms */}
          <div>
            <label className="block text-sm font-medium text-[#555555] mb-2">Symptoms</label>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-xl border border-[#C4DCFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#1E5FBF]/20"
              placeholder="Enter patient symptoms..."
            />
          </div>

          {/* Diagnosis */}
          <div>
            <label className="block text-sm font-medium text-[#555555] mb-2">Diagnosis</label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-[#C4DCFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#1E5FBF]/20"
              placeholder="Enter diagnosis..."
            />
          </div>

          {/* Medicines */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-[#555555]">Prescribed Medicines</label>
              <MedicalButton variant="outlined" size="sm" type="button" onClick={addMedicine}>
                <Plus className="w-4 h-4 mr-2" />
                Add Medicine
              </MedicalButton>
            </div>

            <div className="space-y-4">
              {medicines.map((medicine, index) => (
                <MedicalCard key={index} variant="filled" className="bg-white border p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-semibold">Medicine {index + 1}</h4>
                    {medicines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMedicine(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#555555] mb-1">Medicine Name *</label>
                      <input
                        type="text"
                        value={medicine.name}
                        onChange={(e) => updateMedicine(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#C4DCFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#1E5FBF]/20"
                        placeholder="e.g., Paracetamol"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#555555] mb-1">Dosage</label>
                      <input
                        type="text"
                        value={medicine.dosage}
                        onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#C4DCFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#1E5FBF]/20"
                        placeholder="e.g., 500mg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#555555] mb-1">Duration</label>
                      <input
                        type="text"
                        value={medicine.duration}
                        onChange={(e) => updateMedicine(index, 'duration', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#C4DCFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#1E5FBF]/20"
                        placeholder="e.g., 5 days"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#555555] mb-1">Frequency</label>
                      <input
                        type="text"
                        value={medicine.frequency}
                        onChange={(e) => updateMedicine(index, 'frequency', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#C4DCFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#1E5FBF]/20"
                        placeholder="e.g., Twice daily"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-medium text-[#555555] mb-2">Timing</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={medicine.timing.morning}
                          onChange={(e) => updateMedicine(index, 'timing', { morning: e.target.checked })}
                          className="w-4 h-4 text-[#1E5FBF] rounded"
                        />
                        <span className="text-sm">Morning</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={medicine.timing.afternoon}
                          onChange={(e) => updateMedicine(index, 'timing', { afternoon: e.target.checked })}
                          className="w-4 h-4 text-[#1E5FBF] rounded"
                        />
                        <span className="text-sm">Afternoon</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={medicine.timing.night}
                          onChange={(e) => updateMedicine(index, 'timing', { night: e.target.checked })}
                          className="w-4 h-4 text-[#1E5FBF] rounded"
                        />
                        <span className="text-sm">Night</span>
                      </label>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-medium text-[#555555] mb-1">Instructions</label>
                    <textarea
                      value={medicine.instructions}
                      onChange={(e) => updateMedicine(index, 'instructions', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-[#C4DCFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#1E5FBF]/20"
                      placeholder="e.g., Take after food"
                    />
                  </div>
                </MedicalCard>
              ))}
            </div>
          </div>

          {/* Follow-up Date */}
          <div>
            <label className="block text-sm font-medium text-[#555555] mb-2">Follow-up Date (Optional)</label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-[#C4DCFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#1E5FBF]/20"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[#555555] mb-2">Additional Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-xl border border-[#C4DCFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#1E5FBF]/20"
              placeholder="Enter any additional notes..."
            />
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Prescription saved successfully!
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#C4DCFF]">
            <MedicalButton variant="outlined" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </MedicalButton>
            <MedicalButton variant="primary" type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Save Prescription
                </>
              )}
            </MedicalButton>
          </div>
        </form>
      </div>
    </div>
  );
}









