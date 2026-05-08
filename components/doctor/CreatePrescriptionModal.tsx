import React, { useState, useEffect } from 'react';
import { MedicalButton } from '../ui-kit/MedicalButton';
import { X, Plus, Trash2, Loader2, CheckCircle2, Search } from 'lucide-react';
import { doctorAPI, Patient } from '../../src/services/doctorService';

interface CreatePrescriptionModalProps {
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

export function CreatePrescriptionModal({ isOpen, onClose, onSuccess }: CreatePrescriptionModalProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
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
  const [loadingPatients, setLoadingPatients] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPatients();
    }
  }, [isOpen]);

  const fetchPatients = async () => {
    try {
      setLoadingPatients(true);
      const data = await doctorAPI.getPatients();
      setPatients(data);
    } catch (err) {
      console.error('Failed to fetch patients', err);
    } finally {
      setLoadingPatients(false);
    }
  };

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.mobile?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

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

    if (!selectedPatient) {
      setError('Please select a patient');
      return;
    }

    const validMedicines = medicines.filter(m => m.name.trim());
    if (validMedicines.length === 0) {
      setError('At least one medicine with name is required');
      return;
    }

    setSaving(true);

    try {
      await doctorAPI.createPrescription({
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        patientEmail: selectedPatient.email,
        medications: validMedicines.map(med => ({
          name: med.name.trim(),
          dosage: med.dosage.trim() || '',
          frequency: med.frequency.trim() || '',
          duration: med.duration.trim() || ''
        })),
        diagnosis: diagnosis.trim() || undefined,
        symptoms: symptoms.trim() || undefined,
        notes: notes.trim() || undefined,
        followUpDate: followUpDate || undefined
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
        onClose();
        // Reset form
        setSelectedPatient(null);
        setMedicines([{
          name: '', dosage: '', duration: '', instructions: '', timing: { morning: false, afternoon: false, night: false }, frequency: ''
        }]);
        setSymptoms('');
        setDiagnosis('');
        setNotes('');
        setFollowUpDate('');
        setSearchTerm('');
      }, 1500);
    } catch (err: any) {
      console.error('Failed to create prescription', err);
      setError(err.response?.data?.message || 'Failed to create prescription');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <div className="sticky top-0 bg-white border-b border-[#E8EAFF] px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-[#333]">Create Prescription</h3>
          <button
            onClick={onClose}
            className="text-[#6E6E6E] hover:text-[#333] hover:bg-[#F5F3FA] rounded-lg p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">Prescription created successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Patient Selection */}
            <div>
              <label className="block text-sm font-medium text-[#333] mb-2">Select Patient *</label>
              {!selectedPatient ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6E6E6E]" />
                    <input
                      type="text"
                      placeholder="Search patients by name, email, or phone..."
                      className="w-full pl-10 pr-4 py-2.5 border border-[#E8EAFF] rounded-xl focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  {loadingPatients ? (
                    <div className="text-center py-4 text-[#6E6E6E]">Loading patients...</div>
                  ) : filteredPatients.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto border border-[#E8EAFF] rounded-xl">
                      {filteredPatients.map(patient => (
                        <button
                          key={patient.id}
                          type="button"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setSearchTerm('');
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-[#F5F3FA] border-b border-[#E8EAFF] last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-[#333]">{patient.name}</div>
                          <div className="text-sm text-[#6E6E6E]">{patient.email} {patient.mobile && `• ${patient.mobile}`}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-[#6E6E6E]">No patients found</div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-[#F5F3FA] rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[#333]">{selectedPatient.name}</div>
                    <div className="text-sm text-[#6E6E6E]">{selectedPatient.email} {selectedPatient.mobile && `• ${selectedPatient.mobile}`}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPatient(null)}
                    className="text-[#6E6E6E] hover:text-[#333]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Symptoms and Diagnosis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#333] mb-2">Symptoms</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all resize-none"
                  value={symptoms}
                  onChange={e => setSymptoms(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333] mb-2">Diagnosis</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all resize-none"
                  value={diagnosis}
                  onChange={e => setDiagnosis(e.target.value)}
                />
              </div>
            </div>

            {/* Medicines */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-[#333]">Medicines *</label>
                <MedicalButton variant="outlined" type="button" onClick={addMedicine} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Medicine
                </MedicalButton>
              </div>
              <div className="space-y-4">
                {medicines.map((medicine, index) => (
                  <div key={index} className="p-4 border border-[#E8EAFF] rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-[#333]">Medicine {index + 1}</span>
                      {medicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMedicine(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-[#6E6E6E] mb-1">Medicine Name *</label>
                        <input
                          required
                          type="text"
                          className="w-full px-3 py-2 border border-[#E8EAFF] rounded-lg focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                          value={medicine.name}
                          onChange={e => updateMedicine(index, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#6E6E6E] mb-1">Dosage</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-[#E8EAFF] rounded-lg focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                          placeholder="e.g., 500mg"
                          value={medicine.dosage}
                          onChange={e => updateMedicine(index, 'dosage', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#6E6E6E] mb-1">Frequency</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-[#E8EAFF] rounded-lg focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                          placeholder="e.g., Twice daily"
                          value={medicine.frequency}
                          onChange={e => updateMedicine(index, 'frequency', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#6E6E6E] mb-1">Duration</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-[#E8EAFF] rounded-lg focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                          placeholder="e.g., 7 days"
                          value={medicine.duration}
                          onChange={e => updateMedicine(index, 'duration', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes and Follow-up */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#333] mb-2">Notes</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all resize-none"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333] mb-2">Follow-up Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                  value={followUpDate}
                  onChange={e => setFollowUpDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#E8EAFF]">
              <MedicalButton variant="outlined" type="button" onClick={onClose} disabled={saving}>
                Cancel
              </MedicalButton>
              <MedicalButton variant="primary" type="submit" disabled={saving || !selectedPatient}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Prescription'
                )}
              </MedicalButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}








