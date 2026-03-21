import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

// Route imports
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/student.js';
import staffRoutes from './routes/staff.js';
import hodRoutes from './routes/hod.js';
import trackingRoutes from './routes/tracking.js';
import aiRoutes from './routes/ai.js';
import odLetterRoutes from './routes/odletter.js';
import leaveRoutes from './routes/leave.js';
import whatsappRoutes from './routes/whatsapp.js';
import featuresRoutes from './routes/features.js';

// Middleware imports
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter, authLimiter, aiLimiter } from './middleware/rateLimiter.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { inputSanitizer } from './middleware/inputSanitizer.js';
import { csrfProtection, csrfValidate } from './middleware/csrfProtection.js';
import { setupSocketIO } from './socket/index.js';
import { initCronJobs } from './services/cronService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Trust the first proxy (Render, Heroku, Nginx, etc.) so that
// express-rate-limit can correctly read the client IP from X-Forwarded-For
app.set('trust proxy', 1);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Security middleware first
app.use(securityHeaders);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie parsing - MUST be before CSRF protection
app.use(cookieParser());

// Input sanitization
app.use(inputSanitizer);

// CSRF protection
app.use(csrfProtection);
app.use(csrfValidate);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rate limiting
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/ai', aiLimiter);

// Make io accessible to routes
app.set('io', io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/od-letter', odLetterRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/features', featuresRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'EventPass API is running',
    timestamp: new Date().toISOString()
  });
});

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDistPath));
  // SPA catch-all: must be after all API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Error handling
app.use(errorHandler);

// Setup Socket.IO
setupSocketIO(io);

// Initialize Cron Jobs (automated reminders, phase updates)
initCronJobs(io);

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║                                                  ║
║     🎫 EventPass Server Running                  ║
║                                                  ║
║     📍 http://localhost:${PORT}                    ║
║     🔌 Socket.IO enabled                         ║
║     ⏰ Cron Jobs active                           ║
║     🛡️  Rate Limiting enabled                     ║
║     📊 API: /api                                 ║
║                                                  ║
╚══════════════════════════════════════════════════╝
  `);
});

export { io };
