import React, { useState, useEffect } from 'react';
import { MedicalCard } from '../ui-kit/MedicalCard';
import { MedicalButton } from '../ui-kit/MedicalButton';
import { User, Mail, Phone, MapPin, Lock, Save, Loader2, CheckCircle2, Upload, Calendar, Droplets, Activity, Heart, Weight, Thermometer, FileText, X } from 'lucide-react';
import { UserInfo } from '../../types/navigation';
import { patientAPI } from '../../src/services/patientService';

interface ProfileSettingsProps {
    userInfo?: UserInfo | null;
}

export function ProfileSettings({ userInfo }: ProfileSettingsProps) {
    const [formData, setFormData] = useState({
        name: userInfo?.name || '',
        email: userInfo?.email || '',
        phone: userInfo?.mobile || '',
        address: '',
        age: '',
        gender: userInfo?.gender || 'Male',
        dateOfBirth: '',
        bloodType: '',
        emergencyContact: '',
        newPassword: ''
    });
    
    // Health Metrics
    const [healthMetrics, setHealthMetrics] = useState({
        height: '',
        weight: '',
        bloodPressure: '',
        heartRate: '',
        temperature: '',
        allergies: '',
        chronicConditions: '',
        currentMedications: ''
    });
    
    const [healthDocuments, setHealthDocuments] = useState<File[]>([]);
    const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'personal' | 'health' | 'documents'>('personal');
    
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const [originalPhoto, setOriginalPhoto] = useState<string | null>(null); // Track original photo from backend
    const [photoFile, setPhotoFile] = useState<File | null>(null); // Store the file to upload later
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);

    // Load patient data on mount
    useEffect(() => {
        const loadPatientData = async () => {
            try {
                // First try to get complete profile data from backend
                const profileData = await patientAPI.getProfile();
                
                    if (profileData) {
                    // Set profile photo if available
                    if (profileData.profilePhoto) {
                        setProfilePhoto(profileData.profilePhoto);
                        setOriginalPhoto(profileData.profilePhoto); // Track original
                    }
                    
                    // Set all form fields from profile data
                    setFormData(prev => ({
                        ...prev,
                        name: profileData.name || prev.name,
                        email: profileData.email || prev.email,
                        phone: profileData.mobile || prev.phone,
                        address: profileData.address || prev.address,
                        age: profileData.age ? profileData.age.toString() : prev.age,
                        gender: profileData.gender || prev.gender,
                        dateOfBirth: profileData.dateOfBirth || prev.dateOfBirth,
                        bloodType: profileData.bloodType || prev.bloodType,
                        emergencyContact: profileData.emergencyContact || prev.emergencyContact
                    }));
                    
                    // Set health metrics if available
                    if (profileData.healthMetrics) {
                        setHealthMetrics(prev => ({
                            ...prev,
                            height: profileData.healthMetrics.height?.toString() || prev.height,
                            weight: profileData.healthMetrics.weight?.toString() || prev.weight,
                            bloodPressure: profileData.healthMetrics.bloodPressure || prev.bloodPressure,
                            heartRate: profileData.healthMetrics.heartRate?.toString() || prev.heartRate,
                            temperature: profileData.healthMetrics.temperature?.toString() || prev.temperature,
                            allergies: profileData.healthMetrics.allergies || prev.allergies,
                            chronicConditions: profileData.healthMetrics.chronicConditions || prev.chronicConditions,
                            currentMedications: profileData.healthMetrics.currentMedications || prev.currentMedications
                        }));
                    }
                    
                    // Set uploaded documents if available
                    if (profileData.healthDocuments) {
                        setUploadedDocuments(profileData.healthDocuments);
                    }
                } else if (userInfo) {
                    // Fallback to userInfo if no profile data
                    setFormData(prev => ({
                        ...prev,
                        name: userInfo.name || prev.name,
                        email: userInfo.email || prev.email,
                        phone: userInfo.mobile || prev.phone,
                        gender: userInfo.gender || prev.gender
                    }));
                }
                
                // Try to get profile data from localStorage as additional fallback
                const userStr = localStorage.getItem('user');
                if (userStr && !profileData) {
                    try {
                        const user = JSON.parse(userStr);
                        if (user) {
                            // Set profile photo if available
                            if (user.image) {
                                setProfilePhoto(user.image);
                                setOriginalPhoto(user.image); // Track original
                            }
                            
                            // Set other fields if available in localStorage
                            setFormData(prev => ({
                                ...prev,
                                name: user.name || prev.name,
                                email: user.email || prev.email,
                                phone: user.mobile || prev.phone,
                                gender: user.gender || prev.gender
                            }));
                        }
                    } catch (e) {
                        console.error('Failed to parse user data from localStorage:', e);
                    }
                }
            } catch (error) {
                console.error('Failed to load patient data:', error);
                
                // Fallback to userInfo if API call fails
                if (userInfo) {
                    setFormData(prev => ({
                        ...prev,
                        name: userInfo.name || prev.name,
                        email: userInfo.email || prev.email,
                        phone: userInfo.mobile || prev.phone,
                        gender: userInfo.gender || prev.gender
                    }));
                }
            }
        };

        loadPatientData();
    }, [userInfo]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setPhotoError('Please select a valid image file (JPG, PNG, GIF, or WEBP)');
            return;
        }
        
        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            setPhotoError('Image size must be less than 10MB');
            return;
        }
        
        setPhotoError(null);
        setPhotoFile(file);
        
        // Preview the image
        const reader = new FileReader();
        reader.onloadend = () => {
            setProfilePhoto(reader.result as string);
        };
        reader.onerror = () => {
            setPhotoError('Failed to read image file');
        };
        reader.readAsDataURL(file);
    };
    
    const handleRemovePhoto = () => {
        if (!confirm('Are you sure you want to remove your profile photo?')) {
            return;
        }
        
        setPhotoFile(null);
        setProfilePhoto(null);
        setPhotoError(null);
        // Note: originalPhoto is kept to detect removal on save
    };

    const uploadPhoto = async (): Promise<string | null> => {
        if (!photoFile) return null;
        
        setUploadingPhoto(true);
        setPhotoError(null);
        
        const uploadData = new FormData();
        uploadData.append('image', photoFile);

        try {
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
            const res = await fetch(`${API_BASE_URL}/upload/profile`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: uploadData
            });
            
            const data = await res.json();
            if (data.success && data.data && data.data.imageUrl) {
                // Return full URL
                const baseUrl = API_BASE_URL.replace('/api', '');
                return `${baseUrl}${data.data.imageUrl}`;
            } else {
                setPhotoError(data.message || 'Failed to upload photo');
                return null;
            }
        } catch (err: any) {
            console.error('Upload failed', err);
            setPhotoError('Network error. Please check your connection and try again.');
            return null;
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSuccess(false);

        try {
            let photoUrl = profilePhoto;
            
            // Upload photo if a new one was selected
            if (photoFile) {
                photoUrl = await uploadPhoto();
                if (!photoUrl) {
                    setPhotoError('Failed to upload profile photo. Please try again.');
                    setSaving(false);
                    return;
                }
            }

            // Prepare data for update - only include fields that have values
            const updateData: any = {
                name: formData.name,
                mobile: formData.phone,
                gender: formData.gender
            };
            
            // Only add optional fields if they have values
            if (formData.address) updateData.address = formData.address;
            if (formData.age) updateData.age = parseInt(formData.age);
            if (formData.dateOfBirth) updateData.dateOfBirth = formData.dateOfBirth;
            if (formData.bloodType) updateData.bloodType = formData.bloodType;
            if (formData.emergencyContact) updateData.emergencyContact = formData.emergencyContact;
            
            // Handle profile photo: upload new one, keep existing, or remove
            if (photoFile && photoUrl) {
                // New photo uploaded successfully
                updateData.profilePhoto = photoUrl;
            } else if (originalPhoto && profilePhoto === null && !photoFile) {
                // Photo was removed by user (had original, now cleared)
                updateData.profilePhoto = null;
            }
            // If profilePhoto exists and no new file selected, keep existing (don't include in update)
            
            // If newPassword is provided, update password separately
            if (formData.newPassword) {
                // In a real implementation, we would need the current password to change it
                // For now, we'll just show a message that this would be handled separately
                alert('Password change would be handled through a separate secure process in a real application.');
            }

            await patientAPI.updateProfile(updateData);

            setSuccess(true);
            setPhotoFile(null); // Clear photo file after successful save
            setPhotoError(null);
            
            // Update original photo if a new one was uploaded
            if (photoUrl) {
                setOriginalPhoto(photoUrl);
                setProfilePhoto(photoUrl); // Update preview with uploaded URL
            } else if (profilePhoto === null) {
                // Photo was removed
                setOriginalPhoto(null);
            }
            
            // Update localStorage user data
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    user.name = formData.name;
                    user.mobile = formData.phone;
                    if (photoUrl) user.image = photoUrl;
                    localStorage.setItem('user', JSON.stringify(user));
                } catch (e) {
                    console.error('Failed to update user data in localStorage:', e);
                }
            }

            // Clear the photo file state since it's been uploaded
            setPhotoFile(null);
            
            setTimeout(() => setSuccess(false), 3000);
        } catch (error: any) {
            console.error('Update failed', error);
            alert(error.response?.data?.message || 'Failed to update profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleHealthMetricsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setHealthMetrics({ ...healthMetrics, [e.target.name]: e.target.value });
    };

    const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setHealthDocuments(prev => [...prev, ...files]);
    };

    const removeDocument = (index: number) => {
        setHealthDocuments(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-[#333]">Profile Settings</h2>
            
            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-[#E8EAFF]">
                <button
                    onClick={() => setActiveTab('personal')}
                    className={`px-6 py-3 font-medium transition-colors ${
                        activeTab === 'personal'
                            ? 'text-[#3F53D9] border-b-2 border-[#3F53D9]'
                            : 'text-[#6E6E6E] hover:text-[#3F53D9]'
                    }`}
                >
                    Personal Info
                </button>
                <button
                    onClick={() => setActiveTab('health')}
                    className={`px-6 py-3 font-medium transition-colors ${
                        activeTab === 'health'
                            ? 'text-[#3F53D9] border-b-2 border-[#3F53D9]'
                            : 'text-[#6E6E6E] hover:text-[#3F53D9]'
                    }`}
                >
                    Health Metrics
                </button>
                <button
                    onClick={() => setActiveTab('documents')}
                    className={`px-6 py-3 font-medium transition-colors ${
                        activeTab === 'documents'
                            ? 'text-[#3F53D9] border-b-2 border-[#3F53D9]'
                            : 'text-[#6E6E6E] hover:text-[#3F53D9]'
                    }`}
                >
                    Health Documents
                </button>
            </div>

            {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Profile updated successfully!
                </div>
            )}

            {activeTab === 'personal' && (
            <form onSubmit={handleSubmit}>
                <MedicalCard variant="filled" className="bg-white border p-6 space-y-6">
                    {/* Profile Photo */}
                    <div>
                        <label className="block text-sm font-medium text-[#6E6E6E] mb-3">Profile Photo</label>
                        <div className="flex items-start gap-6">
                            {/* Photo Preview */}
                            <div className="relative">
                                <div className="w-32 h-32 rounded-full bg-[#E8EAFF] flex items-center justify-center overflow-hidden border-2 border-[#E8EAFF] shadow-sm">
                                    {profilePhoto ? (
                                        <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-16 h-16 text-[#3F53D9]" />
                                    )}
                                </div>
                                {profilePhoto && (
                                    <button
                                        type="button"
                                        onClick={handleRemovePhoto}
                                        className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                                        title="Remove photo"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            
                            {/* Upload Controls */}
                            <div className="flex-1 space-y-3">
                                <div className="flex gap-3">
                                    <label className="cursor-pointer">
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                            onChange={handlePhotoUpload}
                                            className="hidden"
                                            disabled={uploadingPhoto || saving}
                                        />
                                        <MedicalButton 
                                            variant="primary" 
                                            size="sm" 
                                            type="button"
                                            disabled={uploadingPhoto || saving}
                                        >
                                            {uploadingPhoto ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Uploading...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-4 h-4 mr-2" />
                                                    {profilePhoto ? 'Change Photo' : 'Upload Photo'}
                                                </>
                                            )}
                                        </MedicalButton>
                                    </label>
                                    
                                    {profilePhoto && !uploadingPhoto && (
                                        <MedicalButton 
                                            variant="outlined" 
                                            size="sm" 
                                            type="button"
                                            onClick={handleRemovePhoto}
                                            disabled={saving}
                                        >
                                            <X className="w-4 h-4 mr-2" />
                                            Remove
                                        </MedicalButton>
                                    )}
                                </div>
                                
                                {photoFile && !uploadingPhoto && (
                                    <div className="text-sm text-[#6E6E6E] bg-[#F5F3FA] p-2 rounded-lg">
                                        <p className="font-medium">Selected: {photoFile.name}</p>
                                        <p className="text-xs">Size: {(photoFile.size / 1024).toFixed(2)} KB</p>
                                        <p className="text-xs mt-1 text-[#3F53D9]">Photo will be saved when you click "Save Changes"</p>
                                    </div>
                                )}
                                
                                {photoError && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                        {photoError}
                                    </div>
                                )}
                                
                                <p className="text-xs text-[#6E6E6E]">
                                    Supported formats: JPG, PNG, GIF, WEBP (Max 10MB)
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Personal Info */}
                    <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <User className="w-5 h-5 text-[#3F53D9]" /> Personal Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[#6E6E6E] mb-1">Full Name</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E8EAFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#3F53D9]/20"
                                    />
                                    <User className="w-4 h-4 text-[#6E6E6E] absolute left-3 top-3" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#6E6E6E] mb-1">Email</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        disabled
                                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E8EAFF] bg-[#F5F3FA] text-[#6E6E6E]"
                                    />
                                    <Mail className="w-4 h-4 text-[#6E6E6E] absolute left-3 top-3" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#6E6E6E] mb-1">Mobile Number</label>
                                <div className="relative">
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="+91 98765 43210"
                                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E8EAFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#3F53D9]/20"
                                    />
                                    <Phone className="w-4 h-4 text-[#6E6E6E] absolute left-3 top-3" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#6E6E6E] mb-1">Age</label>
                                <input
                                    type="number"
                                    name="age"
                                    value={formData.age}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-xl border border-[#E8EAFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#3F53D9]/20"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#6E6E6E] mb-1">Gender</label>
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-xl border border-[#E8EAFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#3F53D9]/20"
                                >
                                    <option>Male</option>
                                    <option>Female</option>
                                    <option>Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#6E6E6E] mb-1">Date of Birth</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        name="dateOfBirth"
                                        value={formData.dateOfBirth}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E8EAFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#3F53D9]/20"
                                    />
                                    <Calendar className="w-4 h-4 text-[#6E6E6E] absolute left-3 top-3" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#6E6E6E] mb-1">Blood Type</label>
                                <div className="relative">
                                    <select
                                        name="bloodType"
                                        value={formData.bloodType}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E8EAFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#3F53D9]/20"
                                    >
                                        <option value="">Select Blood Type</option>
                                        <option value="A+">A+</option>
                                        <option value="A-">A-</option>
                                        <option value="B+">B+</option>
                                        <option value="B-">B-</option>
                                        <option value="AB+">AB+</option>
                                        <option value="AB-">AB-</option>
                                        <option value="O+">O+</option>
                                        <option value="O-">O-</option>
                                    </select>
                                    <Droplets className="w-4 h-4 text-[#6E6E6E] absolute left-3 top-3" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#6E6E6E] mb-1">Emergency Contact</label>
                                <div className="relative">
                                    <input
                                        type="tel"
                                        name="emergencyContact"
                                        value={formData.emergencyContact}
                                        onChange={handleChange}
                                        placeholder="+91 98765 43210"
                                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E8EAFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#3F53D9]/20"
                                    />
                                    <Phone className="w-4 h-4 text-[#6E6E6E] absolute left-3 top-3" />
                                </div>
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-[#6E6E6E] mb-1">Address</label>
                            <div className="relative">
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E8EAFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#3F53D9]/20"
                                ></textarea>
                                <MapPin className="w-4 h-4 text-[#6E6E6E] absolute left-3 top-3" />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-[#E8EAFF] my-6"></div>

                    {/* Security - Simplified to just one password field */}
                    <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Lock className="w-5 h-5 text-[#3F53D9]" /> Security
                        </h3>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[#6E6E6E] mb-1">New Password</label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    placeholder="Enter new password to change"
                                    className="w-full px-4 py-2 rounded-xl border border-[#E8EAFF] focus:outline-none focus:ring-2 focus:ring-[#3F53D9]/20"
                                />
                                <p className="text-xs text-[#6E6E6E] mt-1">Leave blank to keep current password</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <MedicalButton variant="primary" type="submit" disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" /> Save Changes
                                </>
                            )}
                        </MedicalButton>
                    </div>

                </MedicalCard>
            </form>
            )}

            {activeTab === 'health' && (
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    setSaving(true);
                    try {
                        await patientAPI.updateProfile({ healthMetrics });
                        setSuccess(true);
                        setTimeout(() => setSuccess(false), 3000);
                    } catch (error: any) {
                        alert(error.response?.data?.message || 'Failed to update health metrics');
                    } finally {
                        setSaving(false);
                    }
                }}>
                    <MedicalCard variant="filled" className="bg-white border p-6 space-y-6">
                        <div>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-[#3F53D9]" /> Health Metrics
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[#6E6E6E] mb-1 flex items-center gap-2">
                                        <Weight className="w-4 h-4" /> Height (cm)
                                    </label>
                                    <input
                                        type="number"
                                        name="height"
                                        value={healthMetrics.height}
                                        onChange={handleHealthMetricsChange}
                                        placeholder="170"
                                        className="w-full px-4 py-2 rounded-xl border border-[#E8EAFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#3F53D9]/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#6E6E6E] mb-1 flex items-center gap-2">
                                        <Weight className="w-4 h-4" /> Weight (kg)
                                    </label>
                                    <input
                                        type="number"
                                        name="weight"
                                        value={healthMetrics.weight}
                                        onChange={handleHealthMetricsChange}
                                        placeholder="70"
                                        className="w-full px-4 py-2 rounded-xl border border-[#E8EAFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#3F53D9]/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#6E6E6E] mb-1 flex items-center gap-2">
                                        <Activity className="w-4 h-4" /> Blood Pressure
                                    </label>
                                    <input
                                        type="text"
                                        name="bloodPressure"
                                        value={healthMetrics.bloodPressure}
                                        onChange={handleHealthMetricsChange}
                                        placeholder="120/80"
                                        className="w-full px-4 py-2 rounded-xl border border-[#E8EAFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#3F53D9]/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#6E6E6E] mb-1 flex items-center gap-2">
                                        <Heart className="w-4 h-4" /> Heart Rate (bpm)
                                    </label>
                                    <input
                                        type="number"
                                        name="heartRate"
                                        value={healthMetrics.heartRate}
                                        onChange={handleHealthMetricsChange}
                                        placeholder="72"
                                        className="w-full px-4 py-2 rounded-xl border border-[#E8EAFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#3F53D9]/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#6E6E6E] mb-1 flex items-center gap-2">
                                        <Thermometer className="w-4 h-4" /> Temperature (°C)
                                    </label>
                                    <input
                                        type="number"
                                        name="temperature"
                                        value={healthMetrics.temperature}
                                        onChange={handleHealthMetricsChange}
                                        placeholder="36.5"
                                        step="0.1"
                                        className="w-full px-4 py-2 rounded-xl border border-[#E8EAFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#3F53D9]/20"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-[#6E6E6E] mb-1">Allergies</label>
                                <textarea
                                    name="allergies"
                                    value={healthMetrics.allergies}
                                    onChange={handleHealthMetricsChange}
                                    placeholder="List any known allergies..."
                                    rows={2}
                                    className="w-full px-4 py-2 rounded-xl border border-[#E8EAFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#3F53D9]/20"
                                />
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-[#6E6E6E] mb-1">Chronic Conditions</label>
                                <textarea
                                    name="chronicConditions"
                                    value={healthMetrics.chronicConditions}
                                    onChange={handleHealthMetricsChange}
                                    placeholder="List any chronic conditions..."
                                    rows={2}
                                    className="w-full px-4 py-2 rounded-xl border border-[#E8EAFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#3F53D9]/20"
                                />
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-[#6E6E6E] mb-1">Current Medications</label>
                                <textarea
                                    name="currentMedications"
                                    value={healthMetrics.currentMedications}
                                    onChange={handleHealthMetricsChange}
                                    placeholder="List current medications..."
                                    rows={2}
                                    className="w-full px-4 py-2 rounded-xl border border-[#E8EAFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#3F53D9]/20"
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                                <MedicalButton variant="primary" type="submit" disabled={saving}>
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" /> Save Health Metrics
                                        </>
                                    )}
                                </MedicalButton>
                            </div>
                        </div>
                    </MedicalCard>
                </form>
            )}

            {activeTab === 'documents' && (
                <MedicalCard variant="filled" className="bg-white border p-6 space-y-6">
                    <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-[#3F53D9]" /> Health Documents
                        </h3>

                        <div className="border-2 border-dashed border-[#E8EAFF] rounded-xl p-8 text-center">
                            <FileText className="w-12 h-12 text-[#3F53D9] mx-auto mb-4" />
                            <h4 className="font-medium text-[#333] mb-2">Upload Health Documents</h4>
                            <p className="text-sm text-[#6E6E6E] mb-4">Upload lab reports, test results, or other health documents</p>
                            <label className="cursor-pointer">
                                <input
                                    type="file"
                                    multiple
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleDocumentUpload}
                                    className="hidden"
                                />
                                <MedicalButton variant="outlined" type="button">
                                    <Upload className="w-4 h-4 mr-2" />
                                    Choose Files
                                </MedicalButton>
                            </label>
                        </div>

                        {healthDocuments.length > 0 && (
                            <div className="mt-6 space-y-2">
                                <h4 className="font-medium text-[#333]">Selected Documents:</h4>
                                {healthDocuments.map((doc, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-[#F5F3FA] rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-5 h-5 text-[#3F53D9]" />
                                            <span className="text-sm text-[#333]">{doc.name}</span>
                                        </div>
                                        <button
                                            onClick={() => removeDocument(idx)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <MedicalButton
                                    variant="primary"
                                    onClick={async () => {
                                        // Upload documents (simplified - in production, upload to server)
                                        alert('Document upload functionality would be implemented here');
                                    }}
                                    className="mt-4"
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload Documents
                                </MedicalButton>
                            </div>
                        )}

                        {uploadedDocuments.length > 0 && (
                            <div className="mt-6">
                                <h4 className="font-medium text-[#333] mb-4">Uploaded Documents:</h4>
                                <div className="space-y-2">
                                    {uploadedDocuments.map((doc, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-white border border-[#E8EAFF] rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-5 h-5 text-[#3F53D9]" />
                                                <span className="text-sm text-[#333]">{doc}</span>
                                            </div>
                                            <a
                                                href={doc}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[#3F53D9] hover:underline text-sm"
                                            >
                                                View
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </MedicalCard>
            )}

            {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Profile updated successfully!
                </div>
            )}
        </div>
    );
}