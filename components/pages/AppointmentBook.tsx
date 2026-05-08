import React, { useState, useEffect } from 'react';
import { Logo } from '../branding/Logo';
import { MedicalCard } from '../ui-kit/MedicalCard';
import { MedicalButton } from '../ui-kit/MedicalButton';
import { MedicalInput } from '../ui-kit/MedicalInput';
import { Calendar, Clock, MapPin, Search, Star, ArrowLeft, User, CreditCard, Smartphone, Building, X } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface AppointmentBookingProps {
  onNavigate: (page: string) => void;
}

export function AppointmentBooking({ onNavigate }: AppointmentBookingProps) {
  const [selectedDate, setSelectedDate] = useState<string>('2024-11-28');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<number | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking' | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [bookingNotes, setBookingNotes] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load filters from sessionStorage on mount
  useEffect(() => {
    const specialty = sessionStorage.getItem('selectedSpecialty');
    const location = sessionStorage.getItem('selectedLocation');
    if (specialty) {
      setSelectedSpecialty(specialty);
      sessionStorage.removeItem('selectedSpecialty'); // Clear after reading
    }
    if (location) {
      setSelectedLocation(location);
      sessionStorage.removeItem('selectedLocation'); // Clear after reading
    }
  }, []);

  const specialties = [
    'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 
    'Dermatology', 'General Health checkup', 'Gynecology', 'ENT'
  ];

  const allDoctors = [
    {
      id: 1,
      name: 'Dr. Sarah Johnson',
      specialty: 'Cardiologist',
      specialtyCategory: 'Cardiology',
      experience: '15 years',
      rating: 4.9,
      reviews: 245,
      image: 'https://images.unsplash.com/photo-1676552055618-22ec8cde399a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200',
      location: 'Somajiguda',
      fee: 800
    },
    {
      id: 2,
      name: 'Dr. Michael Chen',
      specialty: 'General Physician',
      specialtyCategory: 'General Health checkup',
      experience: '12 years',
      rating: 4.8,
      reviews: 189,
      image: 'https://images.unsplash.com/photo-1755189118414-14c8dacdb082?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200',
      location: 'Hitec City',
      fee: 600
    },
    {
      id: 3,
      name: 'Dr. Priya Sharma',
      specialty: 'Dermatologist',
      specialtyCategory: 'Dermatology',
      experience: '10 years',
      rating: 4.9,
      reviews: 312,
      image: 'https://images.unsplash.com/photo-1676552055618-22ec8cde399a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200',
      location: 'Malakpet',
      fee: 700
    },
    {
      id: 4,
      name: 'Dr. Rajesh Kumar',
      specialty: 'Orthopedic Surgeon',
      specialtyCategory: 'Orthopedics',
      experience: '18 years',
      rating: 4.7,
      reviews: 198,
      image: 'https://images.unsplash.com/photo-1676552055618-22ec8cde399a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200',
      location: 'Secunderabad',
      fee: 900
    },
    {
      id: 5,
      name: 'Dr. Anjali Reddy',
      specialty: 'Cardiologist',
      specialtyCategory: 'Cardiology',
      experience: '14 years',
      rating: 4.8,
      reviews: 267,
      image: 'https://images.unsplash.com/photo-1755189118414-14c8dacdb082?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200',
      location: 'Somajiguda',
      fee: 850
    },
    {
      id: 6,
      name: 'Dr. Vikram Singh',
      specialty: 'Dermatologist',
      specialtyCategory: 'Dermatology',
      experience: '11 years',
      rating: 4.6,
      reviews: 156,
      image: 'https://images.unsplash.com/photo-1676552055618-22ec8cde399a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200',
      location: 'Hitec City',
      fee: 750
    }
  ];

  // Filter doctors based on selected specialty, location, and search query
  const doctors = allDoctors.filter(doctor => {
    // Handle both "General Medicine" and "General Health checkup" for specialty matching
    let matchesSpecialty = !selectedSpecialty;
    if (selectedSpecialty) {
      const specialtyLower = selectedSpecialty.toLowerCase();
      const doctorSpecialty = (doctor.specialtyCategory || doctor.specialty || '').toLowerCase();
      
      // Direct match
      if (doctorSpecialty.includes(specialtyLower) || specialtyLower.includes(doctorSpecialty)) {
        matchesSpecialty = true;
      }
      // Handle "General Health checkup" matching "General Medicine"
      else if (specialtyLower.includes('general health checkup') && (doctorSpecialty.includes('general medicine') || doctorSpecialty.includes('general'))) {
        matchesSpecialty = true;
      }
      // Handle "General Medicine" matching "General Health checkup"
      else if (specialtyLower.includes('general medicine') && (doctorSpecialty.includes('general health checkup') || doctorSpecialty.includes('general'))) {
        matchesSpecialty = true;
      }
    }
    
    const matchesLocation = !selectedLocation || 
      doctor.location.toLowerCase().includes(selectedLocation.toLowerCase());
    const matchesSearch = !searchQuery || 
      doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSpecialty && matchesLocation && matchesSearch;
  });

  const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM',
    '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
  ];

  const handlePayment = async () => {
    if (!paymentMethod || !selectedDoctor) return;
    
    setIsProcessingPayment(true);
    
    try {
      // Step 1: Simulate payment processing (in production, integrate Razorpay/Stripe)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 2: Generate payment ID (in production, this comes from payment gateway)
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const transactionTime = new Date().toISOString();
      
      setPaymentSuccess(true);
      setIsProcessingPayment(false);
      
      // Step 3: Create appointment with payment details
      await createAppointmentWithPayment(paymentId, transactionTime);
      
    } catch (error) {
      console.error('Payment error:', error);
      setIsProcessingPayment(false);
      alert('Payment failed. Please try again.');
    }
  };

  const createAppointmentWithPayment = async (paymentId: string, transactionTime: string) => {
    try {
      const selectedDoctorData = doctors.find(d => d.id === selectedDoctor);
      
      // API call to create appointment with payment
      const response = await fetch('/api/patient/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          doctorId: selectedDoctorData?.id,
          date: selectedDate,
          time: selectedTime,
          status: 'confirmed',
          paymentStatus: 'paid',
          paymentMethod: paymentMethod,
          paymentId: paymentId,
          transactionTime: transactionTime,
          notes: bookingNotes
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Show success message
        alert(`Payment Successful — Appointment Confirmed with Dr. ${selectedDoctorData?.name}!`);
        
        // Auto redirect to home page
        setTimeout(() => {
          onNavigate('patient-dashboard');
        }, 1000);
      } else {
        throw new Error(result.message || 'Booking failed');
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      alert(error.message || 'Failed to create appointment. Please contact support.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3FA]">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Logo variant="primary" size="md" />
            <button 
              onClick={() => onNavigate('patient-dashboard')}
              className="flex items-center gap-2 text-[#6E6E6E] hover:text-[#3F53D9]"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-2">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-medium
                    ${step >= s ? 'bg-[#3F53D9] text-white' : 'bg-[#E5E5E5] text-[#6E6E6E]'}
                  `}>
                    {s}
                  </div>
                  <span className={`hidden md:block ${step >= s ? 'text-[#3F53D9]' : 'text-[#6E6E6E]'}`}>
                    {s === 1 ? 'Select Doctor' : s === 2 ? 'Choose Time' : 'Payment & Booking'}
                  </span>
                </div>
                {s < 3 && <div className={`w-12 h-1 ${step > s ? 'bg-[#3F53D9]' : 'bg-[#E5E5E5]'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step 1: Select Doctor */}
        {step === 1 && (
          <div className="animate-fade-in-up">
            <h2 className="mb-6">Select a Doctor</h2>
            
            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <MedicalInput
                  placeholder="Search doctors by name or specialty..."
                  icon={<Search className="w-5 h-5" />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select 
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full rounded-xl border-2 border-[#E5E5E5] bg-white px-4 py-3 text-black focus:border-[#3F53D9] focus:outline-none focus:ring-2 focus:ring-[#E8EAFF]"
              >
                <option value="">All Specialties</option>
                {specialties.map((specialty) => (
                  <option key={specialty} value={specialty}>{specialty}</option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div className="mb-4">
              <select 
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full md:w-auto rounded-xl border-2 border-[#E5E5E5] bg-white px-4 py-3 text-black focus:border-[#3F53D9] focus:outline-none focus:ring-2 focus:ring-[#E8EAFF]"
              >
                <option value="">All Locations</option>
                <option value="Malakpet">Malakpet</option>
                <option value="Somajiguda">Somajiguda</option>
                <option value="Secunderabad">Secunderabad</option>
                <option value="Hitec City">Hitec City</option>
              </select>
            </div>

            {/* Active Filters */}
            {(selectedSpecialty || selectedLocation || searchQuery) && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span className="text-sm text-[#6E6E6E]">Active filters:</span>
                {selectedSpecialty && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#E8EAFF] text-[#3F53D9] rounded-full text-sm">
                    {selectedSpecialty}
                    <button
                      onClick={() => setSelectedSpecialty('')}
                      className="hover:bg-[#3F53D9] hover:text-white rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedLocation && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#E8F5E9] text-[#4CAF50] rounded-full text-sm">
                    {selectedLocation}
                    <button
                      onClick={() => setSelectedLocation('')}
                      className="hover:bg-[#4CAF50] hover:text-white rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#FFF3E0] text-[#FF9800] rounded-full text-sm">
                    "{searchQuery}"
                    <button
                      onClick={() => setSearchQuery('')}
                      className="hover:bg-[#FF9800] hover:text-white rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSelectedSpecialty('');
                    setSelectedLocation('');
                    setSearchQuery('');
                  }}
                  className="text-sm text-[#E53935] hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Doctors Grid */}
            {doctors.length === 0 ? (
              <MedicalCard variant="filled" className="text-center py-12">
                <p className="text-[#6E6E6E] mb-4">No doctors found matching your filters.</p>
                <MedicalButton
                  variant="outlined"
                  size="sm"
                  onClick={() => {
                    setSelectedSpecialty('');
                    setSelectedLocation('');
                    setSearchQuery('');
                  }}
                >
                  Clear Filters
                </MedicalButton>
              </MedicalCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {doctors.map((doctor) => (
                <MedicalCard 
                  key={doctor.id} 
                  variant={selectedDoctor === doctor.id ? 'pastel' : 'filled'}
                  className={selectedDoctor === doctor.id ? 'border-2 border-[#3F53D9]' : ''}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-24 h-24 rounded-full overflow-hidden mb-4">
                      <ImageWithFallback
                        src={doctor.image}
                        alt={doctor.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h4 className="text-[#333333] mb-1">{doctor.name}</h4>
                    <p className="text-sm text-[#7C74EB] mb-2">{doctor.specialty}</p>
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="w-4 h-4 fill-[#FFB020] text-[#FFB020]" />
                      <span className="text-sm font-medium">{doctor.rating}</span>
                      <span className="text-sm text-[#6E6E6E]">({doctor.reviews})</span>
                    </div>
                    <div className="text-sm text-[#6E6E6E] mb-2">{doctor.experience} experience</div>
                    <div className="flex items-center gap-1 text-sm text-[#6E6E6E] mb-4">
                      <MapPin className="w-4 h-4" />
                      {doctor.location}
                    </div>
                    <div className="text-lg font-medium text-[#3F53D9] mb-4">₹{doctor.fee}</div>
                    <MedicalButton
                      variant={selectedDoctor === doctor.id ? 'primary' : 'outlined'}
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedDoctor(doctor.id);
                        setStep(2);
                      }}
                    >
                      {selectedDoctor === doctor.id ? 'Selected' : 'Select'}
                    </MedicalButton>
                  </div>
                </MedicalCard>
                ))}
              </div>
            )}
            {doctors.length > 0 && (
              <div className="mt-4 text-sm text-[#6E6E6E] text-center">
                Showing {doctors.length} doctor{doctors.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Choose Date & Time */}
        {step === 2 && (
          <div className="max-w-4xl mx-auto animate-fade-in-up">
            <h2 className="mb-6">Choose Date & Time</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Date Selection */}
              <MedicalCard variant="filled" hover={false}>
                <h3 className="mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#3F53D9]" />
                  Select Date
                </h3>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-xl border-2 border-[#E5E5E5] bg-white px-4 py-3 text-black focus:border-[#3F53D9] focus:outline-none focus:ring-2 focus:ring-[#E8EAFF]"
                />
              </MedicalCard>

              {/* Selected Doctor Info */}
              <MedicalCard variant="pastel" hover={false}>
                <h3 className="mb-4">Selected Doctor</h3>
                {selectedDoctor && (
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden">
                      <ImageWithFallback
                        src={doctors.find(d => d.id === selectedDoctor)?.image || ''}
                        alt={doctors.find(d => d.id === selectedDoctor)?.name || ''}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4>{doctors.find(d => d.id === selectedDoctor)?.name}</h4>
                      <p className="text-sm text-[#6E6E6E]">
                        {doctors.find(d => d.id === selectedDoctor)?.specialty}
                      </p>
                    </div>
                  </div>
                )}
              </MedicalCard>
            </div>

            {/* Time Slots */}
            <MedicalCard variant="filled" hover={false} className="mt-6">
              <h3 className="mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#3F53D9]" />
                Available Time Slots
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`
                      py-3 px-2 rounded-xl border-2 text-sm font-medium transition-all
                      ${selectedTime === time 
                        ? 'border-[#3F53D9] bg-[#E8EAFF] text-[#3F53D9]' 
                        : 'border-[#E5E5E5] hover:border-[#7C74EB]'
                      }
                    `}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </MedicalCard>

            <div className="flex gap-4 mt-6">
              <MedicalButton variant="outlined" size="lg" onClick={() => setStep(2)}>
                Back
              </MedicalButton>
              <MedicalButton 
                variant="primary" 
                size="lg" 
                onClick={() => setStep(3)}
                disabled={!selectedTime}
                className="flex-1"
              >
                Proceed to Payment
              </MedicalButton>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto animate-fade-in-up">
            <h2 className="mb-6">Complete Payment to Confirm Booking</h2>
            
            <MedicalCard variant="filled" hover={false}>
              <div className="space-y-6">
                {/* Payment Summary */}
                <div className="pb-6 border-b border-[#E5E5E5]">
                  <h3 className="mb-4">Payment Summary</h3>
                  <div className="flex justify-between py-3">
                    <span className="text-[#6E6E6E]">Consultation Fee</span>
                    <span className="font-medium">₹{doctors.find(d => d.id === selectedDoctor)?.fee}</span>
                  </div>
                  <div className="flex justify-between py-3 font-medium">
                    <span>Total Amount</span>
                    <span className="text-xl text-[#3F53D9]">₹{doctors.find(d => d.id === selectedDoctor)?.fee}</span>
                  </div>
                </div>
                
                {/* Payment Methods */}
                <div>
                  <h3 className="mb-4">Select Payment Method</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* UPI Option */}
                    <MedicalCard 
                      variant={paymentMethod === 'upi' ? 'pastel' : 'filled'}
                      className={`cursor-pointer transition-all ${paymentMethod === 'upi' ? 'border-2 border-[#3F53D9]' : 'hover:border-[#7C74EB]'}`}
                      onClick={() => setPaymentMethod('upi')}
                    >
                      <div className="flex flex-col items-center text-center p-4">
                        <Smartphone className="w-8 h-8 text-[#3F53D9] mb-2" />
                        <h4 className="font-medium mb-1">UPI</h4>
                        <p className="text-xs text-[#6E6E6E]">Google Pay, PhonePe</p>
                      </div>
                    </MedicalCard>
                    
                    {/* Card Option */}
                    <MedicalCard 
                      variant={paymentMethod === 'card' ? 'pastel' : 'filled'}
                      className={`cursor-pointer transition-all ${paymentMethod === 'card' ? 'border-2 border-[#3F53D9]' : 'hover:border-[#7C74EB]'}`}
                      onClick={() => setPaymentMethod('card')}
                    >
                      <div className="flex flex-col items-center text-center p-4">
                        <CreditCard className="w-8 h-8 text-[#3F53D9] mb-2" />
                        <h4 className="font-medium mb-1">Card</h4>
                        <p className="text-xs text-[#6E6E6E]">Credit/Debit Card</p>
                      </div>
                    </MedicalCard>
                    
                    {/* Net Banking Option */}
                    <MedicalCard 
                      variant={paymentMethod === 'netbanking' ? 'pastel' : 'filled'}
                      className={`cursor-pointer transition-all ${paymentMethod === 'netbanking' ? 'border-2 border-[#3F53D9]' : 'hover:border-[#7C74EB]'}`}
                      onClick={() => setPaymentMethod('netbanking')}
                    >
                      <div className="flex flex-col items-center text-center p-4">
                        <Building className="w-8 h-8 text-[#3F53D9] mb-2" />
                        <h4 className="font-medium mb-1">Net Banking</h4>
                        <p className="text-xs text-[#6E6E6E]">Bank Transfer</p>
                      </div>
                    </MedicalCard>
                  </div>
                </div>
                
                {/* Payment Button */}
                {paymentMethod && (
                  <div className="pt-4">
                    <MedicalButton 
                      variant="primary" 
                      size="lg" 
                      onClick={handlePayment}
                      disabled={isProcessingPayment || paymentSuccess}
                      className="w-full"
                    >
                      {isProcessingPayment ? 'Processing Payment...' : paymentSuccess ? 'Payment Successful!' : `Pay Now ₹${doctors.find(d => d.id === selectedDoctor)?.fee}`}
                    </MedicalButton>
                    
                    {paymentSuccess && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                        <div className="text-green-600 font-medium text-lg">Payment Successful!</div>
                        <div className="text-green-600 text-sm mt-1">Appointment Confirmed</div>
                        <div className="text-green-500 text-sm mt-1">Redirecting to home page...</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </MedicalCard>

            <div className="flex gap-4 mt-6">
              <MedicalButton variant="outlined" size="lg" onClick={() => setStep(2)}>
                Back to Time Selection
              </MedicalButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
