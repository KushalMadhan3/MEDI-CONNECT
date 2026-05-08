import React, { useState, useEffect } from 'react';
import { Search, Plus, User, MapPin, Phone, Mail, Loader2, CheckCircle2, X } from 'lucide-react';
import { MedicalCard } from '../../ui-kit/MedicalCard';
import { MedicalButton } from '../../ui-kit/MedicalButton';
import { doctorAPI, Patient } from '../../../src/services/doctorService';

export function DoctorPatients() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Form State
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

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            setLoading(true);
            const data = await doctorAPI.getPatients();
            setPatients(data);
        } catch (error) {
            console.error('Failed to fetch patients', error);
        } finally {
            setLoading(false);
        }
    };

    const showSuccessToast = (message: string) => {
        setToastMessage(message);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const handleAddPatient = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await doctorAPI.addPatient({
                ...formData,
                age: formData.age ? parseInt(formData.age) : undefined,
                medicalHistory: formData.medicalHistory ? formData.medicalHistory.split(',').map(s => s.trim()).filter(s => s) : [],
                allergies: formData.allergies ? formData.allergies.split(',').map(s => s.trim()).filter(s => s) : []
            });
            setShowAddModal(false);
            setFormData({
                name: '', email: '', mobile: '', gender: 'Male', age: '', address: '', medicalHistory: '', allergies: ''
            });
            showSuccessToast('Patient added successfully!');
            fetchPatients();
        } catch (error: any) {
            console.error('Failed to add patient', error);
            showSuccessToast(error.response?.data?.message || 'Failed to add patient');
        } finally {
            setSaving(false);
        }
    };

    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.mobile?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Reset page when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Pagination
    const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedPatients = filteredPatients.slice(startIndex, startIndex + itemsPerPage);

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
                    <h2 className="text-2xl font-bold text-[#333]">My Patients</h2>
                    <p className="text-sm text-[#6E6E6E] mt-1">Manage your patient records</p>
                </div>
                <MedicalButton variant="primary" onClick={() => setShowAddModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Patient
                </MedicalButton>
            </div>

            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6E6E] w-5 h-5" />
                <input
                    type="text"
                    placeholder="Search patients by name, email, or mobile..."
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
            ) : filteredPatients.length === 0 ? (
                <MedicalCard variant="filled">
                    <div className="text-center py-12 text-[#6E6E6E]">
                        <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No patients found</p>
                        <p className="text-sm">Add your first patient to get started</p>
                    </div>
                </MedicalCard>
            ) : (
                <>
                    <MedicalCard variant="filled" className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-[#F5F3FA] border-b border-[#E8EAFF]">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#6E6E6E] uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#6E6E6E] uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#6E6E6E] uppercase tracking-wider">Mobile</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#6E6E6E] uppercase tracking-wider">Gender</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#6E6E6E] uppercase tracking-wider">Age</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#6E6E6E] uppercase tracking-wider">Last Visit</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-[#E8EAFF]">
                                    {paginatedPatients.map((patient) => (
                                        <tr key={patient.id} className="hover:bg-[#F5F3FA]/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-[#E8EAFF] flex items-center justify-center flex-shrink-0">
                                                        <User className="w-5 h-5 text-[#3F53D9]" />
                                                    </div>
                                                    <span className="font-medium text-[#333]">{patient.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-[#6E6E6E]">
                                                    <Mail className="w-4 h-4" />
                                                    <span>{patient.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {patient.mobile ? (
                                                    <div className="flex items-center gap-2 text-[#6E6E6E]">
                                                        <Phone className="w-4 h-4" />
                                                        <span>{patient.mobile}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[#6E6E6E]">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-[#6E6E6E]">
                                                {patient.gender || '—'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-[#6E6E6E]">
                                                {patient.age ? `${patient.age} years` : '—'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-[#6E6E6E]">
                                                {patient.updatedAt ? new Date(patient.updatedAt).toLocaleDateString() : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </MedicalCard>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center mt-6">
                            <div className="text-sm text-[#6E6E6E]">
                                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredPatients.length)} of {filteredPatients.length} patients
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

            {/* Add Patient Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
                        <div className="p-6 border-b border-[#E8EAFF] sticky top-0 bg-white z-10 flex justify-between items-center backdrop-blur-sm bg-white/95">
                            <h3 className="text-xl font-bold text-[#333]">Add New Patient</h3>
                            <button 
                                onClick={() => setShowAddModal(false)} 
                                className="text-[#6E6E6E] hover:text-[#333] hover:bg-[#F5F3FA] rounded-lg p-2 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddPatient} className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#333] mb-2">Full Name *</label>
                                    <input 
                                        required 
                                        type="text" 
                                        className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                                        value={formData.name} 
                                        onChange={e => setFormData({ ...formData, name: e.target.value })} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#333] mb-2">Email *</label>
                                    <input 
                                        required 
                                        type="email" 
                                        className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                                        value={formData.email} 
                                        onChange={e => setFormData({ ...formData, email: e.target.value })} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#333] mb-2">Mobile</label>
                                    <input 
                                        type="tel" 
                                        className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                                        value={formData.mobile} 
                                        onChange={e => setFormData({ ...formData, mobile: e.target.value })} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#333] mb-2">Age</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                                        value={formData.age} 
                                        onChange={e => setFormData({ ...formData, age: e.target.value })} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[#333] mb-2">Gender</label>
                                    <select 
                                        className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
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
                                    className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all resize-none"
                                    value={formData.address} 
                                    onChange={e => setFormData({ ...formData, address: e.target.value })} 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#333] mb-2">Medical History (comma separated)</label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all" 
                                    placeholder="Diabetes, Hypertension..."
                                    value={formData.medicalHistory} 
                                    onChange={e => setFormData({ ...formData, medicalHistory: e.target.value })} 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#333] mb-2">Allergies (comma separated)</label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-2.5 border border-[#E8EAFF] rounded-xl focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all" 
                                    placeholder="Peanuts, Penicillin..."
                                    value={formData.allergies} 
                                    onChange={e => setFormData({ ...formData, allergies: e.target.value })} 
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-[#E8EAFF]">
                                <MedicalButton variant="outlined" type="button" onClick={() => setShowAddModal(false)} disabled={saving}>
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
                    </div>
                </div>
            )}
        </div>
    );
}
