import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import Home from './pages/Home';
import Features from './pages/Features';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from './pages/ResetPassword';
import RoleSelection from './pages/RoleSelection';
import StudentOnboarding from './pages/StudentOnboarding';
import NotFound from './pages/NotFound';

// Student pages
import StudentDashboard from './pages/StudentDashboard';
import CourseDetail from './pages/CourseDetail';
import LessonPlayer from './pages/LessonPlayer';
import MyCourses from './pages/MyCourses';
import SelfCheck from './pages/SelfCheck';
import ProgressAnalytics from './pages/ProgressAnalytics';
import StruggleAnalytics from './pages/StruggleAnalytics';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';

// Instructor pages
import InstructorDashboard from './pages/InstructorDashboard';
import InstructorReports from './pages/InstructorReports';

// Admin pages
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import Billing from './pages/Billing';

// Auth
import ProtectedRoute from './components/ProtectedRoute';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Public routes ── */}
          <Route path="/"                element={<Home />} />
          <Route path="/features"        element={<Features />} />
          <Route path="/login"           element={<Login />} />
          <Route path="/signup"          element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-email"    element={<VerifyEmail />} />
          <Route path="/reset-password"  element={<ResetPassword />} />
          <Route path="/select-role"     element={<RoleSelection />} />
          <Route path="/onboarding"      element={<StudentOnboarding />} />

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
          <Route path="/quiz" element={
            <ProtectedRoute allowedRoles={['student']}>
              <SelfCheck />
            </ProtectedRoute>
          } />
          <Route path="/progress" element={
            <ProtectedRoute allowedRoles={['student']}>
              <ProgressAnalytics />
            </ProtectedRoute>
          } />
          <Route path="/struggle-analytics" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StruggleAnalytics />
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
          <Route path="/reports" element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <InstructorReports />
            </ProtectedRoute>
          } />

          {/* ── Admin routes ── */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UserManagement />
            </ProtectedRoute>
          } />
          <Route path="/billing" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Billing />
            </ProtectedRoute>
          } />

          {/* ── 404 fallback ── */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
