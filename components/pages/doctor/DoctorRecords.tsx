import React, { useState, useEffect } from 'react';
import { Search, Plus, FileText, Download, Calendar, User, Trash2, Loader2, ChevronDown, ChevronUp, CheckCircle2, X, Pill } from 'lucide-react';
import { MedicalCard } from '../../ui-kit/MedicalCard';
import { MedicalButton } from '../../ui-kit/MedicalButton';
import { doctorAPI, Prescription, Patient } from '../../../src/services/doctorService';

export function DoctorRecords() {
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [expandedPrescriptions, setExpandedPrescriptions] = useState<Set<string>>(new Set());
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Form State
    const [formData, setFormData] = useState({
        patientId: '',
        diagnosis: '',
        symptoms: '',
        dosageInstructions: '',
        followUpDate: '',
        notes: '',
        medications: [{ name: '', dosage: '', frequency: '', duration: '' }]
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchPrescriptions();
        fetchPatients();
    }, []);

    const fetchPrescriptions = async () => {
        try {
            setLoading(true);
            const data = await doctorAPI.getPrescriptions();
            setPrescriptions(data);
        } catch (error) {
            console.error('Failed to fetch prescriptions', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPatients = async () => {
        try {
            const data = await doctorAPI.getPatients();
            setPatients(data);
        } catch (error) {
            console.error('Failed to fetch patients for dropdown', error);
        }
    };

    const handleAddMedication = () => {
        setFormData({
            ...formData,
            medications: [...formData.medications, { name: '', dosage: '', frequency: '', duration: '' }]
        });
    };

    const handleMedicationChange = (index: number, field: string, value: string) => {
        const updated = [...formData.medications];
        updated[index] = { ...updated[index], [field]: value };
        setFormData({ ...formData, medications: updated });
    };

    const handleRemoveMedication = (index: number) => {
        setFormData({
            ...formData,
            medications: formData.medications.filter((_, i) => i !== index)
        });
    };

    const showSuccessToast = (message: string) => {
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const toggleExpand = (prescriptionId: string) => {
        const newExpanded = new Set(expandedPrescriptions);
        if (newExpanded.has(prescriptionId)) {
            newExpanded.delete(prescriptionId);
        } else {
            newExpanded.add(prescriptionId);
        }
        setExpandedPrescriptions(newExpanded);
    };

    const handleDownloadPDF = (prescription: Prescription) => {
        // Create a simple PDF-like document
        const content = `
PRESCRIPTION

Patient: ${prescription.patientName}
Date: ${new Date(prescription.createdAt).toLocaleDateString()}
Doctor: ${prescription.doctorName}

Diagnosis: ${prescription.diagnosis || 'N/A'}

Medications:
${prescription.medications.map((med, i) => `${i + 1}. ${med.name} - ${med.dosage} - ${med.frequency} - ${med.duration}`).join('\n')}

Instructions: ${prescription.instructions || 'N/A'}

Notes: ${prescription.notes || 'N/A'}
        `.trim();

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Prescription_${prescription.id}_${prescription.patientName.replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showSuccessToast('Prescription downloaded!');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const selectedPatient = patients.find(p => p.id === formData.patientId);
            if (!selectedPatient) {
                showSuccessToast('Please select a patient');
                return;
            }
            
            // Filter out empty medications
            const validMedications = formData.medications.filter(med => med.name.trim() !== '');
            
            if (validMedications.length === 0) {
                showSuccessToast('Please add at least one medication');
                return;
            }

            await doctorAPI.createPrescription({
                patientId: formData.patientId,
                patientName: selectedPatient.name,
                patientEmail: selectedPatient.email,
                medications: validMedications,
                diagnosis: formData.diagnosis || undefined,
                symptoms: formData.symptoms || undefined,
                dosageInstructions: formData.dosageInstructions || undefined,
                followUpDate: formData.followUpDate || undefined,
                notes: formData.notes || undefined
            });
            setShowCreateModal(false);
            setFormData({
                patientId: '', diagnosis: '', symptoms: '', dosageInstructions: '', followUpDate: '', notes: '',
                medications: [{ name: '', dosage: '', frequency: '', duration: '' }]
            });
            showSuccessToast('Prescription created successfully!');
            fetchPrescriptions();
        } catch (error: any) {
            console.error('Failed to create prescription', error);
            showSuccessToast(error.response?.data?.message || 'Failed to create prescription');
        } finally {
            setSaving(false);
        }
    };

    const filtered = prescriptions.filter(p =>
        p.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.medications.some(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Reset page when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Pagination
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedPrescriptions = filtered.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div>
            {/* Toast Notification */}
            {showToast && (
                <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
                    <div className="bg-white border border-green-200 rounded-xl shadow-lg p-4 flex items-center gap-3 min-w-[300px]">
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="text-sm text-gray-700 flex-1">{toastMessage}</span>
                        <button onClick={() => setShowToast(false)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-[#333]">Medical Records</h2>
                    <p className="text-sm text-[#6E6E6E] mt-1">View and manage prescription records</p>
                </div>
                <MedicalButton variant="primary" onClick={() => setShowCreateModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    ➕ Create New Prescription
                </MedicalButton>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6E6E] w-5 h-5" />
                <input
                    type="text"
                    placeholder="Search records by patient, diagnosis, or medicine..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-[#E8EAFF] rounded-xl focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                />
            </div>

            {loading ? (
                <MedicalCard variant="filled">
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-[#3F53D9]" />
                    </div>
                </MedicalCard>
            ) : filtered.length === 0 ? (
                <MedicalCard variant="filled">
                    <div className="text-center py-12 text-[#6E6E6E]">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No prescriptions found</p>
                        <p className="text-sm">Create your first prescription to get started</p>
                    </div>
                </MedicalCard>
            ) : (
                <>
                    <div className="space-y-4">
                        {paginatedPrescriptions.map((prescription) => {
                            const isExpanded = expandedPrescriptions.has(prescription.id);
                            return (
                                <MedicalCard key={prescription.id} variant="filled" className="hover:shadow-lg transition-all border border-[#E8EAFF]">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E8EAFF] to-[#F0EDFF] flex items-center justify-center flex-shrink-0">
                                                <FileText className="w-6 h-6 text-[#7C74EB]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="font-bold text-[#333]">{prescription.patientName}</h3>
                                                    <span className="px-2 py-1 bg-[#E8F5E9] text-[#2E7D32] text-xs font-medium rounded-full">
                                                        {prescription.medications.length} {prescription.medications.length === 1 ? 'medicine' : 'medicines'}
                                                    </span>
                                                </div>
                                                
                                                <div className="space-y-2 mb-3">
                                                    <div className="flex items-center gap-2 text-sm text-[#6E6E6E]">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>{new Date(prescription.createdAt).toLocaleDateString('en-US', { 
                                                            year: 'numeric', 
                                                            month: 'long', 
                                                            day: 'numeric' 
                                                        })}</span>
                                                    </div>
                                                    {prescription.diagnosis && (
                                                        <div className="text-sm">
                                                            <span className="text-[#6E6E6E]">Diagnosis: </span>
                                                            <span className="font-medium text-[#333]">{prescription.diagnosis}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Expandable Medicine View */}
                                                {isExpanded && (
                                                    <div className="mt-4 pt-4 border-t border-[#E8EAFF] animate-in slide-in-from-top">
                                                        <div className="space-y-3">
                                                            <h4 className="text-sm font-semibold text-[#333] flex items-center gap-2">
                                                                <Pill className="w-4 h-4 text-[#7C74EB]" />
                                                                Medications
                                                            </h4>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                {prescription.medications.map((med: any, i: number) => (
                                                                    <div key={i} className="bg-[#F5F3FA] p-3 rounded-xl border border-[#E8EAFF]">
                                                                        <div className="font-medium text-[#333] mb-1">{med.name}</div>
                                                                        <div className="text-xs text-[#6E6E6E] space-y-1">
                                                                            {med.dosage && <div>Dosage: {med.dosage}</div>}
                                                                            {med.frequency && <div>Frequency: {med.frequency}</div>}
                                                                            {med.duration && <div>Duration: {med.duration}</div>}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {prescription.instructions && (
                                                                <div className="mt-3">
                                                                    <h5 className="text-xs font-semibold text-[#6E6E6E] uppercase mb-1">Instructions</h5>
                                                                    <p className="text-sm text-[#333]">{prescription.instructions}</p>
                                                                </div>
                                                            )}
                                                            {prescription.notes && (
                                                                <div className="mt-3">
                                                                    <h5 className="text-xs font-semibold text-[#6E6E6E] uppercase mb-1">Notes</h5>
                                                                    <p className="text-sm text-[#333]">{prescription.notes}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            <button
                                                onClick={() => toggleExpand(prescription.id)}
                                                className="p-2 hover:bg-[#F5F3FA] rounded-lg text-[#6E6E6E] hover:text-[#3F53D9] transition-colors"
                                                title={isExpanded ? 'Collapse' : 'Expand'}
                                            >
                                                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                            </button>
                                            <button
                                                onClick={() => handleDownloadPDF(prescription)}
                                                className="p-2 hover:bg-[#F5F3FA] rounded-lg text-[#6E6E6E] hover:text-[#3F53D9] transition-colors"
                                                title="Download PDF"
                                            >
                                                <Download className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </MedicalCard>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center mt-6">
                            <div className="text-sm text-[#6E6E6E]">
                                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length} prescriptions
                            </div>
                            <div className="flex gap-2">
                                <MedicalButton
                                    variant="outlined"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </MedicalButton>
                                <span className="flex items-center px-4 text-sm text-[#6E6E6E]">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <MedicalButton
                                    variant="outlined"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </MedicalButton>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Create Prescription Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
                        <div className="p-6 border-b border-[#E8EAFF] sticky top-0 bg-white z-10 flex justify-between items-center backdrop-blur-sm bg-white/95">
                            <h3 className="text-xl font-bold text-[#333]">Create New Prescription</h3>
                            <button 
                                onClick={() => setShowCreateModal(false)} 
                                className="text-[#6E6E6E] hover:text-[#333] hover:bg-[#F5F3FA] rounded-lg p-2 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Patient Selection */}
                            <div>
                                <label className="block text-sm font-medium text-[#333] mb-2">Patient ID *</label>
                                <select 
                                    required 
                                    className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                                    value={formData.patientId} 
                                    onChange={e => setFormData({ ...formData, patientId: e.target.value })}
                                >
                                    <option value="">-- Select Patient --</option>
                                    {patients.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Diagnosis */}
                            <div>
                                <label className="block text-sm font-medium text-[#333] mb-2">Diagnosis</label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                                    value={formData.diagnosis} 
                                    onChange={e => setFormData({ ...formData, diagnosis: e.target.value })} 
                                />
                            </div>

                            {/* Medicines */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-sm font-medium text-[#333]">Medicines *</label>
                                    <button 
                                        type="button" 
                                        onClick={handleAddMedication} 
                                        className="text-sm text-[#3F53D9] font-medium hover:text-[#7C74EB] flex items-center gap-1 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" /> Add Medicine
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {formData.medications.map((med, index) => (
                                        <div key={index} className="flex gap-2 items-start p-3 bg-[#F5F3FA] rounded-xl border border-[#E8EAFF]">
                                            <div className="grid grid-cols-4 gap-2 flex-1">
                                                <input 
                                                    placeholder="Medicine Name *" 
                                                    required 
                                                    className="px-3 py-2 border border-[#E8EAFF] rounded-lg text-sm focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                                                    value={med.name} 
                                                    onChange={e => handleMedicationChange(index, 'name', e.target.value)} 
                                                />
                                                <input 
                                                    placeholder="Dosage (e.g. 500mg)" 
                                                    className="px-3 py-2 border border-[#E8EAFF] rounded-lg text-sm focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                                                    value={med.dosage} 
                                                    onChange={e => handleMedicationChange(index, 'dosage', e.target.value)} 
                                                />
                                                <input 
                                                    placeholder="Frequency (e.g. 1-0-1)" 
                                                    className="px-3 py-2 border border-[#E8EAFF] rounded-lg text-sm focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                                                    value={med.frequency} 
                                                    onChange={e => handleMedicationChange(index, 'frequency', e.target.value)} 
                                                />
                                                <input 
                                                    placeholder="Duration (e.g. 5 days)" 
                                                    className="px-3 py-2 border border-[#E8EAFF] rounded-lg text-sm focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                                                    value={med.duration} 
                                                    onChange={e => handleMedicationChange(index, 'duration', e.target.value)} 
                                                />
                                            </div>
                                            {formData.medications.length > 1 && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveMedication(index)} 
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Additional Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Symptoms */}
                                <div>
                                    <label className="block text-sm font-medium text-[#333] mb-2">Symptoms</label>
                                    <textarea 
                                        rows={2} 
                                        className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all resize-none"
                                        value={formData.symptoms || ''} 
                                        onChange={e => setFormData({ ...formData, symptoms: e.target.value })} 
                                        placeholder="Patient symptoms"
                                    />
                                </div>
                                
                                {/* Follow-up Date */}
                                <div>
                                    <label className="block text-sm font-medium text-[#333] mb-2">Follow-up Date</label>
                                    <input 
                                        type="date" 
                                        className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                                        value={formData.followUpDate || ''} 
                                        onChange={e => setFormData({ ...formData, followUpDate: e.target.value })} 
                                    />
                                </div>
                            </div>

                            {/* Instructions & Notes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#333] mb-2">Dosage Instructions</label>
                                    <textarea 
                                        rows={3} 
                                        className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all resize-none"
                                        value={formData.dosageInstructions || ''} 
                                        onChange={e => setFormData({ ...formData, dosageInstructions: e.target.value })} 
                                        placeholder="Special instructions for taking medications"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#333] mb-2">Notes</label>
                                    <textarea 
                                        rows={3} 
                                        className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all resize-none"
                                        value={formData.notes || ''} 
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })} 
                                        placeholder="Additional notes"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-[#E8EAFF]">
                                <MedicalButton variant="outlined" type="button" onClick={() => setShowCreateModal(false)} disabled={saving}>
                                    Cancel
                                </MedicalButton>
                                <MedicalButton variant="primary" type="submit" disabled={saving}>
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Create Prescription
                                        </>
                                    )}
                                </MedicalButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
