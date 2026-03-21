import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Enable cookie handling CRITICALLY IMPORTANT
})

// Helper to get CSRF token from cookie
const getCsrfTokenFromCookie = () => {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf-token='))
    ?.split('=')[1]
}

// Helper to fetch CSRF token from server
const fetchCsrfToken = async () => {
  try {
    const response = await axios.get('/api/auth/csrf-token', { 
      withCredentials: true 
    })
    return response.data.token
  } catch (error) {
    console.warn('Failed to fetch CSRF token:', error.message)
    return null
  }
}

// Request interceptor to add CSRF token
api.interceptors.request.use(
  async (config) => {
    // For POST/PUT/PATCH/DELETE requests, attach CSRF token
    if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
      // Try to get token from cookie first
      let csrfToken = getCsrfTokenFromCookie()
      
      // If no token in cookie, fetch it from server
      if (!csrfToken) {
        console.log('[API] No CSRF token in cookie, fetching...')
        csrfToken = await fetchCsrfToken()
      }
      
      if (csrfToken) {
        config.headers['x-csrf-token'] = csrfToken
        console.log('[API] CSRF token attached:', csrfToken.substring(0, 10) + '...')
      } else {
        console.warn('[API] No CSRF token available')
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth-storage')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// Student APIs
export const studentAPI = {
  getDashboard: () => api.get('/student/dashboard'),
  getRequests: (params) => api.get('/student/od-requests', { params }),
  getRequestById: (id) => api.get(`/student/od-request/${id}`),
  createRequest: (data) => api.post('/student/od-request', data),
  updateRequest: (id, data) => api.put(`/student/od-request/${id}`, data),
  deleteRequest: (id) => api.delete(`/student/od-request/${id}`),
  deleteRequests: (ids) => api.delete('/student/od-requests', { data: { ids } }),
  getNotifications: () => api.get('/student/notifications'),
  markNotificationRead: (id) => api.put(`/student/notifications/${id}/read`),
  markAllNotificationsRead: () => api.put('/student/notifications/read-all'),
  downloadLetter: (id) => api.get(`/student/od-request/${id}/letter`, { responseType: 'blob' }),
}

// Staff APIs
export const staffAPI = {
  getDashboard: () => api.get('/staff/dashboard'),
  getPendingRequests: () => api.get('/staff/od-requests'),
  getReviewedRequests: () => api.get('/staff/history'),
  getRequestById: (id) => api.get(`/staff/od-request/${id}`),
  aiVerify: (id) => api.post(`/staff/od-request/${id}/ai-verify`),
  generateSummary: (id) => api.post(`/staff/od-request/${id}/generate-summary`),
  approveRequest: (id, data) => api.put(`/staff/od-request/${id}/approve`, data),
  rejectRequest: (id, data) => api.put(`/staff/od-request/${id}/reject`, data),
  deleteRequest: (id) => api.delete(`/staff/od-request/${id}`),
  deleteRequests: (ids) => api.delete('/staff/od-requests', { data: { ids } }),
  getHistory: (params) => api.get('/staff/history', { params }),
}

// HOD APIs
export const hodAPI = {
  getAnalytics: () => api.get('/hod/analytics'),
  getPendingApproval: () => api.get('/hod/od-requests', { params: { status: 'hod_review' } }),
  getRequestById: (id) => api.get(`/hod/od-request/${id}`),
  approveRequest: (id, data) => api.put(`/hod/od-request/${id}/approve`, data),
  rejectRequest: (id, data) => api.put(`/hod/od-request/${id}/reject`, data),
  deleteRequest: (id) => api.delete(`/hod/od-request/${id}`),
  deleteRequests: (ids) => api.delete('/hod/od-requests', { data: { ids } }),
  getAllRequests: (params) => api.get('/hod/all-requests', { params }),
  getUsers: (params) => api.get('/hod/users', { params }),
  createUser: (data) => api.post('/hod/users', data),
  updateUser: (id, data) => api.put(`/hod/users/${id}`, data),
  deleteUser: (id) => api.delete(`/hod/users/${id}`),
  getActiveEvents: () => api.get('/hod/active-events'),
  getStudentActivity: (params) => api.get('/hod/student-activity', { params }),
  getStudentMonitor: (studentId) => api.get(`/hod/student-monitor/${studentId}`),
  getReports: () => api.get('/hod/reports'),
  getAuditLogs: (params) => api.get('/hod/audit-logs', { params }),
  bulkImportUsers: (users) => api.post('/hod/users/bulk-import', { users }),
}

// Tracking APIs
export const trackingAPI = {
  checkin: (data) => api.post('/tracking/checkin', data),
  getCheckins: (odRequestId) => api.get(`/tracking/checkins/${odRequestId}`),
  getActiveEvent: () => api.get('/tracking/active-event'),
  submitResult: (formData) => api.post('/tracking/submit-result', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadResultPhotos: (resultId, data) => api.post(`/tracking/result/${resultId}/photos`, data),
  getMyResults: () => api.get('/tracking/my-results'),
  getPendingResults: () => api.get('/tracking/pending-results'),
  getComplianceSummary: () => api.get('/tracking/compliance-summary'),
  getLiveTracking: (requestId) => api.get(`/tracking/live/${requestId}`),
  getLive: (params) => api.get('/tracking/live', { params }),
  getStudentCheckins: (studentId, params) => api.get(`/tracking/student/${studentId}/checkins`, { params }),
  getAllResults: (params) => api.get('/tracking/results', { params }),
  verifyResult: (id, data) => api.put(`/tracking/results/${id}/verify`, data),
  getLeaderboard: (params) => api.get('/tracking/leaderboard', { params }),
  deleteResult: (id) => api.delete(`/tracking/results/${id}`),
  deleteResults: (ids) => api.delete('/tracking/results', { data: { ids } }),
}

// AI APIs
export const aiAPI = {
  verifyEvent: (data) => api.post('/ai/verify-event', data),
  summarize: (data) => api.post('/ai/summarize', data),
  chat: (data) => api.post('/ai/chat', data),
};

export const leaveAPI = {
  // Student
  submitRequest: (data) => api.post('/leave/request', data),
  getMyLeaves: (params) => api.get('/leave/my-leaves', { params }),
  cancelRequest: (id) => api.delete(`/leave/request/${id}`),
  // Shared detail
  getDetail: (id) => api.get(`/leave/detail/${id}`),
  // Staff
  getStaffPending: () => api.get('/leave/staff/pending'),
  getStaffAll: (params) => api.get('/leave/staff/all', { params }),
  staffReview: (id, data) => api.put(`/leave/${id}/staff-review`, data),
  // HOD
  getHodPending: () => api.get('/leave/hod/pending'),
  getHodAll: (params) => api.get('/leave/hod/all', { params }),
  hodReview: (id, data) => api.put(`/leave/${id}/hod-review`, data),
  // Signature
  signLetter: (id, data) => api.put(`/leave/${id}/sign`, data),
};

export const whatsappAPI = {
  getStatus:          ()            => api.get('/whatsapp/status'),
  connect:            (force=false) => api.post('/whatsapp/connect', { force }),
  getDailyReport:     (date)        => api.get(`/whatsapp/daily-report?date=${date}`),
  send:               (to, message) => api.post('/whatsapp/send', { to, message }),
  getConfig:          ()            => api.get('/whatsapp/config'),
  saveConfig:         (data)        => api.post('/whatsapp/config', data),
  getGroups:          ()            => api.get('/whatsapp/groups'),
  getUltraMsgGroups:  ()            => api.get('/whatsapp/ultramsg-groups'),
  getStaffContacts:   ()            => api.get('/whatsapp/staff-contacts'),
};

// ═══════════════════════════════════════════════════════════════
// FEATURES API - New enhancements
// ═══════════════════════════════════════════════════════════════
export const featuresAPI = {
  // Announcements
  getAnnouncements: () => api.get('/features/announcements'),
  createAnnouncement: (data) => api.post('/features/announcements', data),
  deleteAnnouncement: (id) => api.delete(`/features/announcements/${id}`),

  // Comments / Messaging
  getComments: (entityType, entityId) => api.get(`/features/comments/${entityType}/${entityId}`),
  postComment: (data) => api.post('/features/comments', data),

  // Rejection Templates
  getRejectionTemplates: () => api.get('/features/rejection-templates'),
  createRejectionTemplate: (data) => api.post('/features/rejection-templates', data),
  useRejectionTemplate: (id) => api.put(`/features/rejection-templates/${id}/use`),
  deleteRejectionTemplate: (id) => api.delete(`/features/rejection-templates/${id}`),

  // Grievances / Appeals
  fileGrievance: (data) => api.post('/features/grievances', data),
  getGrievances: (params) => api.get('/features/grievances', { params }),
  resolveGrievance: (id, data) => api.put(`/features/grievances/${id}/resolve`, data),

  // Leave Balance
  getLeaveBalance: (params) => api.get('/features/leave-balance', { params }),
  updateLeaveBalance: (studentId, data) => api.put(`/features/leave-balance/${studentId}`, data),

  // Auto-Approval Rules
  getAutoRules: () => api.get('/features/auto-rules'),
  createAutoRule: (data) => api.post('/features/auto-rules', data),
  toggleAutoRule: (id) => api.put(`/features/auto-rules/${id}/toggle`),
  deleteAutoRule: (id) => api.delete(`/features/auto-rules/${id}`),

  // Bulk Actions
  bulkApprove: (data) => api.put('/features/bulk-approve', data),
  bulkReject: (data) => api.put('/features/bulk-reject', data),

  // Sessions
  getSessions: () => api.get('/features/sessions'),
  revokeSession: (id) => api.delete(`/features/sessions/${id}`),

  // Certificates
  getCertificates: (params) => api.get('/features/certificates', { params }),
  uploadCertificate: (formData) => api.post('/features/certificates', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  verifyCertificate: (id) => api.put(`/features/certificates/${id}/verify`),

  // Audit Export
  exportAuditLogs: (params) => api.get('/features/audit-export', { params }),

  // Enhanced Reports
  getEnhancedReports: (params) => api.get('/features/reports/enhanced', { params }),

  // Bulk Import
  bulkImportUsers: (users) => api.post('/features/bulk-import-users', { users }),

  // Staff Workload
  getStaffWorkload: () => api.get('/features/staff-workload'),

  // Hall of Fame
  getHallOfFame: (params) => api.get('/features/hall-of-fame', { params }),

  // Student of the Month
  getStudentOfMonth: (params) => api.get('/features/student-of-month', { params }),
  selectStudentOfMonth: (data) => api.post('/features/student-of-month', data),
  getTop5Students: () => api.get('/features/student-of-month/top5'),
  deleteStudentOfMonth: (id) => api.delete(`/features/student-of-month/${id}`),
  resetAllStudentOfMonth: () => api.delete('/features/student-of-month'),
  seedDemoStudentOfMonth: () => api.post('/features/student-of-month/seed-demo'),

  // Student Lookup
  lookupStudent: (params) => api.get('/features/lookup-student', { params }),

  // Duplicate Check
  checkDuplicate: (params) => api.get('/features/check-duplicate', { params }),

  // Calendar Export
  exportCalendar: () => api.get('/features/calendar-export', { responseType: 'blob' }),

  // Geofence
  updateGeofence: (requestId, data) => api.put(`/features/geofence/${requestId}`, data),
};
