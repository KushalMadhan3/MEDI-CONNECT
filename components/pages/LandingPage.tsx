import React, { useEffect, useState } from 'react';
import { Logo } from '../branding/Logo';
import { MedicalButton } from '../ui-kit/MedicalButton';
import { MedicalCard } from '../ui-kit/MedicalCard';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import {
  DoctorIcon,
  AppointmentIcon,
  RecordsIcon,
  SpecialtiesIcon,
  LocationIcon,
  SecondOpinionIcon
} from '../illustrations/MedicalIcons';
import { Calendar, MapPin, Users, FileText, Stethoscope, Heart, UserRound, Bone, Activity, Pill, FlaskConical, Ambulance, Video, Shield, X, CheckCircle2 } from 'lucide-react';
import type { NavigateFn, Page } from '../../types/navigation';

// Doctor team image - replace with actual path when deploying
const doctorTeamImage = 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=800&q=80';

type ServiceType = {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  description: string;
  color: string;
  target: Page;
  requireAuth: boolean;
  serviceType: string;
  detailedDescription: string;
  features: string[];
};

export function LandingPage({ onNavigate }: { onNavigate: NavigateFn }) {
  const [scrollY, setScrollY] = useState(0);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const heroParallax = Math.min(scrollY * 0.05, 40);
  const heroImageParallax = Math.min(scrollY * 0.08, 60);
  const servicesDrift = scrollY > 400 ? Math.min((scrollY - 400) * 0.04, 45) : 0;
  const statsTilt = scrollY > 900 ? Math.min((scrollY - 900) * 0.03, 30) : 0;
  const specialities = [
    { icon: Heart, name: 'Cardiology', description: 'Heart specialists', color: '#FF6B9D' },
    { icon: UserRound, name: 'Dermatology', description: 'Skin and hair care', color: '#7C74EB' },
    { icon: Bone, name: 'Orthopedics', description: 'Bone & joint care', color: '#34D1BF' },
    { icon: Activity, name: 'General Health checkup', description: 'All common illnesses', color: '#3F53D9' }
  ];

  const locations = [
    { name: 'Malakpet', address: 'Main Road, Malakpet' },
    { name: 'Somajiguda', address: 'Central Avenue, Somajiguda' },
    { name: 'Secunderabad', address: 'MG Road, Secunderabad' },
    { name: 'Hitec City', address: 'HITEC City, Madhapur' }
  ];

  const services: ServiceType[] = [
    { 
      icon: Pill, 
      title: 'Online Pharmacy', 
      description: 'Order medicines online with doorstep delivery and electronic bills', 
      color: '#7C74EB', 
      target: 'patient-dashboard' as Page, 
      requireAuth: false,
      serviceType: 'pharmacy',
      detailedDescription: 'Order prescription and over-the-counter medicines online with our comprehensive pharmacy service. Features include:\n\n• Doorstep delivery across all locations\n• Electronic bills and prescription tracking\n• Verified medicines from licensed pharmacies\n• Prescription upload and verification\n• Medicine reminders and refill alerts\n• Discounts and offers on regular orders\n• Secure payment options',
      features: [
        'Prescription & OTC medicines',
        'Doorstep delivery',
        'Electronic bills',
        'Medicine reminders',
        'Secure payments'
      ]
    },
    { 
      icon: FlaskConical, 
      title: 'Lab Test Booking', 
      description: 'Book blood tests, scans, and diagnostics with sample pickup support', 
      color: '#34D1BF', 
      target: 'patient-dashboard' as Page, 
      requireAuth: false,
      serviceType: 'lab-tests',
      detailedDescription: 'Book diagnostic tests and health screenings with ease. Our lab test booking service offers:\n\n• Wide range of blood tests, scans, and diagnostics\n• Home sample collection available\n• Online reports delivery\n• Expert consultation on test results\n• Package deals for health checkups\n• Fast turnaround times\n• Certified laboratories',
      features: [
        'Blood tests & diagnostics',
        'Home sample collection',
        'Online reports',
        'Expert consultation',
        'Package deals'
      ]
    },
    { 
      icon: Ambulance, 
      title: 'Emergency Assistance', 
      description: 'Locate the nearest emergency care instantly with real-time status', 
      color: '#FF6B9D', 
      target: 'patient-dashboard' as Page, 
      requireAuth: false,
      serviceType: 'emergency',
      detailedDescription: 'Get instant access to emergency medical care when you need it most. Our emergency assistance provides:\n\n• Real-time location of nearest emergency facilities\n• Ambulance booking and tracking\n• 24/7 emergency helpline support\n• Hospital bed availability status\n• Quick access to emergency contacts\n• GPS-enabled ambulance dispatch\n• Pre-hospital care guidance',
      features: [
        '24/7 emergency support',
        'Ambulance booking',
        'Nearest facility locator',
        'Real-time tracking',
        'Hospital bed status'
      ]
    },
    { 
      icon: Video, 
      title: 'Teleconsultation', 
      description: 'Speak with doctors via video or chat for quick medical help without visiting hospitals', 
      color: '#3F53D9', 
      target: 'appointment' as Page, 
      requireAuth: false,
      serviceType: 'teleconsultation',
      detailedDescription: 'Consult with qualified doctors from the comfort of your home through video or chat. Features include:\n\n• Video consultations with HD quality\n• Text chat with doctors\n• Prescription delivery via email\n• Follow-up appointment scheduling\n• Medical record sharing\n• Multi-language support\n• Secure and private consultations',
      features: [
        'Video consultations',
        'Text chat support',
        'Digital prescriptions',
        'Follow-up scheduling',
        'Secure & private'
      ]
    },
    { 
      icon: Shield, 
      title: 'Insurance Support', 
      description: 'Find hospitals that accept your insurance and get cashless treatment support', 
      color: '#7C74EB', 
      target: 'patient-dashboard' as Page, 
      requireAuth: false,
      serviceType: 'insurance',
      detailedDescription: 'Navigate insurance claims and find cashless treatment options easily. Our insurance support offers:\n\n• Find hospitals accepting your insurance\n• Cashless treatment facilitation\n• Insurance claim assistance\n• Pre-authorization support\n• Network hospital directory\n• Claim status tracking\n• Insurance verification',
      features: [
        'Cashless treatment',
        'Claim assistance',
        'Network hospitals',
        'Pre-authorization',
        'Status tracking'
      ]
    },
    { 
      icon: Heart, 
      title: 'Health Packages', 
      description: 'Annual health check-ups, preventive care packages, and wellness programs', 
      color: '#34D1BF', 
      target: 'patient-dashboard' as Page, 
      requireAuth: false,
      serviceType: 'health-packages',
      detailedDescription: 'Comprehensive health packages designed for preventive care and wellness. Our packages include:\n\n• Annual health checkup packages\n• Preventive care screenings\n• Wellness and fitness programs\n• Family health packages\n• Corporate health programs\n• Customizable packages\n• Health report analysis',
      features: [
        'Annual checkups',
        'Preventive care',
        'Wellness programs',
        'Family packages',
        'Customizable plans'
      ]
    }
  ];

  const handleNavClick = (page: Page, requireAuth?: boolean, specialty?: string, serviceType?: string) => {
    // Store specialty in sessionStorage if provided for filtering
    if (specialty) {
      sessionStorage.setItem('selectedSpecialty', specialty);
    }
    // Store service type for navigation
    if (serviceType) {
      sessionStorage.setItem('selectedService', serviceType);
    }
    onNavigate(page, { requireAuth });
  };

  const handleServiceClick = (service: ServiceType) => {
    // Show service details modal
    setSelectedService(service);
  };

  const handleCloseModal = () => {
    setSelectedService(null);
  };

  const handleProceedToService = (service: ServiceType) => {
    // Store service type in sessionStorage for navigation
    if (service.serviceType) {
      sessionStorage.setItem('selectedService', service.serviceType);
    }
    
    // Close modal first
    setSelectedService(null);
    
    // Always prompt for login/account creation
    setTimeout(() => {
      const userChoice = confirm(
        `To access ${service.title}, please login or create an account.\n\n` +
        `Click OK to go to Login page, or Cancel to continue browsing.`
      );
      
      if (userChoice) {
        // Navigate to login page
        handleNavClick('login');
      }
    }, 300);
  };

  const handleLocationClick = (locationName: string) => {
    // Store location in sessionStorage for filtering
    sessionStorage.setItem('selectedLocation', locationName);
    handleNavClick('appointment', true);
  };

  const handleFooterLinkClick = (link: string) => {
    switch (link) {
      case 'about':
        // Scroll to about section or navigate
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'services':
        handleNavClick('appointment', true);
        break;
      case 'doctors':
        handleNavClick('appointment', true);
        break;
      case 'careers':
        // Could navigate to a careers page or show info
        alert('Career opportunities coming soon!');
        break;
      case 'appointments':
        handleNavClick('appointment', true);
        break;
      case 'records':
        handleNavClick('patient-dashboard', true);
        break;
      case 'pharmacy':
        handleNavClick('patient-dashboard', true);
        break;
      case 'lab-tests':
        handleNavClick('patient-dashboard', true);
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3FA] particle-bg relative overflow-hidden">
      {/* Animated Background Particles */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-2 h-2 bg-[#3F53D9]/30 rounded-full animate-float-3d" style={{ animationDelay: '0s' }}></div>
        <div className="absolute top-40 right-20 w-3 h-3 bg-[#7C74EB]/30 rounded-full animate-float-3d" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-40 left-1/4 w-2 h-2 bg-[#34D1BF]/30 rounded-full animate-float-3d" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 right-1/3 w-3 h-3 bg-[#3F53D9]/20 rounded-full animate-float-3d" style={{ animationDelay: '3s' }}></div>
      </div>

      {/* Navigation */}
      <nav className="glass-strong sticky top-0 z-50 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => onNavigate('landing')} className="cursor-pointer transform hover:scale-105 transition-transform duration-300">
              <Logo variant="primary" size="md" />
            </button>
            <div className="flex items-center gap-6">
              <button 
                className="text-[#333333] hover:text-[#3F53D9] transition-all duration-300 hover:scale-110" 
                onClick={() => {
                  const servicesSection = document.getElementById('services-section');
                  if (servicesSection) {
                    servicesSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                Services
              </button>
              <button 
                className="text-[#333333] hover:text-[#3F53D9] transition-all duration-300 hover:scale-110" 
                onClick={() => {
                  const aboutSection = document.getElementById('about-section');
                  if (aboutSection) {
                    aboutSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                About Us
              </button>
              <button 
                className="text-[#333333] hover:text-[#3F53D9] transition-all duration-300 hover:scale-110" 
                onClick={() => {
                  const contactSection = document.getElementById('contact-section');
                  if (contactSection) {
                    contactSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                Contact
              </button>
              <MedicalButton
                variant="primary"
                size="sm"
                onClick={() => onNavigate('login')}
                className="animate-glow"
              >
                Login
              </MedicalButton>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative max-w-[1500px] mx-auto px-4 sm:px-8 py-16 overflow-hidden rounded-[40px] bg-[#F5F3FA] perspective-1000 mt-6">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src="/hero-bg.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#0f172a]/70 via-[#0f172a]/40 to-transparent backdrop-blur-[1px] pointer-events-none"
          aria-hidden="true"
        />
        <div className="absolute inset-0 holographic opacity-30 pointer-events-none" aria-hidden="true"></div>
        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10">
          {/* Left content */}
          <div
            className="space-y-6 animate-fade-in-up"
            style={{ transform: `translateY(-${heroParallax}px) translateZ(0)` }}
          >
            <div className="inline-block perspective-1000">
              <span className="glass bg-gradient-to-r from-[#E8EAFF]/90 to-[#F0EDFF]/90 text-[#3F53D9] px-4 py-2 rounded-full text-sm font-medium shadow-lg hover:scale-105 transition-transform duration-300 inline-block">
                Healthcare Made Simple
              </span>
            </div>
            <h1 className="text-5xl text-white drop-shadow-md neon-glow animate-float-3d">Let's Find a Doctor</h1>
            <p className="text-xl text-white/90 drop-shadow">
              Book appointments, view records, and connect with doctors easily.
              Your complete healthcare platform in one place.
            </p>

            {/* Top Specialities */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-[#7C74EB]" />
                <span className="text-white/90">Multiple locations across the city</span>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <span className="text-white/90 text-sm">Login to book appointments and access all features</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {specialities.map((speciality) => {
                  const IconComponent = speciality.icon;
                  return (
                    <div
                      key={speciality.name}
                      onClick={() => {
                        // Store specialty for after login
                        sessionStorage.setItem('selectedSpecialty', speciality.name);
                        sessionStorage.setItem('redirectAfterLogin', 'patient-dashboard');
                        // Navigate to login
                        handleNavClick('login');
                      }}
                      className="glass bg-white/80 rounded-xl p-4 border-2 border-white/40 hover:border-[#7C74EB]/60 transition-all cursor-pointer group backdrop-blur-lg card-3d hover:shadow-xl hover:shadow-[#7C74EB]/20 active:scale-95"
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      <div className="flex items-start gap-3" style={{ transform: 'translateZ(10px)' }}>
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12"
                          style={{ backgroundColor: `${speciality.color}20`, boxShadow: `0 4px 15px ${speciality.color}30` }}
                        >
                          <IconComponent
                            className="w-5 h-5 transition-transform duration-300 group-hover:scale-125"
                            style={{ color: speciality.color }}
                          />
                        </div>
                        <div>
                          <div className="font-medium text-white mb-1 group-hover:text-[#7C74EB] transition-colors">{speciality.name}</div>
                          <div className="text-sm text-white/80">{speciality.description}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <MedicalButton
                variant="primary"
                size="lg"
                onClick={() => handleNavClick('login')}
              >
                Login to Book Appointment
              </MedicalButton>
              <MedicalButton
                variant="outlined"
                size="lg"
                onClick={() => {
                  // Store flag to show doctors after login
                  sessionStorage.setItem('redirectAfterLogin', 'patient-dashboard');
                  sessionStorage.setItem('showDoctorsAfterLogin', 'true');
                  // Navigate to login
                  handleNavClick('login');
                }}
              >
                Find Doctors
              </MedicalButton>
            </div>
          </div>

          {/* Right illustration */}
          <div className="flex justify-center perspective-1000">
            <div
              className="animate-float-3d"
              style={{ transform: `translateY(${heroImageParallax}px) translateZ(0)` }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#3F53D9]/20 to-[#7C74EB]/20 rounded-3xl blur-3xl -z-10 animate-glow"></div>
                <ImageWithFallback
                  src={doctorTeamImage}
                  alt="Doctor Team"
                  className="w-full max-w-lg rounded-3xl shadow-2xl border-2 border-white/20 glass"
                  style={{ transform: 'translateZ(30px)' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services-section" className="max-w-[1500px] mx-auto px-4 sm:px-6 py-16 relative z-10">
        <div className="text-center mb-12 perspective-1000">
          <h2 className="mb-4 animate-fade-in-up neon-glow">Our Services</h2>
          <p className="text-lg text-[#6E6E6E] animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Comprehensive healthcare services at your fingertips
          </p>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 will-change-transform perspective-1000"
          style={{ transform: `translateY(${servicesDrift}px) translateZ(0)` }}
        >
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <MedicalCard
                key={index}
                variant="outlined"
                className="text-center service-card group cursor-pointer hover:shadow-xl transition-all duration-300 active:scale-95"
                onClick={() => handleServiceClick(service)}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="flex flex-col items-center gap-4">
                  <div 
                    className="w-20 h-20 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:rotate-3"
                    style={{ 
                      backgroundColor: `${service.color}15`,
                      boxShadow: `0 4px 15px ${service.color}30`
                    }}
                  >
                    <IconComponent 
                      className="w-10 h-10 transition-colors" 
                      style={{ color: service.color }}
                    />
                  </div>
                  <h3 className="text-[#333333] font-semibold group-hover:text-[#3F53D9] transition-colors">{service.title}</h3>
                  <p className="text-[#6E6E6E] text-sm">{service.description}</p>
                </div>
              </MedicalCard>
            );
          })}
        </div>
      </section>

      {/* About Us Section */}
      <section id="about-section" className="max-w-[1500px] mx-auto px-4 sm:px-6 py-16 relative z-10">
        <div className="text-center mb-12 perspective-1000">
          <h2 className="mb-4 animate-fade-in-up neon-glow">About Us</h2>
          <p className="text-lg text-[#6E6E6E] animate-fade-in-up max-w-4xl mx-auto" style={{ animationDelay: '0.2s' }}>
            MediConnect is a comprehensive digital healthcare platform designed to make quality medical care accessible, convenient, and affordable for everyone. We bridge the gap between patients and healthcare providers through innovative technology and seamless service delivery.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <MedicalCard
            variant="outlined"
            className="p-6 hover:shadow-xl transition-all duration-300"
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-[#E8EAFF] flex items-center justify-center">
                <Stethoscope className="w-8 h-8 text-[#3F53D9]" />
              </div>
              <h3 className="font-semibold text-[#333333] text-lg">Our Mission</h3>
              <p className="text-sm text-[#6E6E6E]">
                To revolutionize healthcare delivery by providing easy access to quality medical services, expert doctors, and essential medicines through a single, user-friendly platform.
              </p>
            </div>
          </MedicalCard>

          <MedicalCard
            variant="outlined"
            className="p-6 hover:shadow-xl transition-all duration-300"
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-[#E8EAFF] flex items-center justify-center">
                <Heart className="w-8 h-8 text-[#3F53D9]" />
              </div>
              <h3 className="font-semibold text-[#333333] text-lg">What We Offer</h3>
              <p className="text-sm text-[#6E6E6E]">
                From online pharmacy and lab test bookings to teleconsultations and emergency assistance, we provide end-to-end healthcare solutions that fit your lifestyle and needs.
              </p>
            </div>
          </MedicalCard>

          <MedicalCard
            variant="outlined"
            className="p-6 hover:shadow-xl transition-all duration-300"
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-[#E8EAFF] flex items-center justify-center">
                <Shield className="w-8 h-8 text-[#3F53D9]" />
              </div>
              <h3 className="font-semibold text-[#333333] text-lg">Why Choose Us</h3>
              <p className="text-sm text-[#6E6E6E]">
                We prioritize your health and privacy with secure medical records, verified healthcare providers, and reliable service delivery backed by cutting-edge technology.
              </p>
            </div>
          </MedicalCard>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="gradient-animated py-16 relative overflow-hidden">
        <div className="absolute inset-0 holographic opacity-20"></div>
        <div
          className="max-w-[1500px] mx-auto px-4 sm:px-6 will-change-transform relative z-10"
          style={{ transform: `translateY(${statsTilt}px) translateZ(0)` }}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center text-white perspective-1000">
            {[
              { number: '500+', label: 'Expert Doctors' },
              { number: '40+', label: 'Specialties' },
              { number: '4', label: 'Locations' },
              { number: '50K+', label: 'Happy Patients' }
            ].map((stat, index) => (
              <div
                key={index}
                className="glass bg-white/10 rounded-2xl p-6 card-3d hover:bg-white/15 transition-all duration-300"
                style={{
                  animationDelay: `${index * 0.1}s`,
                  transform: 'translateZ(0)'
                }}
              >
                <div className="text-4xl font-bold mb-2 neon-glow animate-float-3d" style={{ animationDelay: `${index * 0.2}s` }}>
                  {stat.number}
                </div>
                <div className="text-lg opacity-90">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#333333] text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <Logo variant="horizontal" size="sm" className="mb-4 [&_span]:!text-white [&_path]:!stroke-white [&_circle]:!fill-white" />
              <p className="text-sm opacity-80">
                Your trusted healthcare partner for comprehensive medical services.
              </p>
            </div>
            <div>
              <h4 className="mb-4">Quick Links</h4>
              <div className="space-y-2 text-sm opacity-80">
                <div 
                  className="hover:opacity-100 cursor-pointer transition-opacity"
                  onClick={() => handleFooterLinkClick('about')}
                >
                  About Us
                </div>
                <div 
                  className="hover:opacity-100 cursor-pointer transition-opacity"
                  onClick={() => handleFooterLinkClick('services')}
                >
                  Services
                </div>
                <div 
                  className="hover:opacity-100 cursor-pointer transition-opacity"
                  onClick={() => handleFooterLinkClick('doctors')}
                >
                  Doctors
                </div>
                <div 
                  className="hover:opacity-100 cursor-pointer transition-opacity"
                  onClick={() => handleFooterLinkClick('careers')}
                >
                  Careers
                </div>
              </div>
            </div>
            <div>
              <h4 className="mb-4">Services</h4>
              <div className="space-y-2 text-sm opacity-80">
                <div 
                  className="hover:opacity-100 cursor-pointer transition-opacity"
                  onClick={() => handleFooterLinkClick('appointments')}
                >
                  Appointments
                </div>
                <div 
                  className="hover:opacity-100 cursor-pointer transition-opacity"
                  onClick={() => handleFooterLinkClick('records')}
                >
                  Health Records
                </div>
                <div 
                  className="hover:opacity-100 cursor-pointer transition-opacity"
                  onClick={() => handleFooterLinkClick('pharmacy')}
                >
                  Pharmacy
                </div>
                <div 
                  className="hover:opacity-100 cursor-pointer transition-opacity"
                  onClick={() => handleFooterLinkClick('lab-tests')}
                >
                  Lab Tests
                </div>
              </div>
            </div>
            <div id="contact-section">
              <h4 className="mb-4">Contact</h4>
              <div className="space-y-2 text-sm opacity-80">
                <div>📞 +91 40 1234 5678</div>
                <div>✉️ info@mediconnect.com</div>
                <div>🕒 24/7 Emergency</div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-600 mt-8 pt-8 text-center text-sm opacity-80">
            © 2024 Medi-Connect. All rights reserved. | Privacy Policy | Terms of Service
          </div>
        </div>
      </footer>

      {/* Service Details Modal */}
      {selectedService && (() => {
        const IconComponent = selectedService.icon;
        return (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={handleCloseModal}
          >
            <MedicalCard
              variant="filled"
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-strong shadow-2xl animate-fade-in-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4 flex-1">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: `${selectedService.color}15`,
                      boxShadow: `0 4px 15px ${selectedService.color}30`
                    }}
                  >
                    <IconComponent
                      className="w-8 h-8"
                      style={{ color: selectedService.color }}
                    />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-black mb-1">{selectedService.title}</h2>
                    <p className="text-black/70">{selectedService.description}</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-black/60 hover:text-black transition-colors p-2 hover:bg-[#E8EAFF] rounded-lg flex-shrink-0 ml-4"
                  aria-label="Close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

            <div className="space-y-6">
              {/* Detailed Description */}
              <div>
                <h3 className="text-lg font-semibold text-black mb-3">About This Service</h3>
                <div className="text-black/80 whitespace-pre-line leading-relaxed">
                  {selectedService.detailedDescription}
                </div>
              </div>

              {/* Key Features */}
              {selectedService.features && (
                <div>
                  <h3 className="text-lg font-semibold text-black mb-3">Key Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedService.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-3 rounded-lg bg-[#F5F3FA] hover:bg-[#E8EAFF] transition-colors"
                      >
                        <CheckCircle2
                          className="w-5 h-5 flex-shrink-0"
                          style={{ color: selectedService.color }}
                        />
                        <span className="text-black text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-[#E8EAFF]">
                <MedicalButton
                  variant="primary"
                  size="md"
                  onClick={() => handleProceedToService(selectedService)}
                  className="flex-1"
                >
                  Get Started
                </MedicalButton>
                <MedicalButton
                  variant="outlined"
                  size="md"
                  onClick={handleCloseModal}
                >
                  Close
                </MedicalButton>
              </div>
            </div>
          </MedicalCard>
        </div>
        );
      })()}
    </div>
  );
}

export default LandingPage;