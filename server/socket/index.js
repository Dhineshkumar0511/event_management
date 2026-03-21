import jwt from 'jsonwebtoken';

export const setupSocketIO = (io) => {
  // Per-socket throttle map for location updates (ms timestamp of last accepted event)
  const locationUpdateThrottle = new Map();
  const LOCATION_THROTTLE_MS = 5000; // max one location update per 5 seconds per socket
  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.userId} (${socket.userRole})`);

    // Join role-based rooms
    socket.join(socket.userRole);
    socket.join(`user_${socket.userId}`);
    
    // Students join their specific room
    if (socket.userRole === 'student') {
      socket.join(`student_${socket.userId}`);
    }

    // Staff and HOD join tracking room
    if (['staff', 'hod'].includes(socket.userRole)) {
      socket.join('tracking');
    }

    // Handle joining specific OD request room (for tracking)
    socket.on('join_request_tracking', (requestId) => {
      socket.join(`request_${requestId}`);
      console.log(`User ${socket.userId} joined tracking for request ${requestId}`);
    });

    // Handle leaving request tracking
    socket.on('leave_request_tracking', (requestId) => {
      socket.leave(`request_${requestId}`);
    });

    // Handle real-time location updates from students
    socket.on('location_update', (data) => {
      if (socket.userRole === 'student') {
        const now = Date.now();
        const last = locationUpdateThrottle.get(socket.id) || 0;
        if (now - last < LOCATION_THROTTLE_MS) return; // throttle: drop update
        locationUpdateThrottle.set(socket.id, now);

        // Broadcast to tracking room
        socket.to('tracking').emit('student_location_update', {
          studentId: socket.userId,
          ...data,
          timestamp: new Date()
        });

        // Also emit to specific request room
        if (data.requestId) {
          socket.to(`request_${data.requestId}`).emit('student_location_update', {
            studentId: socket.userId,
            ...data,
            timestamp: new Date()
          });
        }
      }
    });

    // Handle check-in notification
    socket.on('checkin_complete', (data) => {
      socket.to('tracking').emit('student_checkin', {
        studentId: socket.userId,
        ...data,
        timestamp: new Date()
      });
    });

    // Handle typing indicator for chat
    socket.on('typing', (data) => {
      socket.to(data.room).emit('user_typing', {
        userId: socket.userId,
        isTyping: data.isTyping
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      locationUpdateThrottle.delete(socket.id);
      console.log(`🔌 User disconnected: ${socket.userId}`);
    });
  });

  // Helper function to emit to specific user
  io.emitToUser = (userId, event, data) => {
    io.to(`user_${userId}`).emit(event, data);
  };

  // Helper function to emit to role
  io.emitToRole = (role, event, data) => {
    io.to(role).emit(event, data);
  };

  console.log('✅ Socket.IO configured');
};

export default setupSocketIO;
