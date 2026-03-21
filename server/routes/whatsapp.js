import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getWAStatus, initWAClient } from '../services/notificationService.js';

const router = express.Router();

// GET /api/whatsapp/status  — HOD + Staff
router.get('/status', authenticate, authorize('hod', 'staff'), (req, res) => {
  res.json({ success: true, data: getWAStatus() });
});

// POST /api/whatsapp/connect — HOD + Staff can trigger WA client init
router.post('/connect', authenticate, authorize('hod', 'staff'), (req, res) => {
  initWAClient();
  res.json({ success: true, message: 'WhatsApp client initialising — refresh status in a few seconds.' });
});

export default router;
