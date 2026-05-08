import React, { useState, useEffect } from 'react';
import { Search, User, Mail, Phone, Loader2, X } from 'lucide-react';
import { MedicalCard } from '../ui-kit/MedicalCard';
import { doctorAPI, type Patient } from '../../src/services/doctorService';

interface PatientQuickLookupProps {
  onSelectPatient?: (patient: Patient) => void;
  className?: string;
}

export function PatientQuickLookup({ onSelectPatient, className = '' }: PatientQuickLookupProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (searchTerm.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        searchPatients();
      }, 300); // Debounce

      return () => clearTimeout(timeoutId);
    } else {
      setPatients([]);
      setShowResults(false);
    }
  }, [searchTerm]);

  const searchPatients = async () => {
    try {
      setLoading(true);
      // Pass query to backend for server-side filtering
      const data = await doctorAPI.getPatients(searchTerm);
      setPatients(data);
      setShowResults(true);
    } catch (error) {
      console.error('Patient search error:', error);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    if (onSelectPatient) {
      onSelectPatient(patient);
    }
    setSearchTerm('');
    setShowResults(false);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6E6E] w-5 h-5" />
        <input
          type="text"
          placeholder="Search patients by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            if (patients.length > 0) setShowResults(true);
          }}
          className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#E8EAFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#3F53D9]/20"
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('');
              setShowResults(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E6E6E] hover:text-[#333]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results */}
      {showResults && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-[#E8EAFF] rounded-xl shadow-lg max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-[#3F53D9] animate-spin" />
            </div>
          ) : patients.length === 0 ? (
            <div className="p-4 text-center text-[#6E6E6E]">
              No patients found
            </div>
          ) : (
            <div className="divide-y divide-[#E8EAFF]">
              {patients.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => handleSelectPatient(patient)}
                  className="w-full p-4 text-left hover:bg-[#F5F3FA] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#E8EAFF] flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-[#3F53D9]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[#333] truncate">{patient.name}</div>
                      <div className="text-sm text-[#6E6E6E] space-y-1">
                        {patient.email && (
                          <div className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{patient.email}</span>
                          </div>
                        )}
                        {patient.mobile && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            {patient.mobile}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

