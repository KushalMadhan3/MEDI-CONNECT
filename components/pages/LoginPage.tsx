import React, { useMemo, useState } from 'react';
import { Logo } from '../branding/Logo';
import { MedicalButton } from '../ui-kit/MedicalButton';
import { MedicalCard } from '../ui-kit/MedicalCard';
import { DoctorIcon } from '../illustrations/MedicalIcons';
import {
  Mail,
  Lock,
  UserRound,
  Stethoscope,
  ShieldCheck,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  X
} from 'lucide-react';
import type { NavigateFn, UserRole, UserInfo } from '../../types/navigation';
import { authAPI } from '../../utils/api';

interface LoginPageProps {
  onNavigate: NavigateFn;
  onAuthSuccess: (role: UserRole, userData?: UserInfo) => void;
}

export function LoginPage({ onNavigate, onAuthSuccess }: LoginPageProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');
  const [isNewUser, setIsNewUser] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    gender: '',
    email: '',
    password: '',
    confirmPassword: '',
    rememberMe: false
  });
  const [errors, setErrors] = useState({
    name: '',
    mobile: '',
    gender: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null);
  const [showOAuthModal, setShowOAuthModal] = useState<{ provider: 'google' | 'microsoft'; email: string } | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordRole, setForgotPasswordRole] = useState<UserRole>('patient');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const roles = useMemo(
    () => [
      { id: 'patient' as const, label: 'Patient', icon: UserRound, description: 'Personal health hub' },
      { id: 'doctor' as const, label: 'Doctor', icon: Stethoscope, description: 'Clinical workspace' },
      { id: 'admin' as const, label: 'Admin', icon: ShieldCheck, description: 'System controls' }
    ],
    []
  );

  type FormField = keyof typeof formData;

  const handleInputChange =
    (field: FormField) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value =
          field === 'rememberMe'
            ? (event.target as HTMLInputElement).checked
            : event.target.value;
        setFormData((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: '' }));
      };

  const validateForm = () => {
    const nextErrors: typeof errors = {
      name: '',
      mobile: '',
      gender: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: ''
    };

    if (!formData.email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      nextErrors.email = 'Enter a valid email address';
    }

    if (!formData.password.trim()) {
      nextErrors.password = 'Password is required';
    }

    if (!selectedRole) {
      nextErrors.role = 'Please choose a role';
    }

    if (isNewUser) {
      if (!formData.name.trim()) {
        nextErrors.name = 'Full name is required';
      }

      if (!formData.mobile.trim()) {
        nextErrors.mobile = 'Mobile number is required';
      } else if (!/^\d{10}$/.test(formData.mobile.trim())) {
        nextErrors.mobile = 'Enter a valid 10-digit number';
      }

      if (!formData.gender) {
        nextErrors.gender = 'Please select a gender';
      }

      if (!formData.confirmPassword.trim()) {
        nextErrors.confirmPassword = 'Confirm your password';
      } else if (formData.confirmPassword !== formData.password) {
        nextErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setGlobalMessage(null);

    try {
      if (isNewUser) {
        // Signup flow
        const response = await authAPI.signup({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: selectedRole,
          mobile: formData.mobile || undefined,
          gender: formData.gender || undefined,
        });

        if (response.success) {
          if (response.data.status === 'pending_approval') {
            setGlobalMessage({
              type: 'success',
              text: 'Account created! Your doctor account is awaiting admin approval. You will receive an email once approved.',
            });
            // Reset form
            setFormData({
              name: '',
              mobile: '',
              gender: '',
              email: '',
              password: '',
              confirmPassword: '',
              rememberMe: false,
            });
            setIsNewUser(false);
          } else if (response.data.token) {
            // Account created and active, proceed to dashboard
            onAuthSuccess(selectedRole, {
              userId: response.data.userId,
              name: response.data.name,
              email: response.data.email,
              role: selectedRole,
            });
          } else {
            setGlobalMessage({
              type: 'success',
              text: response.message || 'Account created successfully!',
            });
            setIsNewUser(false);
          }
        }
      } else {
        // Login flow
        const response = await authAPI.login({
          email: formData.email,
          password: formData.password,
          role: selectedRole,
        });

        if (response.success && response.data.token) {
          // Login successful, proceed to dashboard with user data
          onAuthSuccess(selectedRole, {
            userId: response.data.userId,
            name: response.data.name,
            email: response.data.email,
            role: selectedRole,
          });
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);

      // Handle specific error codes
      if (error.response?.data?.code === 'DOCTOR_PENDING_APPROVAL') {
        setGlobalMessage({
          type: 'error',
          text: 'Your doctor account is awaiting admin approval. You will receive an email once approved.',
        });
      } else if (error.response?.data?.code === 'DOCTOR_REJECTED') {
        setGlobalMessage({
          type: 'error',
          text: 'Your doctor account was not approved. Please contact support.',
        });
      } else {
        setGlobalMessage({
          type: 'error',
          text: error.response?.data?.message || error.message || 'An error occurred. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'microsoft') => {
    setIsOAuthLoading(provider);
    setGlobalMessage(null);
    
    // Open modal to enter email (simulating OAuth flow)
    setShowOAuthModal({ provider, email: '' });
    setIsOAuthLoading(null);
  };

  const handleOAuthSubmit = async () => {
    if (!showOAuthModal) return;

    const { provider, email } = showOAuthModal;
    const providerName = provider === 'google' ? 'Google' : 'Microsoft';

    if (!email || !email.includes('@')) {
      setGlobalMessage({
        type: 'error',
        text: 'Please enter a valid email address.'
      });
      return;
    }

    try {
      setIsOAuthLoading(provider);
      setGlobalMessage(null);

      // Extract name from email
      const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      // Try to create account with OAuth email
      try {
        const response = await authAPI.signup({
          name,
          email,
          password: `oauth_${provider}_${Date.now()}`, // Unique password for OAuth users
          role: selectedRole,
          mobile: '',
          gender: ''
        });

        if (response.success && response.data) {
          if (response.data.status === 'pending_approval') {
            setGlobalMessage({
              type: 'success',
              text: `Account created with ${providerName}! Your doctor account is awaiting admin approval.`
            });
            setShowOAuthModal(null);
            setIsOAuthLoading(null);
            return;
          }

          // Successfully created and logged in
          onAuthSuccess(selectedRole, {
            userId: response.data.userId || response.data.id,
            name: response.data.name || name,
            email,
            role: selectedRole,
          });
          setShowOAuthModal(null);
        }
      } catch (error: any) {
        if (error.response?.status === 409 || error.response?.data?.message?.includes('already exists')) {
          setGlobalMessage({
            type: 'error',
            text: `An account with this ${providerName} email already exists. Please use email/password login.`
          });
        } else {
          setGlobalMessage({
            type: 'error',
            text: error.response?.data?.message || 'Failed to create account. Please try again.'
          });
        }
      }
    } catch (error: any) {
      setGlobalMessage({
        type: 'error',
        text: error.message || `Failed to sign in with ${providerName}. Please try again.`
      });
    } finally {
      setIsOAuthLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f1f4ff,#f7f5ff)] particle-bg flex items-start justify-center px-3 py-3 sm:px-8 sm:py-4 lg:py-6 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#3F53D9]/10 rounded-full blur-3xl animate-float-3d"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#7C74EB]/10 rounded-full blur-3xl animate-float-3d" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-[#34D1BF]/10 rounded-full blur-3xl animate-float-3d" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="w-full max-w-6xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10">
          {/* Left side - Branding */}
          <div className="flex flex-col justify-start space-y-8 animate-fade-in-up perspective-1000">
            <button
              onClick={() => onNavigate('landing')}
              className="w-fit focus:outline-none focus-visible:ring-2 focus-visible:ring-[#bfc6ff] rounded-lg"
            >
              <Logo variant="horizontal" size="lg" />
            </button>

            <div className="space-y-4">
              <h2>Welcome Back!</h2>
              <p className="text-lg text-[#6E6E6E]">
                Access your healthcare dashboard and manage your medical needs with ease.
              </p>
            </div>

            <div className="hidden lg:flex justify-center perspective-1000">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#3F53D9]/20 to-[#7C74EB]/20 rounded-full blur-3xl -z-10 animate-glow"></div>
                <div className="relative z-10 animate-float-3d" style={{ filter: 'drop-shadow(0 10px 30px rgba(63, 83, 217, 0.3))' }}>
                  <DoctorIcon className="w-64 h-64" />
                </div>
              </div>
            </div>

            <div className="space-y-4 glass-strong rounded-2xl p-6 shadow-[0_15px_45px_rgba(63,83,217,0.15)] card-3d">
              {[
                { label: 'Secure & Private', description: 'End-to-end encryption & MFA' },
                { label: '24/7 Access', description: 'Any device, any timezone' },
                { label: 'HIPAA Compliant', description: 'Audited & monitored' }
              ].map((badge) => (
                <div key={badge.label} className="flex items-start gap-3 text-[#333333]">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E8EAFF] to-[#F4F0FF] flex items-center justify-center text-[#3F53D9] shadow-inner">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{badge.label}</p>
                    <p className="text-sm text-[#6E6E6E]">{badge.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Login form */}
          <MedicalCard
            variant="filled"
            hover={false}
            className="animate-fade-in-up glass-strong shadow-[0_28px_80px_rgba(63,83,217,0.25)] rounded-[28px] px-8 py-10 relative overflow-hidden"
          >
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 holographic opacity-10 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="space-y-8">
                <div className="text-center space-y-2">
                  <h3 className="text-3xl font-semibold text-[#1F1F2C]">
                    {isNewUser ? 'Create Account' : 'Sign In'}
                  </h3>
                  <p className="text-[#6E6E6E]">
                    {isNewUser
                      ? 'Tell us a few details to set up your account'
                      : 'Enter your credentials to continue'}
                  </p>
                  <div className="mt-3 flex justify-center gap-2 text-sm">
                    <span className="text-[#6E6E6E]">
                      {isNewUser ? 'Already have an account?' : 'New to Medi-Connect?'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsNewUser((prev) => !prev)}
                      className="text-[#3F53D9] font-medium hover:underline"
                    >
                      {isNewUser ? 'Sign in' : 'Create account'}
                    </button>
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-[#333333]">
                      Select Your Role
                    </label>
                    {errors.role && <span className="text-xs text-[#E53935]">{errors.role}</span>}
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-2 role-scroll sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pb-0">
                    {roles.map((role, index) => {
                      const IconComponent = role.icon;
                      const isActive = selectedRole === role.id;
                      const isLast = index === roles.length - 1;
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => {
                            setSelectedRole(role.id);
                            setErrors((prev) => ({ ...prev, role: '' }));
                          }}
                          aria-pressed={isActive}
                          className={`min-w-[170px] sm:min-w-0 flex-1 rounded-2xl border transition-all duration-300 px-5 py-4 text-left shadow-sm card-3d
                          ${isActive
                              ? 'glass bg-gradient-to-br from-[#E8EAFF]/90 to-[#F0EDFF]/90 border-[#3F53D9] ring-2 ring-[#bfc6ff] shadow-lg scale-105'
                              : 'bg-white/80 backdrop-blur-sm border-[#EAECFF] hover:border-[#C3C9FF] hover:shadow-md'
                            } ${isLast ? 'sm:col-span-2 sm:w-2/3 sm:mx-auto' : ''}`}
                          style={{ transformStyle: 'preserve-3d' }}
                        >
                          <div className="flex items-center gap-4" style={{ transform: 'translateZ(10px)' }}>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-all duration-300 ${isActive ? 'bg-white text-[#3F53D9] scale-110 rotate-12 shadow-lg' : 'bg-[#F5F6FF] text-[#6E6E6E] group-hover:scale-105'}`}>
                              <IconComponent className="w-6 h-6 transition-transform duration-300" />
                            </div>
                            <div>
                              <p className={`font-semibold ${isActive ? 'text-[#1F1F2C]' : 'text-[#333333]'}`}>
                                {role.label}
                              </p>
                              <p className="text-sm text-[#6E6E6E]">{role.description}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Global Message */}
                {globalMessage && (
                  <div
                    className={`rounded-2xl p-4 ${globalMessage.type === 'success'
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
                      }`}
                  >
                    <p className="text-sm">{globalMessage.text}</p>
                  </div>
                )}

                {/* Login / Sign Up Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {isNewUser && (
                    <>
                      {/* Full Name */}
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[#333333]">Full Name</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={handleInputChange('name')}
                          placeholder="John Doe"
                          className={`w-full rounded-2xl border-2 bg-white px-4 py-3 text-black placeholder:text-[#8A8A8A] focus:border-[#3F53D9] focus:outline-none focus:ring-2 focus:ring-[#dfe5ff] ${errors.name ? 'border-[#E53935]' : 'border-[#E5E5E5]'
                            }`}
                        />
                        {errors.name && <span className="text-sm text-[#E53935]">{errors.name}</span>}
                      </div>

                      {/* Mobile */}
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[#333333]">Mobile Number</label>
                        <input
                          type="tel"
                          value={formData.mobile}
                          onChange={handleInputChange('mobile')}
                          placeholder="9876543210"
                          className={`w-full rounded-2xl border-2 bg-white px-4 py-3 text-black placeholder:text-[#8A8A8A] focus:border-[#3F53D9] focus:outline-none focus:ring-2 focus:ring-[#dfe5ff] ${errors.mobile ? 'border-[#E53935]' : 'border-[#E5E5E5]'
                            }`}
                        />
                        {errors.mobile && <span className="text-sm text-[#E53935]">{errors.mobile}</span>}
                      </div>

                      {/* Gender */}
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-[#333333]">Gender</label>
                        <select
                          value={formData.gender}
                          onChange={handleInputChange('gender')}
                          className={`w-full rounded-2xl border-2 bg-white px-4 py-3 text-black focus:border-[#3F53D9] focus:outline-none focus:ring-2 focus:ring-[#dfe5ff] ${errors.gender ? 'border-[#E53935]' : 'border-[#E5E5E5]'
                            }`}
                        >
                          <option value="">Select</option>
                          <option value="female">Female</option>
                          <option value="male">Male</option>
                          <option value="other">Other</option>
                        </select>
                        {errors.gender && <span className="text-sm text-[#E53935]">{errors.gender}</span>}
                      </div>
                    </>
                  )}

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#333333]">Email Address</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6E6E6E]">
                        <Mail className="w-5 h-5" />
                      </div>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange('email')}
                        placeholder="you@example.com"
                        className={`w-full rounded-2xl border-2 glass bg-white px-4 py-3 pl-12 pr-4 text-black placeholder:text-[#8A8A8A] focus:border-[#3F53D9] focus:outline-none focus:ring-2 focus:ring-[#dfe5ff] focus:scale-[1.02] transition-all duration-300 ${errors.email ? 'border-[#E53935]' : 'border-[#E5E5E5]'}`}
                      />
                    </div>
                    {errors.email && <span className="text-sm text-[#E53935]">{errors.email}</span>}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#333333]">Password</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6E6E6E]">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleInputChange('password')}
                        placeholder="Enter your password"
                        className={`w-full rounded-2xl border-2 glass bg-white px-4 py-3 pl-12 pr-12 text-black placeholder:text-[#8A8A8A] focus:border-[#3F53D9] focus:outline-none focus:ring-2 focus:ring-[#dfe5ff] focus:scale-[1.02] transition-all duration-300 ${errors.password ? 'border-[#E53935]' : 'border-[#E5E5E5]'}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6E6E6E] hover:text-[#3F53D9]"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && <span className="text-sm text-[#E53935]">{errors.password}</span>}
                  </div>

                  {isNewUser && (
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-[#333333]">Confirm Password</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={handleInputChange('confirmPassword')}
                        placeholder="Re-enter your password"
                          className={`w-full rounded-2xl border-2 bg-white px-4 py-3 text-black placeholder:text-[#8A8A8A] focus:border-[#3F53D9] focus:outline-none focus:ring-2 focus:ring-[#dfe5ff] ${errors.confirmPassword ? 'border-[#E53935]' : 'border-[#E5E5E5]'
                          }`}
                      />
                      {errors.confirmPassword && (
                        <span className="text-sm text-[#E53935]">{errors.confirmPassword}</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm flex-wrap gap-3">
                    <label className="flex items-center gap-2 text-[#333333] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.rememberMe}
                        onChange={handleInputChange('rememberMe')}
                        className="rounded border-[#C3C9FF] text-[#3F53D9] focus:ring-[#3F53D9]"
                      />
                      Remember me
                    </label>
                    {!isNewUser && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowForgotPassword(true);
                          setForgotPasswordEmail(formData.email);
                          setForgotPasswordRole(selectedRole);
                        }}
                        className="text-[#3F53D9] hover:underline font-medium transition-colors"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>

                  <MedicalButton
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full flex items-center justify-center gap-2 rounded-2xl shadow-lg shadow-[#3F53D9]/30 disabled:opacity-70 animate-glow"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {isNewUser ? 'Creating account…' : 'Signing in…'}
                      </>
                    ) : (
                      isNewUser ? 'Create Account' : 'Sign In'
                    )}
                  </MedicalButton>

                  <p className="text-xs text-center text-[#6E6E6E]">
                    By signing in, you agree to our <button type="button" className="text-[#3F53D9] underline-offset-2 hover:underline">Terms</button> &{' '}
                    <button type="button" className="text-[#3F53D9] underline-offset-2 hover:underline">Privacy Policy</button>.
                  </p>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#E5E5E5]"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-[#6E6E6E]">Or continue with</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Google', accent: '#EA4335', provider: 'google' },
                    { label: 'Microsoft', accent: '#0078D4', provider: 'microsoft' }
                  ].map((provider) => (
                    <button
                      key={provider.label}
                      type="button"
                      onClick={() => handleOAuthLogin(provider.provider)}
                      disabled={isOAuthLoading !== null}
                      className="rounded-2xl border border-[#E5E5E5] bg-white py-3 font-semibold text-[#333333] shadow-sm hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C3C9FF] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                      <span className="flex flex-col items-center gap-1 text-sm">
                        {isOAuthLoading === provider.provider ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" style={{ color: provider.accent }} />
                            <span className="text-xs">Connecting...</span>
                          </>
                        ) : (
                          <>
                            <span className="text-base">{provider.label}</span>
                            <span
                              className="block h-1 w-10 rounded-full"
                              style={{ backgroundColor: provider.accent }}
                            ></span>
                          </>
                        )}
                      </span>
                    </button>
                  ))}
                </div>

                <p className="text-center text-sm text-[#6E6E6E]">
                  © 2025 Medi-Connect Healthcare System
                </p>
              </div>
            </div>
          </MedicalCard>
        </div>
      </div>

      {/* OAuth Email Modal */}
      {showOAuthModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowOAuthModal(null)}
        >
          <MedicalCard
            variant="filled"
            className="w-full max-w-md glass-strong shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-black">
                  Sign in with {showOAuthModal.provider === 'google' ? 'Google' : 'Microsoft'}
                </h3>
                <button
                  onClick={() => setShowOAuthModal(null)}
                  className="text-black/60 hover:text-black transition-colors p-2 hover:bg-[#E8EAFF] rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-black/70 text-sm">
                Enter your {showOAuthModal.provider === 'google' ? 'Google' : 'Microsoft'} email to continue.
              </p>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={showOAuthModal.email}
                  onChange={(e) => setShowOAuthModal({ ...showOAuthModal, email: e.target.value })}
                  placeholder={`your.email@${showOAuthModal.provider === 'google' ? 'gmail.com' : 'outlook.com'}`}
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#3F53D9] focus:border-transparent"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleOAuthSubmit();
                    }
                  }}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <MedicalButton
                  variant="primary"
                  size="md"
                  onClick={handleOAuthSubmit}
                  disabled={isOAuthLoading !== null || !showOAuthModal.email}
                  className="flex-1"
                >
                  {isOAuthLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Continue'
                  )}
                </MedicalButton>
                <MedicalButton
                  variant="outlined"
                  size="md"
                  onClick={() => setShowOAuthModal(null)}
                  disabled={isOAuthLoading !== null}
                >
                  Cancel
                </MedicalButton>
              </div>
            </div>
          </MedicalCard>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <MedicalCard
            variant="filled"
            className="w-full max-w-md glass-strong shadow-2xl animate-fade-in-up"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#333333]">Reset Password</h2>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetSent(false);
                    setForgotPasswordEmail('');
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!resetSent ? (
                <>
                  <p className="text-gray-600 mb-6">
                    Enter your email address and we'll send you instructions to reset your password.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-[#333333] mb-2 block">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full rounded-2xl border-2 bg-white px-4 py-3 text-black placeholder:text-[#8A8A8A] focus:border-[#3F53D9] focus:outline-none focus:ring-2 focus:ring-[#dfe5ff] border-[#E5E5E5]"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-[#333333] mb-2 block">
                        Account Type
                      </label>
                      <select
                        value={forgotPasswordRole}
                        onChange={(e) => setForgotPasswordRole(e.target.value as UserRole)}
                        className="w-full rounded-2xl border-2 bg-white px-4 py-3 text-black focus:border-[#3F53D9] focus:outline-none focus:ring-2 focus:ring-[#dfe5ff] border-[#E5E5E5]"
                      >
                        <option value="patient">Patient</option>
                        <option value="doctor">Doctor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <MedicalButton
                      variant="primary"
                      size="md"
                      onClick={async () => {
                        if (!forgotPasswordEmail) {
                          setGlobalMessage({ type: 'error', text: 'Please enter your email address' });
                          return;
                        }

                        setIsSendingReset(true);
                        setGlobalMessage(null);

                        try {
                          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
                          const res = await fetch(`${apiUrl}/api/auth/forgot-password`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              email: forgotPasswordEmail,
                              role: forgotPasswordRole
                            })
                          });

                          const data = await res.json();

                          if (data.success) {
                            setResetSent(true);
                            setGlobalMessage({ type: 'success', text: data.message });
                          } else {
                            setGlobalMessage({ type: 'error', text: data.message || 'Failed to send reset email' });
                          }
                        } catch (error: any) {
                          console.error('Forgot password error:', error);
                          setGlobalMessage({ 
                            type: 'error', 
                            text: 'Failed to send reset email. Please try again.' 
                          });
                        } finally {
                          setIsSendingReset(false);
                        }
                      }}
                      disabled={isSendingReset || !forgotPasswordEmail}
                      className="w-full"
                    >
                      {isSendingReset ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Reset Link'
                      )}
                    </MedicalButton>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Reset Link Sent!</h3>
                  <p className="text-gray-600 mb-6">
                    If an account with that email exists, we've sent password reset instructions to <strong>{forgotPasswordEmail}</strong>
                  </p>
                  <MedicalButton
                    variant="primary"
                    size="md"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetSent(false);
                      setForgotPasswordEmail('');
                    }}
                    className="w-full"
                  >
                    Back to Login
                  </MedicalButton>
                </div>
              )}

              {globalMessage && (
                <div className={`mt-4 p-3 rounded-lg ${
                  globalMessage.type === 'success' 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-red-50 text-red-700'
                }`}>
                  {globalMessage.text}
                </div>
              )}
            </div>
          </MedicalCard>
        </div>
      )}
    </div>
  );
}
