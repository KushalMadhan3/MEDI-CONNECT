import React, { useState, useEffect } from 'react';
import { MedicalCard } from '../ui-kit/MedicalCard';
import { MedicalButton } from '../ui-kit/MedicalButton';
import { Stethoscope, Star, Clock, MapPin, Calendar, Check, Briefcase, DollarSign, Loader2, X, CreditCard, Smartphone, Building } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { patientAPI, type Doctor, type Appointment } from '../../src/services/patientService';

// Local Doctor interface extending the imported one
interface LocalDoctor extends Doctor {
    availability?: string[];
}

interface DoctorCategorySectionProps {
    onNavigateToHome?: () => void;
}

export function DoctorCategorySection({ onNavigateToHome }: DoctorCategorySectionProps = {}) {
    const [categories] = useState([
        { id: 'Cardiology', label: 'Cardiology', description: 'Heart Specialists', icon: '❤️' },
        { id: 'Dermatology', label: 'Dermatology', description: 'Skin & Hair Care', icon: '🧴' },
        { id: 'Orthopedics', label: 'Orthopedics', description: 'Bone & Joint Care', icon: '🦴' },
        { id: 'General Medicine', label: 'General Health checkup', description: 'Common Illnesses', icon: '🩺' }
    ]);
    const [selectedCategory, setSelectedCategory] = useState('Cardiology');
    const [doctors, setDoctors] = useState<LocalDoctor[]>([]);
    const [loading, setLoading] = useState(false);
    const [bookingDoctor, setBookingDoctor] = useState<LocalDoctor | null>(null);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [availableSlots, setAvailableSlots] = useState<Array<{ time: string; available: boolean }>>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<string>('');
    const [showPayment, setShowPayment] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking' | ''>('');
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [bookingNotes, setBookingNotes] = useState('');

    useEffect(() => {
        fetchDoctors(selectedCategory);
    }, [selectedCategory]);

    // Fetch available slots when date is selected
    useEffect(() => {
        if (bookingDoctor && selectedDate) {
            fetchAvailableSlots(bookingDoctor.id, selectedDate);
        } else {
            setAvailableSlots([]);
            setSelectedSlot('');
        }
    }, [bookingDoctor, selectedDate]);

    const fetchDoctors = async (category: string) => {
        setLoading(true);
        try {
            const doctorsData = await patientAPI.getDoctors(category);
            setDoctors(doctorsData);
        } catch (error: any) {
            console.error('Failed to fetch doctors', error);
            setDoctors([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableSlots = async (doctorId: string, date: string) => {
        if (!doctorId || !date) return;
        
        setLoadingSlots(true);
        setSelectedSlot(''); // Reset selected slot when fetching new slots
        try {
            const res = await fetch(`http://localhost:3001/api/patient/doctors/${doctorId}/slots?date=${date}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            if (!res.ok) {
                throw new Error('Failed to fetch slots');
            }
            
            const data = await res.json();
            if (data.success) {
                setAvailableSlots(data.data || []);
            } else {
                setAvailableSlots([]);
            }
        } catch (error) {
            console.error('Failed to fetch slots', error);
            setAvailableSlots([]);
        } finally {
            setLoadingSlots(false);
        }
    };

    const handleProceedToPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!bookingDoctor || !selectedDate || !selectedSlot) {
            alert('Please select date and time slot');
            return;
        }

        const form = e.target as HTMLFormElement;
        const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement)?.value || '';
        setBookingNotes(notes);
        
        // Show payment section
        setShowPayment(true);
    };

    const handlePayment = async () => {
        if (!paymentMethod || !bookingDoctor) return;
        
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
            // API call to create appointment with payment
            const response = await fetch('http://localhost:3001/api/patient/appointments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    doctorId: bookingDoctor?.id,
                    date: selectedDate,
                    time: selectedSlot,
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
                setBookingSuccess(true);
                
                // Reset all states and redirect to home
                setTimeout(() => {
                    setBookingDoctor(null);
                    setSelectedDate('');
                    setSelectedSlot('');
                    setAvailableSlots([]);
                    setShowPayment(false);
                    setPaymentMethod('');
                    setPaymentSuccess(false);
                    setBookingNotes('');
                    
                    // Redirect to patient home page
                    if (onNavigateToHome) {
                        onNavigateToHome();
                    }
                    
                    // Refresh doctors list
                    fetchDoctors(selectedCategory);
                    
                    // Hide success message after showing it
                    setTimeout(() => {
                        setBookingSuccess(false);
                    }, 3000);
                }, 2000);
            } else {
                throw new Error(result.message || 'Booking failed');
            }
        } catch (error: any) {
            console.error('Booking error:', error);
            alert(error.message || 'Failed to create appointment. Please contact support.');
            setPaymentSuccess(false);
        }
    };

    const handleCancelBooking = () => {
        setBookingDoctor(null);
        setSelectedDate('');
        setSelectedSlot('');
        setAvailableSlots([]);
        setShowPayment(false);
        setPaymentMethod('');
        setPaymentSuccess(false);
        setBookingNotes('');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[#333]">Find a Specialist</h2>
                    <p className="text-[#6E6E6E] mt-1">Book appointments with verified doctors</p>
                </div>
            </div>

            {/* Success Message */}
            {bookingSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
                    ✅ Payment Successful — Appointment Confirmed! Redirecting to home page...
                </div>
            )}

            {/* Categories */}
            <div className="flex gap-4 overflow-x-auto pb-2">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex flex-col items-start gap-1 px-6 py-4 rounded-xl whitespace-nowrap transition-all min-w-[180px] ${selectedCategory === cat.id
                                ? 'bg-[#3F53D9] text-white shadow-lg shadow-[#3F53D9]/20'
                                : 'bg-white text-[#6E6E6E] hover:bg-[#F5F3FA] border border-[#E8EAFF]'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">{cat.icon}</span>
                            <span className="font-bold">{cat.label}</span>
                        </div>
                        <span className={`text-xs ${selectedCategory === cat.id ? 'text-white/80' : 'text-[#6E6E6E]'}`}>
                            {cat.description}
                        </span>
                    </button>
                ))}
            </div>

            {/* Doctor List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-[#3F53D9] animate-spin" />
                    <span className="ml-3 text-[#6E6E6E]">Loading doctors...</span>
                </div>
            ) : doctors.length === 0 ? (
                <div className="text-center py-12 text-[#6E6E6E] bg-[#F5F3FA] rounded-xl">
                    No doctors available in this category. Please check back later.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {doctors.map(doc => (
                        <MedicalCard key={doc.id} variant="filled" className="bg-white border hover:shadow-md transition-all">
                            <div className="flex flex-col h-full">
                                <div className="relative h-48 rounded-xl overflow-hidden mb-4 bg-[#F5F3FA]">
                                    <ImageWithFallback
                                        src={doc.image || `https://i.pravatar.cc/400?img=${doc.id}`}
                                        alt={doc.name}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold text-[#3F53D9] flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-current" /> {doc.rating || 4.5}
                                    </div>
                                </div>

                                <h3 className="font-bold text-lg mb-1">{doc.name}</h3>
                                <p className="text-[#3F53D9] text-sm font-medium mb-3">{doc.specialization}</p>

                                <div className="text-sm text-[#6E6E6E] space-y-2 mb-4">
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="w-4 h-4" /> {doc.experience || '5+ years'} Experience
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="w-4 h-4" /> ₹{doc.consultationPrice || 500} Consultation
                                    </div>
                                    {doc.availability && doc.availability.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4" /> {doc.availability.length} slots available
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto">
                                    <MedicalButton
                                        variant="primary"
                                        className="w-full"
                                        onClick={() => setBookingDoctor(doc)}
                                    >
                                        Book Appointment
                                    </MedicalButton>
                                </div>
                            </div>
                        </MedicalCard>
                    ))}
                </div>
            )}

            {/* Booking Modal */}
            {bookingDoctor && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">Book Appointment</h3>
                                <p className="text-sm text-gray-500 mt-1">with {bookingDoctor.name} - {bookingDoctor.specialization}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setBookingDoctor(null);
                                    setSelectedDate('');
                                    setSelectedSlot('');
                                    setAvailableSlots([]);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleProceedToPayment} className="space-y-6">
                            {/* Date Selection */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Select Date
                                </label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => {
                                        setSelectedDate(e.target.value);
                                        setSelectedSlot(''); // Reset slot when date changes
                                    }}
                                    min={new Date().toISOString().split('T')[0]} // Prevent past dates
                                    required
                                    className="w-full p-3.5 rounded-xl border-2 border-[#E8EAFF] focus:outline-none focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                                />
                            </div>

                            {/* Time Slot Selection */}
                            {selectedDate && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        Select Time Slot
                                    </label>
                                    {loadingSlots ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="w-5 h-5 animate-spin text-[#3F53D9]" />
                                            <span className="ml-2 text-gray-500">Loading available slots...</span>
                                        </div>
                                    ) : availableSlots.length > 0 ? (
                                        <div className="grid grid-cols-4 gap-3">
                                            {availableSlots.map((slot, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setSelectedSlot(slot.time)}
                                                    disabled={!slot.available}
                                                    className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                                                        selectedSlot === slot.time
                                                            ? 'bg-[#3F53D9] text-white border-[#3F53D9] shadow-lg'
                                                            : slot.available
                                                            ? 'bg-white text-gray-700 border-[#E8EAFF] hover:border-[#3F53D9]/50 hover:bg-[#F5F3FA]'
                                                            : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                    }`}
                                                >
                                                    {slot.time}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
                                            No slots available for this date. Please select another date.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Reason / Notes */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for Visit / Notes</label>
                                <textarea
                                    name="notes"
                                    rows={3}
                                    value={bookingNotes}
                                    onChange={(e) => setBookingNotes(e.target.value)}
                                    className="w-full p-3.5 rounded-xl border-2 border-[#E8EAFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all resize-none"
                                    placeholder="Briefly describe your symptoms or reason for consultation..."
                                ></textarea>
                            </div>

                            {/* Booking Summary */}
                            {selectedDate && selectedSlot && !showPayment && (
                                <div className="bg-gradient-to-r from-[#F5F3FA] to-white p-4 rounded-xl border border-[#E8EAFF]">
                                    <h4 className="font-semibold text-gray-900 mb-2">Booking Summary</h4>
                                    <div className="space-y-1 text-sm text-gray-600">
                                        <p><strong>Doctor:</strong> {bookingDoctor.name}</p>
                                        <p><strong>Date:</strong> {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        <p><strong>Time:</strong> {selectedSlot}</p>
                                        <p><strong>Fee:</strong> ₹{bookingDoctor.consultationPrice || 500}</p>
                                    </div>
                                </div>
                            )}

                            {/* Payment Section */}
                            {showPayment && (
                                <div className="space-y-4">
                                    <div className="border-t border-gray-200 pt-4">
                                        <h4 className="font-semibold text-gray-900 mb-4">Complete Payment to Confirm Booking</h4>
                                        
                                        {/* Payment Summary */}
                                        <div className="bg-gradient-to-r from-[#F5F3FA] to-white p-4 rounded-xl border border-[#E8EAFF] mb-4">
                                            <div className="flex justify-between py-2">
                                                <span className="text-gray-600">Consultation Fee</span>
                                                <span className="font-medium">₹{bookingDoctor.consultationPrice || 500}</span>
                                            </div>
                                            <div className="flex justify-between py-2 font-semibold text-lg border-t border-gray-200 mt-2 pt-2">
                                                <span>Total Amount</span>
                                                <span className="text-[#3F53D9]">₹{bookingDoctor.consultationPrice || 500}</span>
                                            </div>
                                        </div>
                                        
                                        {/* Payment Methods */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-semibold text-gray-700 mb-3">Select Payment Method</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {/* UPI Option */}
                                                <button
                                                    type="button"
                                                    onClick={() => setPaymentMethod('upi')}
                                                    className={`p-4 rounded-xl border-2 transition-all ${
                                                        paymentMethod === 'upi'
                                                            ? 'bg-[#3F53D9] text-white border-[#3F53D9] shadow-lg'
                                                            : 'bg-white text-gray-700 border-[#E8EAFF] hover:border-[#3F53D9]/50'
                                                    }`}
                                                >
                                                    <div className="flex flex-col items-center text-center">
                                                        <Smartphone className={`w-6 h-6 mb-2 ${paymentMethod === 'upi' ? 'text-white' : 'text-[#3F53D9]'}`} />
                                                        <span className="font-medium text-sm">UPI</span>
                                                        <span className={`text-xs mt-1 ${paymentMethod === 'upi' ? 'text-white/80' : 'text-gray-500'}`}>GPay, PhonePe</span>
                                                    </div>
                                                </button>
                                                
                                                {/* Card Option */}
                                                <button
                                                    type="button"
                                                    onClick={() => setPaymentMethod('card')}
                                                    className={`p-4 rounded-xl border-2 transition-all ${
                                                        paymentMethod === 'card'
                                                            ? 'bg-[#3F53D9] text-white border-[#3F53D9] shadow-lg'
                                                            : 'bg-white text-gray-700 border-[#E8EAFF] hover:border-[#3F53D9]/50'
                                                    }`}
                                                >
                                                    <div className="flex flex-col items-center text-center">
                                                        <CreditCard className={`w-6 h-6 mb-2 ${paymentMethod === 'card' ? 'text-white' : 'text-[#3F53D9]'}`} />
                                                        <span className="font-medium text-sm">Card</span>
                                                        <span className={`text-xs mt-1 ${paymentMethod === 'card' ? 'text-white/80' : 'text-gray-500'}`}>Debit/Credit</span>
                                                    </div>
                                                </button>
                                                
                                                {/* Net Banking Option */}
                                                <button
                                                    type="button"
                                                    onClick={() => setPaymentMethod('netbanking')}
                                                    className={`p-4 rounded-xl border-2 transition-all ${
                                                        paymentMethod === 'netbanking'
                                                            ? 'bg-[#3F53D9] text-white border-[#3F53D9] shadow-lg'
                                                            : 'bg-white text-gray-700 border-[#E8EAFF] hover:border-[#3F53D9]/50'
                                                    }`}
                                                >
                                                    <div className="flex flex-col items-center text-center">
                                                        <Building className={`w-6 h-6 mb-2 ${paymentMethod === 'netbanking' ? 'text-white' : 'text-[#3F53D9]'}`} />
                                                        <span className="font-medium text-sm">Net Banking</span>
                                                        <span className={`text-xs mt-1 ${paymentMethod === 'netbanking' ? 'text-white/80' : 'text-gray-500'}`}>Bank Transfer</span>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Pay Now Button */}
                                        {paymentMethod && (
                                            <div>
                                                <MedicalButton
                                                    type="button"
                                                    variant="primary"
                                                    className="w-full"
                                                    onClick={handlePayment}
                                                    disabled={isProcessingPayment || paymentSuccess}
                                                >
                                                    {isProcessingPayment ? 'Processing Payment...' : paymentSuccess ? 'Payment Successful!' : `Pay Now ₹${bookingDoctor.consultationPrice || 500}`}
                                                </MedicalButton>
                                                
                                                {paymentSuccess && (
                                                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                                                        <div className="text-green-600 font-medium text-lg">Payment Successful!</div>
                                                        <div className="text-green-600 text-sm mt-1">Appointment Confirmed</div>
                                                        <div className="text-green-500 text-sm mt-1">Redirecting...</div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-4 pt-4">
                                <MedicalButton
                                    type="button"
                                    variant="outlined"
                                    className="flex-1"
                                    onClick={handleCancelBooking}
                                >
                                    Cancel
                                </MedicalButton>
                                {!showPayment && (
                                    <MedicalButton
                                        type="submit"
                                        variant="primary"
                                        className="flex-1"
                                        disabled={!selectedDate || !selectedSlot}
                                    >
                                        {selectedDate && selectedSlot ? 'Proceed to Payment' : 'Select Date & Time'}
                                    </MedicalButton>
                                )}
                                {showPayment && (
                                    <MedicalButton
                                        type="button"
                                        variant="outlined"
                                        className="flex-1"
                                        onClick={() => setShowPayment(false)}
                                        disabled={isProcessingPayment || paymentSuccess}
                                    >
                                        Back to Booking
                                    </MedicalButton>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

