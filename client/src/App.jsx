import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { ThemeProvider } from './context/ThemeContext'

// Layouts
import AuthLayout from './layouts/AuthLayout'
import DashboardLayout from './layouts/DashboardLayout'

// Auth Pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'

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
import ODLetterView from './pages/shared/ODLetterView'

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

// Shared Pages
import Profile from './pages/shared/Profile'

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
          <Route path="profile" element={<Profile />} />
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
          <Route path="calendar" element={<EventCalendar />} />
          <Route path="results" element={<EventResults />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ThemeProvider>
  )
}

export default App
