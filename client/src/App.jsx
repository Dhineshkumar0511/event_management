import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { ThemeProvider } from './context/ThemeContext'

// Layouts
import AuthLayout from './layouts/AuthLayout'
import DashboardLayout from './layouts/DashboardLayout'

// Auth Pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

// Student Pages
import StudentDashboard from './pages/student/Dashboard'
import NewODRequest from './pages/student/NewODRequest'
import MyRequests from './pages/student/MyRequests'
import RequestDetails from './pages/student/RequestDetails'
import ActiveEvent from './pages/student/ActiveEvent'
import SubmitResult from './pages/student/SubmitResult'
import EventCalendar from './pages/shared/EventCalendar'

// Shared Result Page
import EventResults from './pages/shared/EventResults'
import Leaderboard from './pages/shared/Leaderboard'
import ODLetterView from './pages/shared/ODLetterView'
import LeaveLetterView from './pages/shared/LeaveLetterView'

// Staff Pages
import StaffDashboard from './pages/staff/Dashboard'
import StaffRequests from './pages/staff/Requests'
import StaffReview from './pages/staff/Review'
import StaffHistory from './pages/staff/History'

// HOD Pages
import HODDashboard from './pages/hod/Dashboard'
import HODRequests from './pages/hod/Requests'
import HODReview from './pages/hod/Review'
import AllRequests from './pages/hod/AllRequests'
import ManageUsers from './pages/hod/ManageUsers'
import LiveTracking from './pages/hod/LiveTracking'
import Reports from './pages/hod/Reports'
import AuditTrail from './pages/hod/AuditTrail'
import LeaveManagement from './pages/hod/LeaveManagement'
import WhatsAppSettings from './pages/hod/WhatsAppSettings'

// Leave Pages
import NewLeaveRequest from './pages/student/NewLeaveRequest'
import MyLeaves from './pages/student/MyLeaves'
import StaffLeaveRequests from './pages/staff/LeaveRequests'

// Shared Pages
import Profile from './pages/shared/Profile'
import WhatsAppReport from './pages/shared/WhatsAppReport'

// New Feature Pages
import HallOfFame from './pages/shared/HallOfFame'
import CertificateRepository from './pages/shared/CertificateRepository'
import AnnouncementManager from './pages/hod/AnnouncementManager'
import AutoApprovalRules from './pages/hod/AutoApprovalRules'
import StaffWorkload from './pages/hod/StaffWorkload'

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard based on role
    const dashboardRoutes = {
      student: '/student/dashboard',
      staff: '/staff/dashboard',
      hod: '/hod/dashboard'
    }
    return <Navigate to={dashboardRoutes[user?.role] || '/login'} replace />
  }
  
  return children
}

// Public Route (redirects if already logged in)
const PublicRoute = ({ children }) => {
  const { user, isAuthenticated } = useAuthStore()
  
  if (isAuthenticated && user) {
    const dashboardRoutes = {
      student: '/student/dashboard',
      staff: '/staff/dashboard',
      hod: '/hod/dashboard'
    }
    return <Navigate to={dashboardRoutes[user.role]} replace />
  }
  
  return children
}

function App() {
  return (
    <ThemeProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        <Route element={<AuthLayout />}>
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } 
          />
          <Route 
            path="/forgot-password" 
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            } 
          />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Student Routes */}
        <Route 
          path="/student" 
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="new-request" element={<NewODRequest />} />
          <Route path="edit-request/:id" element={<NewODRequest />} />
          <Route path="my-requests" element={<MyRequests />} />
          <Route path="request/:id" element={<RequestDetails />} />
          <Route path="active-event" element={<ActiveEvent />} />
          <Route path="submit-result" element={<SubmitResult />} />
          <Route path="od-letter/:id" element={<ODLetterView />} />
          <Route path="calendar" element={<EventCalendar />} />
          <Route path="profile" element={<Profile />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="leaves" element={<MyLeaves />} />
          <Route path="leaves/new" element={<NewLeaveRequest />} />
          <Route path="leave-letter/:id" element={<LeaveLetterView />} />
          <Route path="hall-of-fame" element={<HallOfFame />} />
          <Route path="certificates" element={<CertificateRepository />} />
        </Route>

        {/* Staff Routes */}
        <Route 
          path="/staff" 
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StaffDashboard />} />
          <Route path="requests" element={<StaffRequests />} />
          <Route path="review/:id" element={<StaffReview />} />
          <Route path="od-letter/:id" element={<ODLetterView />} />
          <Route path="history" element={<StaffHistory />} />
          <Route path="calendar" element={<EventCalendar />} />
          <Route path="results" element={<EventResults />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="leaves" element={<StaffLeaveRequests />} />
          <Route path="leave-letter/:id" element={<LeaveLetterView />} />
          <Route path="whatsapp-report" element={<WhatsAppReport />} />
          <Route path="hall-of-fame" element={<HallOfFame />} />
          <Route path="certificates" element={<CertificateRepository />} />
        </Route>

        {/* HOD Routes */}
        <Route 
          path="/hod" 
          element={
            <ProtectedRoute allowedRoles={['hod']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<HODDashboard />} />
          <Route path="requests" element={<HODRequests />} />
          <Route path="review/:id" element={<HODReview />} />
          <Route path="od-letter/:id" element={<ODLetterView />} />
          <Route path="all-requests" element={<AllRequests />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="tracking" element={<LiveTracking />} />
          <Route path="reports" element={<Reports />} />
          <Route path="audit-trail" element={<AuditTrail />} />
          <Route path="calendar" element={<EventCalendar />} />
          <Route path="results" element={<EventResults />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="leaves" element={<LeaveManagement />} />
          <Route path="leave-letter/:id" element={<LeaveLetterView />} />
          <Route path="whatsapp-report" element={<WhatsAppReport />} />
          <Route path="whatsapp-settings" element={<WhatsAppSettings />} />
          <Route path="hall-of-fame" element={<HallOfFame />} />
          <Route path="certificates" element={<CertificateRepository />} />
          <Route path="announcements" element={<AnnouncementManager />} />
          <Route path="auto-rules" element={<AutoApprovalRules />} />
          <Route path="staff-workload" element={<StaffWorkload />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ThemeProvider>
  )
}

export default App
