import React, { useState } from 'react';
import { MedicalButton } from '../ui-kit/MedicalButton';
import { X, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { doctorAPI } from '../../src/services/doctorService';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddPatientModal({ isOpen, onClose, onSuccess }: AddPatientModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    gender: 'Male',
    age: '',
    address: '',
    medicalHistory: '',
    allergies: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      await doctorAPI.addPatient({
        ...formData,
        age: formData.age ? parseInt(formData.age) : undefined,
        medicalHistory: formData.medicalHistory ? formData.medicalHistory.split(',').map(s => s.trim()).filter(s => s) : [],
        allergies: formData.allergies ? formData.allergies.split(',').map(s => s.trim()).filter(s => s) : []
      });
      
      setSuccess(true);
      setFormData({
        name: '', email: '', mobile: '', gender: 'Male', age: '', address: '', medicalHistory: '', allergies: ''
      });
      
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to add patient', err);
      setError(err.response?.data?.message || 'Failed to add patient');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
        <div className="sticky top-0 bg-white border-b border-[#E8EAFF] px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-[#333]">Add New Patient</h3>
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
            <p className="text-lg font-medium text-gray-900">Patient added successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#333] mb-2">Full Name *</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl bg-white text-black focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333] mb-2">Email *</label>
                <input
                  required
                  type="email"
                  className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl bg-white text-black focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333] mb-2">Mobile</label>
                <input
                  type="tel"
                  className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl bg-white text-black focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                  value={formData.mobile}
                  onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333] mb-2">Age</label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl bg-white text-black focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                  value={formData.age}
                  onChange={e => setFormData({ ...formData, age: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#333] mb-2">Gender</label>
                <select
                  className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl bg-white text-black focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value })}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#333] mb-2">Address</label>
              <textarea
                rows={2}
                className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl bg-white text-black focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all resize-none"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#333] mb-2">Medical History (comma separated)</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl bg-white text-black focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                placeholder="Diabetes, Hypertension..."
                value={formData.medicalHistory}
                onChange={e => setFormData({ ...formData, medicalHistory: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#333] mb-2">Allergies (comma separated)</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl bg-white text-black focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                placeholder="Peanuts, Penicillin..."
                value={formData.allergies}
                onChange={e => setFormData({ ...formData, allergies: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#E8EAFF]">
              <MedicalButton variant="outlined" type="button" onClick={onClose} disabled={saving}>
                Cancel
              </MedicalButton>
              <MedicalButton variant="primary" type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Patient
                  </>
                )}
              </MedicalButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

