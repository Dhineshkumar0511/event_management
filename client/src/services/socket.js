import { io } from 'socket.io-client'

let socket = null

export const initSocket = (token) => {
  if (socket) {
    socket.disconnect()
  }

  socket = io('/', {
    auth: { token },
    transports: ['websocket', 'polling']
  })

  socket.on('connect', () => {
    console.log('🔌 Connected to server')
  })

  socket.on('disconnect', () => {
    console.log('🔌 Disconnected from server')
  })

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message)
  })

  return socket
}

export const getSocket = () => socket

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// Event listeners
export const subscribeToRequestUpdates = (callback) => {
  if (socket) {
    socket.on('request_status_update', callback)
  }
}

export const subscribeToNewRequests = (callback) => {
  if (socket) {
    socket.on('new_od_request', callback)
  }
}

export const subscribeToNewApprovals = (callback) => {
  if (socket) {
    socket.on('new_approval_request', callback)
  }
}

export const subscribeToStudentCheckins = (callback) => {
  if (socket) {
    socket.on('student_checkin', callback)
  }
}

export const subscribeToLocationUpdates = (callback) => {
  if (socket) {
    socket.on('student_location_update', callback)
  }
}

// New: subscribe to real-time notifications
export const subscribeToNotifications = (callback) => {
  if (socket) {
    socket.on('notification', callback)
  }
}

// New: subscribe to check-in reminders
export const subscribeToCheckinReminders = (callback) => {
  if (socket) {
    socket.on('checkin_reminder', callback)
  }
}

// New: subscribe to result deadline reminders
export const subscribeToResultDeadlineReminders = (callback) => {
  if (socket) {
    socket.on('result_deadline_reminder', callback)
  }
}

// New: unsubscribe helpers
export const unsubscribe = (event) => {
  if (socket) {
    socket.off(event)
  }
}

// Emit events
export const emitLocationUpdate = (data) => {
  if (socket) {
    socket.emit('location_update', data)
  }
}

export const joinRequestTracking = (requestId) => {
  if (socket) {
    socket.emit('join_request_tracking', requestId)
  }
}

export const leaveRequestTracking = (requestId) => {
  if (socket) {
    socket.emit('leave_request_tracking', requestId)
  }
}
