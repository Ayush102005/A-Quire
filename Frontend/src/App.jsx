import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Pages
import Home from './pages/Home';
import Features from './pages/Features';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from './pages/ResetPassword';
import StudentOnboarding from './pages/StudentOnboarding';
import NotFound from './pages/NotFound';

// Student pages
import StudentDashboard from './pages/StudentDashboard';
import DemoDashboard from './pages/DemoDashboard';
import CourseDetail from './pages/CourseDetail';
import LessonPlayer from './pages/LessonPlayer';
import LessonShell from './pages/LessonShell';
import MyCourses from './pages/MyCourses';
import SelfCheck from './pages/SelfCheck';
import ProgressAnalytics from './pages/ProgressAnalytics';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import AdaptiveQuiz from './pages/AdaptiveQuiz';
import AssessmentPage from './pages/AssessmentPage';
import MeetingRoom from './pages/MeetingRoom';
import DsaProblemPage from './pages/DsaProblemPage';
import QuestionPracticePage from './pages/QuestionPracticePage';

// Instructor pages
import InstructorDashboard from './pages/InstructorDashboard';
import InstructorAnalytics from './pages/InstructorAnalytics';
import QuestionCreationPage from './pages/QuestionCreationPage';


// Admin pages
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import Billing from './pages/Billing';

// Auth
import ProtectedRoute from './components/ProtectedRoute';
import GlobalToaster from './components/GlobalToaster';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SessionProvider } from './contexts/SessionContext';
import { api, getAccessToken } from './services/api';
import { useEffect, useState } from 'react';
import { GazeProvider } from './contexts/GazeProvider';
import { CalibrationOverlay } from './components/CalibrationOverlay';

// Guard: redirect users who already completed onboarding away from /onboarding
function OnboardingGuard({ children }) {
  const [checking, setChecking] = useState(true);
  const location = useLocation();
  const token = getAccessToken();

  useEffect(() => {
    if (!token) { setChecking(false); return; }
    api.onboarding.getStatus()
      .then((data) => {
        if (data?.onboarding_complete) {
          window.location.replace('/dashboard');
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [token]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return children;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <>
      <div key={location.pathname} className="animate-page-enter h-full w-full">
        <Routes location={location}>
          {/* ── Public routes ── */}
            <Route path="/"                element={<Home />} />
            <Route path="/demo"            element={<DemoDashboard />} />
            <Route path="/features"        element={<Features />} />
            <Route path="/login"           element={<Login />} />
            <Route path="/signup"          element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-email"    element={<VerifyEmail />} />
            <Route path="/reset-password"  element={<ResetPassword />} />
            <Route path="/onboarding"      element={
              <ProtectedRoute allowedRoles={['student']}>
                <OnboardingGuard><StudentOnboarding /></OnboardingGuard>
              </ProtectedRoute>
            } />

            {/* ── Student routes ── */}
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/courses" element={
              <ProtectedRoute allowedRoles={['student']}>
                <MyCourses />
              </ProtectedRoute>
            } />
            <Route path="/course" element={
              <ProtectedRoute allowedRoles={['student']}>
                <CourseDetail />
              </ProtectedRoute>
            } />
            <Route path="/lesson" element={
              <ProtectedRoute allowedRoles={['student']}>
                <LessonPlayer />
              </ProtectedRoute>
            } />
            <Route path="/lesson-demo" element={
              <ProtectedRoute allowedRoles={['student']}>
                <LessonShell />
              </ProtectedRoute>
            } />
            <Route path="/quiz" element={
              <ProtectedRoute allowedRoles={['student']}>
                <SelfCheck />
              </ProtectedRoute>
            } />
            <Route path="/adaptive-quiz" element={
              <ProtectedRoute allowedRoles={['student']}>
                <AdaptiveQuiz />
              </ProtectedRoute>
            } />
            <Route path="/progress" element={
              <ProtectedRoute allowedRoles={['student']}>
                <ProgressAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/assessment/:sessionId" element={
              <ProtectedRoute allowedRoles={['student']}>
                <AssessmentPage />
              </ProtectedRoute>
            } />
            <Route path="/dsa/:id" element={
              <ProtectedRoute allowedRoles={['student']}>
                <DsaProblemPage />
              </ProtectedRoute>
            } />
            <Route path="/question/:id" element={
              <ProtectedRoute allowedRoles={['student']}>
                <QuestionPracticePage />
              </ProtectedRoute>
            } />
            {/* ── Shared authenticated routes (all roles) ── */}
            <Route path="/notifications" element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />

            {/* ── Instructor routes ── */}
            <Route path="/instructor" element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <InstructorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute allowedRoles={['instructor', 'admin']}>
                <InstructorAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/instructor/reports" element={<Navigate to="/analytics" replace />} />
            <Route path="/reports" element={<Navigate to="/analytics" replace />} />
            <Route path="/struggle-analytics" element={<Navigate to="/analytics?tab=overview" replace />} />
            <Route path="/instructor/questions/create" element={
              <ProtectedRoute allowedRoles={['instructor', 'admin']}>
                <QuestionCreationPage />
              </ProtectedRoute>
            } />

            {/* ── Admin routes ── */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/users"          element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
            <Route path="/admin/billing"        element={<ProtectedRoute allowedRoles={['admin']}><Billing /></ProtectedRoute>} />

            {/* ── Meeting route (Accessible by any authenticated user) ── */}
            <Route path="/meeting/:roomId"      element={<ProtectedRoute><MeetingRoom /></ProtectedRoute>} />

            {/* ── 404 fallback ── */}
            <Route path="*" element={<NotFound />} />
          </Routes>
      </div>
      {/* GlobalToaster lives outside the keyed div so it survives route transitions */}
      <GlobalToaster />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SessionProvider>
          <GazeProvider>
            <CalibrationOverlay />
            <BrowserRouter>
                <AnimatedRoutes />
            </BrowserRouter>
          </GazeProvider>
        </SessionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
