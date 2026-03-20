import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

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
}

// AI APIs
export const aiAPI = {
  verifyEvent: (data) => api.post('/ai/verify-event', data),
  summarize: (data) => api.post('/ai/summarize', data),
  chat: (data) => api.post('/ai/chat', data),
}
