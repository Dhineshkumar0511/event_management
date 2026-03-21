import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getWAStatus, initWAClient,
  setAutoEnabled, isAutoEnabled,
  setGroupId, sendManualMessage, getWAGroups, getUltraMsgGroups,
} from '../services/notificationService.js';
import pool from '../database/connection.js';

const router = express.Router();

// ─── Load saved config from DB on startup ────────────────────────────────
async function loadConfig() {
  try {
    const [[cfg]] = await pool.query('SELECT * FROM whatsapp_config WHERE id = 1');
    if (cfg) {
      setAutoEnabled(cfg.auto_enabled);
      setGroupId(cfg.notify_group_id);
    }
  } catch { /* table may not exist yet on first run */ }
}
loadConfig();

// GET /api/whatsapp/status — HOD + Staff
router.get('/status', authenticate, authorize('hod', 'staff'), (req, res) => {
  res.json({ success: true, data: getWAStatus() });
});

// POST /api/whatsapp/connect — HOD + Staff can trigger WA client init
router.post('/connect', authenticate, authorize('hod', 'staff'), (req, res) => {
  const force = req.body.force === true;
  initWAClient(force);
  res.json({ success: true, message: 'WhatsApp client initialising — refresh status in a few seconds.' });
});

// GET /api/whatsapp/daily-report?date=YYYY-MM-DD — HOD + Staff
router.get('/daily-report', authenticate, authorize('hod', 'staff'), async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  try {
    const [odStudents] = await pool.query(`
      SELECT u.name, u.year_of_study, u.section, u.department,
             od.event_name, od.event_start_date, od.event_end_date, od.request_id
      FROM od_requests od
      JOIN users u ON od.student_id = u.id
      WHERE od.status = 'approved'
        AND ? BETWEEN od.event_start_date AND od.event_end_date
      ORDER BY u.year_of_study, u.section, u.name
    `, [date]);
    const [leaveStudents] = await pool.query(`
      SELECT u.name, u.year_of_study, u.section, u.department,
             lr.leave_type, lr.from_date, lr.to_date, lr.days_count, lr.leave_id
      FROM leave_requests lr
      JOIN users u ON lr.student_id = u.id
      WHERE lr.status = 'approved'
        AND ? BETWEEN lr.from_date AND lr.to_date
      ORDER BY u.year_of_study, u.section, u.name
    `, [date]);
    res.json({ success: true, data: { date, odStudents, leaveStudents } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/whatsapp/send  { to, message } — manual send by HOD/Staff
router.post('/send', authenticate, authorize('hod', 'staff'), async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ success: false, message: 'to and message are required' });
  try {
    await sendManualMessage(to.trim(), message);
    res.json({ success: true, message: 'Message sent' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/whatsapp/groups — HOD + Staff — fetch WA groups from connected client
router.get('/groups', authenticate, authorize('hod', 'staff'), async (req, res) => {
  try {
    const groups = await getWAGroups();
    res.json({ success: true, data: groups });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// GET /api/whatsapp/ultramsg-groups — fetch groups directly from UltraMsg API
router.get('/ultramsg-groups', authenticate, authorize('hod', 'staff'), async (req, res) => {
  try {
    const groups = await getUltraMsgGroups();
    res.json({ success: true, data: groups });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// GET /api/whatsapp/staff-contacts — HOD + Staff — returns all staff + HOD with phones
router.get('/staff-contacts', authenticate, authorize('hod', 'staff'), async (req, res) => {
  try {
    const [staff] = await pool.query(
      `SELECT id, name, phone, department, role FROM users
       WHERE role IN ('staff', 'hod') AND is_active = 1
       ORDER BY role, name`
    );
    res.json({ success: true, data: staff });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/whatsapp/config — HOD only
router.get('/config', authenticate, authorize('hod'), async (req, res) => {
  try {
    const [[cfg]] = await pool.query('SELECT * FROM whatsapp_config WHERE id = 1');
    res.json({ success: true, data: cfg || { auto_enabled: false, saved_contacts: [], notify_group_id: '' } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/whatsapp/config — HOD only — save settings
router.post('/config', authenticate, authorize('hod'), async (req, res) => {
  const { auto_enabled, saved_contacts, notify_group_id } = req.body;
  try {
    await pool.query(`
      INSERT INTO whatsapp_config (id, auto_enabled, saved_contacts, notify_group_id)
      VALUES (1, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        auto_enabled = VALUES(auto_enabled),
        saved_contacts = VALUES(saved_contacts),
        notify_group_id = VALUES(notify_group_id)
    `, [
      auto_enabled ? 1 : 0,
      JSON.stringify(saved_contacts || []),
      notify_group_id || '',
    ]);
    setAutoEnabled(auto_enabled);
    setGroupId(notify_group_id);
    res.json({ success: true, message: 'Settings saved' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
