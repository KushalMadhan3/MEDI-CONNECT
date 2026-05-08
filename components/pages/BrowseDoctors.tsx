import React, { useEffect, useState } from 'react';
import { Stethoscope, Search, Star, Clock, MapPin, ArrowLeft, Loader2, Award, DollarSign } from 'lucide-react';
import { Logo } from '../branding/Logo';
import { MedicalButton } from '../ui-kit/MedicalButton';
import { MedicalCard } from '../ui-kit/MedicalCard';
import type { NavigateFn } from '../../types/navigation';

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  experience: string;
  rating: number;
  consultationPrice: number;
  image?: string;
  availability?: string[];
  about?: string;
}

export function BrowseDoctors({ onNavigate }: { onNavigate: NavigateFn }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const categories = [
    { id: '', label: 'All Specialties' },
    { id: 'Cardiology', label: 'Cardiology' },
    { id: 'Dermatology', label: 'Dermatology' },
    { id: 'Orthopedics', label: 'Orthopedics' },
    { id: 'General Health checkup', label: 'General Health checkup' }
  ];

  useEffect(() => {
    fetchDoctors();
  }, [selectedCategory]);

  const fetchDoctors = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) {
        params.append('category', selectedCategory);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      // Use public endpoint without authentication
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const url = `${apiUrl}/api/patient/doctors/public?${params.toString()}`;
      
      console.log('🔍 Fetching doctors from:', url);
      console.log('🔍 API URL:', apiUrl);
      console.log('🔍 Full URL:', url);
      
      let res;
      try {
        res = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Explicitly don't include Authorization header for public endpoint
        });
      } catch (fetchError: any) {
        // Handle network errors (CORS, connection refused, etc.)
        console.error('Fetch error:', fetchError);
        if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('NetworkError') || fetchError.name === 'TypeError') {
          throw new Error(
            'Cannot connect to server. Please ensure:\n' +
            '1. The backend server is running on port 3001\n' +
            '2. CORS is properly configured\n' +
            '3. Check your network connection\n' +
            '4. Try: npm start in the server directory'
          );
        }
        throw fetchError;
      }
      
      console.log('Response status:', res.status, res.statusText);
      
      if (!res.ok) {
        let errorText = '';
        let errorData;
        
        try {
          errorText = await res.text();
          if (errorText) {
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = { message: errorText || `HTTP ${res.status}` };
            }
          } else {
            errorData = { message: `HTTP ${res.status} ${res.statusText}` };
          }
        } catch (parseError) {
          errorData = { message: `Failed to parse error response: ${res.status}` };
        }
        
        console.error('❌ API Error:', {
          status: res.status,
          statusText: res.statusText,
          errorData,
          url,
          responseHeaders: Object.fromEntries(res.headers.entries())
        });
        
        // Log the actual error response for debugging
        if (errorText) {
          console.error('Error response body:', errorText);
        }
        
        // Handle specific error cases
        if (res.status === 401) {
          throw new Error('Access denied. Please ensure the public endpoint is configured correctly.');
        }
        
        // If 404, provide helpful troubleshooting
        if (res.status === 404) {
          throw new Error(
            'Doctors endpoint not found. Please ensure:\n' +
            '1. The backend server is running on port 3001\n' +
            '2. The route /api/patient/doctors/public is configured\n' +
            '3. Check the browser console for more details'
          );
        }
        
        // Network errors
        if (res.status === 0 || !res.status) {
          throw new Error(
            'Cannot connect to server. Please ensure:\n' +
            '1. The backend server is running (http://localhost:3001)\n' +
            '2. CORS is properly configured\n' +
            '3. Check your network connection'
          );
        }
        
        throw new Error(errorData.message || `Failed to fetch doctors: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      console.log('Doctors data received:', data);
      
      if (data.success && Array.isArray(data.data)) {
        setDoctors(data.data || []);
        if (data.data.length === 0) {
          console.log('No doctors found in database');
        }
      } else if (data.success && Array.isArray(data)) {
        // Handle case where data is directly an array
        setDoctors(data || []);
      } else if (Array.isArray(data)) {
        // Handle case where response is directly an array
        setDoctors(data || []);
      } else {
        console.warn('Unexpected response format:', data);
        setDoctors([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch doctors', error);
      
      // Provide more helpful error message based on error type
      let errorMessage = 'Failed to load doctors. Please try again.';
      
      if (error.message?.includes('401') || error.message?.includes('Access denied')) {
        errorMessage = 'Unable to access doctors list. Please try again or contact support.';
      } else if (error.message?.includes('Network') || error.message?.includes('fetch') || error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError') || error.message?.includes('Cannot connect')) {
        errorMessage = 'Cannot connect to server. Please ensure:\n• The backend server is running on port 3001\n• Check your network connection\n• Try refreshing the page';
      } else if (error.message?.includes('404') || error.message?.includes('not found') || error.message?.includes('endpoint not found')) {
        errorMessage = error.message || 'Doctors endpoint not found. Please ensure:\n• The backend server is running on port 3001\n• The route /api/patient/doctors/public is configured\n• Check the browser console for more details';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchDoctors();
  };

  const filteredDoctors = doctors.filter(doctor => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      doctor.name.toLowerCase().includes(query) ||
      doctor.specialization.toLowerCase().includes(query) ||
      doctor.about?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3FA] via-[#FAFBFF] to-[#F0EDFF]">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-[#E8EAFF]">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => onNavigate('landing')} 
              className="cursor-pointer transform hover:scale-105 transition-transform duration-300"
            >
              <Logo variant="primary" size="md" />
            </button>
            <div className="flex items-center gap-4">
              <MedicalButton
                variant="outlined"
                size="sm"
                onClick={() => onNavigate('landing')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </MedicalButton>
              <MedicalButton
                variant="primary"
                size="sm"
                onClick={() => onNavigate('login')}
              >
                Login
              </MedicalButton>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
            <Stethoscope className="w-10 h-10 text-[#3F53D9]" />
            Browse Our Doctors
          </h1>
          <p className="text-lg text-gray-600">
            Find the right specialist for your healthcare needs
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3F53D9] focus:border-transparent"
              />
            </div>
            <MedicalButton
              variant="primary"
              size="md"
              onClick={handleSearch}
            >
              Search
            </MedicalButton>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-3 mt-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === category.id
                    ? 'bg-[#3F53D9] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-12 h-12 text-[#3F53D9] animate-spin mb-4" />
            <p className="text-gray-500">Loading doctors...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Stethoscope className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Doctors</h3>
            </div>
            <div className="bg-white rounded-lg p-4 mb-4">
              <p className="text-red-700 whitespace-pre-line text-sm text-left">{error}</p>
            </div>
            <div className="flex gap-3 justify-center">
              <MedicalButton
                variant="outlined"
                size="sm"
                onClick={fetchDoctors}
              >
                Try Again
              </MedicalButton>
              <MedicalButton
                variant="outlined"
                size="sm"
                onClick={() => onNavigate('landing')}
              >
                Back to Home
              </MedicalButton>
            </div>
          </div>
        )}

        {/* Doctors Grid */}
        {!loading && !error && (
          <>
            {doctors.length === 0 ? (
              <div className="text-center py-16">
                <Stethoscope className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No doctors available</h3>
                <p className="text-gray-500 mb-4">There are currently no doctors registered in the system.</p>
                <MedicalButton
                  variant="outlined"
                  size="sm"
                  onClick={fetchDoctors}
                >
                  Refresh
                </MedicalButton>
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="text-center py-16">
                <Stethoscope className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No doctors found</h3>
                <p className="text-gray-500">Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              <>
                <div className="mb-4 text-gray-600">
                  Found {filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? 's' : ''}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDoctors.map((doctor) => (
                    <MedicalCard
                      key={doctor.id}
                      variant="outlined"
                      className="hover:shadow-xl transition-all duration-300"
                    >
                      <div className="p-6">
                        {/* Doctor Image and Basic Info */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-20 h-20 rounded-full bg-[#E8EAFF] flex items-center justify-center overflow-hidden flex-shrink-0">
                            {doctor.image ? (
                              <img
                                src={doctor.image}
                                alt={doctor.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '';
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Stethoscope className="w-10 h-10 text-[#3F53D9]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-xl text-gray-900 mb-2 truncate">
                              {doctor.name}
                            </h3>
                            <div className="flex items-center gap-2 mb-2">
                              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              <span className="text-sm font-semibold text-gray-900">
                                {doctor.rating.toFixed(1)}
                              </span>
                              <span className="text-xs text-gray-500">Rating</span>
                            </div>
                          </div>
                        </div>

                        {/* Doctor Details */}
                        <div className="space-y-3 mb-4">
                          {/* Specialization Badge */}
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-[#3F53D9]" />
                            <span className="text-sm font-semibold text-[#3F53D9] bg-[#E8EAFF] px-2 py-1 rounded">
                              {doctor.specialization}
                            </span>
                          </div>
                          
                          {/* Experience */}
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4 text-[#3F53D9]" />
                            <span className="font-medium">{doctor.experience} of experience</span>
                          </div>
                          
                          {/* Rating */}
                          <div className="flex items-center gap-2 text-sm">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              <span className="font-semibold text-gray-900">{doctor.rating.toFixed(1)}</span>
                            </div>
                            <span className="text-gray-500">Rating</span>
                          </div>
                          
                          {/* About/Bio */}
                          {doctor.about && (
                            <div className="pt-2 border-t border-gray-100">
                              <p className="text-sm text-gray-600 leading-relaxed">
                                {doctor.about}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Availability */}
                        {doctor.availability && doctor.availability.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                              Available
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {doctor.availability.slice(0, 3).map((slot, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                                >
                                  {slot}
                                </span>
                              ))}
                              {doctor.availability.length > 3 && (
                                <span className="px-2 py-1 text-gray-500 text-xs">
                                  +{doctor.availability.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Price and Action */}
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-5 h-5 text-[#3F53D9]" />
                              <div>
                                <p className="text-xs text-gray-500 uppercase">Consultation Fee</p>
                                <p className="text-2xl font-bold text-[#3F53D9]">
                                  ₹{doctor.consultationPrice}
                                </p>
                              </div>
                            </div>
                          </div>
                          <MedicalButton
                            variant="primary"
                            size="md"
                            onClick={() => {
                              // Navigate to login if user wants to book
                              if (confirm('Please login to book an appointment with this doctor. Would you like to login now?')) {
                                sessionStorage.setItem('selectedDoctorId', doctor.id);
                                sessionStorage.setItem('selectedSpecialty', doctor.specialization);
                                onNavigate('login');
                              }
                            }}
                            className="w-full"
                          >
                            Book Appointment
                          </MedicalButton>
                        </div>
                      </div>
                    </MedicalCard>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

