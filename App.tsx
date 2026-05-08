import React, { useState } from "react";
import { LandingPage } from "./components/pages/LandingPage";
import { LoginPage } from "./components/pages/LoginPage";
import { PatientDashboard } from "./components/pages/PatientDashboard";
import { DoctorDashboard } from "./components/pages/DoctorDashboard";
import { AppointmentBooking } from "./components/pages/AppointmentBook";
import { BrowseDoctors } from "./components/pages/BrowseDoctors";

import { AdminDashboard } from "./components/pages/AdminDashboard";
import type {
  NavigateFn,
  Page,
  UserRole,
  UserInfo,
} from "./types/navigation";

const defaultRoleDestination: Record<UserRole, Page> = {
  patient: "patient-dashboard",
  doctor: "doctor-dashboard",
  admin: "admin-dashboard",
};

export default function App() {
  const [currentPage, setCurrentPage] =
    useState<Page>("landing");
  const [isAuthenticated, setIsAuthenticated] =
    useState(false);
  const [pendingPage, setPendingPage] =
    useState<Page | null>(null);
  const [userRole, setUserRole] =
    useState<UserRole | null>(null);
  const [userInfo, setUserInfo] =
    useState<UserInfo | null>(() => {
      // Safely access localStorage
      if (typeof window !== 'undefined') {
        try {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const user = JSON.parse(storedUser);
            return {
              userId: user.userId || user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              mobile: user.mobile,
              gender: user.gender,
            };
          }
        } catch (e) {
          console.error('Failed to parse user data from localStorage', e);
        }
      }
      return null;
    });

  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: "smooth" });

  const navigateToPage = (page: Page) => {
    setCurrentPage(page);
    scrollToTop();
  };

  const handleNavigate: NavigateFn = (
    page,
    options
  ) => {
    if (
      options?.requireAuth &&
      !isAuthenticated
    ) {
      setPendingPage(page);
      navigateToPage("login");
      return;
    }
    navigateToPage(page);
  };

  const handleAuthSuccess = (role: UserRole, userData?: UserInfo) => {
    setIsAuthenticated(true);
    setUserRole(role);

    // Get user info from localStorage if not provided
    if (!userData && typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          userData = {
            userId: user.userId || user.id,
            name: user.name || '',
            email: user.email || '',
            role: user.role || role, // Fallback to the provided role
            mobile: user.mobile,
            gender: user.gender,
          };
        }
      } catch (e) {
        console.error('Failed to parse user data during auth success', e);
      }
    }

    if (userData) {
      setUserInfo(userData);
    }

    // Check if there's a redirect destination stored (from specialty selection or Find Doctors)
    let destination: Page;
    if (typeof window !== 'undefined') {
      const redirectAfterLogin = sessionStorage.getItem('redirectAfterLogin');
      if (redirectAfterLogin && role === 'patient') {
        // Clear the redirect flag
        sessionStorage.removeItem('redirectAfterLogin');
        // Use the stored destination (should be patient-dashboard)
        destination = redirectAfterLogin as Page;
      } else {
        // Use pending page or default destination
        destination = pendingPage ?? defaultRoleDestination[role];
      }
    } else {
      destination = pendingPage ?? defaultRoleDestination[role];
    }

    setPendingPage(null);
    navigateToPage(destination);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setUserInfo(null);
    setPendingPage(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    navigateToPage("landing");
  };

  return (
    <div className="min-h-screen">
      {currentPage === "landing" && (
        <LandingPage onNavigate={handleNavigate} />
      )}
      {currentPage === "login" && (
        <LoginPage
          onNavigate={handleNavigate}
          onAuthSuccess={handleAuthSuccess}
        />
      )}
      {currentPage === "patient-dashboard" && (
        <PatientDashboard
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          userRole={userRole}
          userInfo={userInfo}
        />
      )}
      {currentPage === "doctor-dashboard" && (
        <DoctorDashboard
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          userRole={userRole}
          userInfo={userInfo}
        />
      )}
      {currentPage === "admin-dashboard" && (
        <AdminDashboard
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          userRole={userRole}
          userInfo={userInfo}
        />
      )}
      {currentPage === "appointment" && (
        <AppointmentBooking
          onNavigate={handleNavigate}
        />
      )}
      {currentPage === "browse-doctors" && (
        <BrowseDoctors
          onNavigate={handleNavigate}
        />
      )}
    
    </div>
  );
}