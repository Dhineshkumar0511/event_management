import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../database/connection.js';
import { authenticate, isStudent, isStaffOrHOD, isHOD } from '../middleware/auth.js';
import { uploadDocuments } from '../middleware/upload.js';
import { notifyLeaveSubmitted, notifyLeaveStaffDecision, notifyLeaveHODDecision } from '../services/notificationService.js';

const router = express.Router();
router.use(authenticate);

// Helpers
const generateLeaveId = () => {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  const rand = Math.random().toString(36).toUpperCase().slice(2, 7);
  return `LV-${dateStr}-${rand}`;
};

const daysBetween = (from, to) => {
  const d1 = new Date(from), d2 = new Date(to);
  return Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
};

// ─────────────────────────────────────────────────────────────
// STUDENT ROUTES
// ─────────────────────────────────────────────────────────────

// @route   POST /api/leave/request
// @desc    Submit a new leave request (pre or post)
// @access  Student
router.post('/request', isStudent, (req, res, next) => {
  uploadDocuments(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, [
  body('leave_type').isIn(['sick','casual','emergency','medical','family','other']),
  body('leave_mode').isIn(['pre_leave','post_leave']),
  body('from_date').isDate(),
  body('to_date').isDate(),
  body('reason').trim().isLength({ min: 10 }).withMessage('Reason must be at least 10 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { leave_type, leave_mode, from_date, to_date, reason, contact_during_leave, parent_name, parent_phone } = req.body;
    const document_url = req.files?.[0]?.path || null;

    if (new Date(to_date) < new Date(from_date)) {
      return res.status(400).json({ success: false, message: 'End date cannot be before start date' });
    }

    const days_count = daysBetween(from_date, to_date);
    const leave_id = generateLeaveId();

    const [result] = await pool.query(
      `INSERT INTO leave_requests
        (leave_id, student_id, leave_type, leave_mode, from_date, to_date, days_count, reason,
         contact_during_leave, parent_name, parent_phone, document_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [leave_id, req.user.id, leave_type, leave_mode, from_date, to_date, days_count, reason,
       contact_during_leave || null, parent_name || null, parent_phone || null, document_url]
    );

    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'LEAVE_SUBMITTED', 'leave_requests', result.insertId, JSON.stringify({ leave_id, leave_type, leave_mode, days_count })]
    );

    // WhatsApp / SMS notify staff
    const [staffForLeave] = await pool.query(
      'SELECT phone FROM users WHERE role = "staff" AND department = ? AND phone IS NOT NULL',
      [req.user.department]
    );
    notifyLeaveSubmitted(
      { name: req.user.name, phone: req.user.phone, department: req.user.department },
      { leave_id, leave_type, from_date, to_date, days_count },
      staffForLeave
    ).catch(() => {});

    res.status(201).json({ success: true, message: 'Leave request submitted', data: { id: result.insertId, leave_id } });
  } catch (error) {
    console.error('Submit leave error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit leave request' });
  }
});

// @route   GET /api/leave/my-leaves
// @desc    Get student's own leave requests
// @access  Student
router.get('/my-leaves', isStudent, async (req, res) => {
  try {
    const { status, leave_type } = req.query;
    const conditions = ['lr.student_id = ?'];
    const params = [req.user.id];

    if (status) { conditions.push('lr.status = ?'); params.push(status); }
    if (leave_type) { conditions.push('lr.leave_type = ?'); params.push(leave_type); }

    const [leaves] = await pool.query(
      `SELECT lr.*, s.name as staff_name
       FROM leave_requests lr
       LEFT JOIN users s ON lr.staff_id = s.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY lr.created_at DESC`,
      params
    );

    res.json({ success: true, data: leaves });
  } catch (error) {
    console.error('Get my leaves error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leaves' });
  }
});

// @route   DELETE /api/leave/request/:id
// @desc    Cancel (delete) a pending leave request
// @access  Student (own, pending only)
router.delete('/request/:id', isStudent, async (req, res) => {
  try {
    const [[leave]] = await pool.query(
      'SELECT id, status FROM leave_requests WHERE id = ? AND student_id = ?',
      [req.params.id, req.user.id]
    );
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending leaves can be cancelled' });
    }
    await pool.query('DELETE FROM leave_requests WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Leave request cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel leave' });
  }
});

// ─────────────────────────────────────────────────────────────
// STAFF ROUTES
// ─────────────────────────────────────────────────────────────

// @route   GET /api/leave/staff/pending
// @desc    Get leaves pending staff review (for student's in staff's dept)
// @access  Staff/HOD
router.get('/staff/pending', isStaffOrHOD, async (req, res) => {
  try {
    const [leaves] = await pool.query(
      `SELECT lr.*, u.name AS student_name, u.employee_id AS roll_number,
              u.department, u.year_of_study, u.section, u.phone AS student_phone
       FROM leave_requests lr
       JOIN users u ON lr.student_id = u.id
       WHERE lr.status = 'pending'
         AND (u.department = (SELECT department FROM users WHERE id = ?) OR ? = 'hod')
       ORDER BY lr.created_at ASC`,
      [req.user.id, req.user.role]
    );
    res.json({ success: true, data: leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch pending leaves' });
  }
});

// @route   GET /api/leave/staff/all
// @desc    Get all leave requests staff has handled + pending
// @access  Staff/HOD
router.get('/staff/all', isStaffOrHOD, async (req, res) => {
  try {
    const { status, leave_type, from_date, to_date } = req.query;
    const conditions = ['(u.department = (SELECT department FROM users WHERE id = ?) OR ? = \'hod\')'];
    const params = [req.user.id, req.user.role];

    if (status) { conditions.push('lr.status = ?'); params.push(status); }
    if (leave_type) { conditions.push('lr.leave_type = ?'); params.push(leave_type); }
    if (from_date) { conditions.push('lr.from_date >= ?'); params.push(from_date); }
    if (to_date) { conditions.push('lr.to_date <= ?'); params.push(to_date); }

    const [leaves] = await pool.query(
      `SELECT lr.*, u.name AS student_name, u.employee_id AS roll_number,
              u.department, u.year_of_study, u.section,
              s.name AS staff_name
       FROM leave_requests lr
       JOIN users u ON lr.student_id = u.id
       LEFT JOIN users s ON lr.staff_id = s.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY lr.created_at DESC`,
      params
    );
    res.json({ success: true, data: leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch leaves' });
  }
});

// @route   GET /api/leave/detail/:id
// @desc    Get single leave detail
// @access  Staff/HOD or the student who owns it
router.get('/detail/:id', async (req, res) => {
  try {
    const [[leave]] = await pool.query(
      `SELECT lr.*, u.name AS student_name, u.employee_id AS roll_number,
              u.department, u.year_of_study, u.section, u.phone AS student_phone,
              u.email AS student_email,
              s.name AS staff_name
       FROM leave_requests lr
       JOIN users u ON lr.student_id = u.id
       LEFT JOIN users s ON lr.staff_id = s.id
       WHERE lr.id = ?`,
      [req.params.id]
    );
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    // Access: own student, staff in same dept, or hod
    const isOwner = leave.student_id === req.user.id;
    const isStaff = (req.user.role === 'staff' || req.user.role === 'hod');
    if (!isOwner && !isStaff) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    res.json({ success: true, data: leave });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch leave detail' });
  }
});

// @route   PUT /api/leave/:id/staff-review
// @desc    Staff approves or rejects a leave
// @access  Staff/HOD
router.put('/:id/staff-review', isStaffOrHOD, [
  body('action').isIn(['approve','reject']),
  body('remarks').optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { action, remarks } = req.body;
    const [[leave]] = await pool.query('SELECT * FROM leave_requests WHERE id = ?', [req.params.id]);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Leave already reviewed' });
    }

    const newStatus = req.user.role === 'hod'
      ? (action === 'approve' ? 'approved' : 'rejected')
      : (action === 'approve' ? 'staff_approved' : 'staff_rejected');

    await pool.query(
      `UPDATE leave_requests
       SET status = ?, staff_id = ?, staff_remarks = ?, staff_reviewed_at = NOW()
       WHERE id = ?`,
      [newStatus, req.user.id, remarks || null, req.params.id]
    );

    // Notify student
    const message = action === 'approve'
      ? `Your leave request (${leave.leave_id}) has been ${req.user.role === 'hod' ? 'approved' : 'forwarded for HOD review'}.`
      : `Your leave request (${leave.leave_id}) has been rejected. ${remarks ? 'Reason: ' + remarks : ''}`;

    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
      [leave.student_id, `Leave ${action === 'approve' ? 'Approved' : 'Rejected'}`, message, action === 'approve' ? 'success' : 'warning']
    );

    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, action === 'approve' ? 'LEAVE_APPROVE' : 'LEAVE_REJECT', 'leave_requests', req.params.id,
       JSON.stringify({ leave_id: leave.leave_id, remarks })]
    );

    // WhatsApp / SMS notify student
    const [[studentUser]] = await pool.query('SELECT name, phone FROM users WHERE id = ?', [leave.student_id]);
    notifyLeaveStaffDecision(
      { name: studentUser?.name, phone: studentUser?.phone },
      { leave_id: leave.leave_id },
      action, req.user.role, remarks
    ).catch(() => {});

    res.json({ success: true, message: `Leave ${action === 'approve' ? (req.user.role === 'hod' ? 'approved' : 'forwarded') : 'rejected'} successfully` });
  } catch (error) {
    console.error('Staff review error:', error);
    res.status(500).json({ success: false, message: 'Failed to review leave' });
  }
});

// ─────────────────────────────────────────────────────────────
// HOD ROUTES
// ─────────────────────────────────────────────────────────────

// @route   GET /api/leave/hod/pending
// @desc    Get staff-approved leaves awaiting HOD decision
// @access  HOD
router.get('/hod/pending', isHOD, async (req, res) => {
  try {
    const [leaves] = await pool.query(
      `SELECT lr.*, u.name AS student_name, u.employee_id AS roll_number,
              u.department, u.year_of_study, u.section,
              s.name AS staff_name
       FROM leave_requests lr
       JOIN users u ON lr.student_id = u.id
       LEFT JOIN users s ON lr.staff_id = s.id
       WHERE lr.status = 'staff_approved'
       ORDER BY lr.staff_reviewed_at ASC`
    );
    res.json({ success: true, data: leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch leaves' });
  }
});

// @route   PUT /api/leave/:id/hod-review
// @desc    HOD final approve or reject
// @access  HOD
router.put('/:id/hod-review', isHOD, [
  body('action').isIn(['approve','reject']),
  body('remarks').optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { action, remarks } = req.body;
    const [[leave]] = await pool.query('SELECT * FROM leave_requests WHERE id = ?', [req.params.id]);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
    if (leave.status !== 'staff_approved') {
      return res.status(400).json({ success: false, message: 'Leave must be staff-approved first' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    await pool.query(
      `UPDATE leave_requests
       SET status = ?, hod_remarks = ?, hod_reviewed_at = NOW()
       WHERE id = ?`,
      [newStatus, remarks || null, req.params.id]
    );

    const message = action === 'approve'
      ? `Your leave request (${leave.leave_id}) has been fully approved by HOD.`
      : `Your leave request (${leave.leave_id}) has been rejected by HOD. ${remarks ? 'Reason: ' + remarks : ''}`;

    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
      [leave.student_id, `Leave ${action === 'approve' ? 'Approved by HOD' : 'Rejected by HOD'}`,
       message, action === 'approve' ? 'success' : 'error']
    );

    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, action === 'approve' ? 'HOD_LEAVE_APPROVE' : 'HOD_LEAVE_REJECT',
       'leave_requests', req.params.id, JSON.stringify({ leave_id: leave.leave_id, remarks })]
    );

    // WhatsApp / SMS notify student
    const [[studentForLeave]] = await pool.query('SELECT name, phone FROM users WHERE id = ?', [leave.student_id]);
    notifyLeaveHODDecision(
      { name: studentForLeave?.name, phone: studentForLeave?.phone },
      { leave_id: leave.leave_id },
      action, remarks
    ).catch(() => {});

    res.json({ success: true, message: `Leave ${newStatus} by HOD` });
  } catch (error) {
    console.error('HOD review error:', error);
    res.status(500).json({ success: false, message: 'Failed to review leave' });
  }
});

// @route   GET /api/leave/hod/all
// @desc    All leave requests (HOD overview with filters)
// @access  HOD
router.get('/hod/all', isHOD, async (req, res) => {
  try {
    const { status, leave_type, department, from_date, to_date } = req.query;
    const conditions = [];
    const params = [];

    if (status) { conditions.push('lr.status = ?'); params.push(status); }
    if (leave_type) { conditions.push('lr.leave_type = ?'); params.push(leave_type); }
    if (department) { conditions.push('u.department = ?'); params.push(department); }
    if (from_date) { conditions.push('lr.from_date >= ?'); params.push(from_date); }
    if (to_date) { conditions.push('lr.to_date <= ?'); params.push(to_date); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [leaves] = await pool.query(
      `SELECT lr.*, u.name AS student_name, u.employee_id AS roll_number,
              u.department, u.year_of_study, u.section,
              s.name AS staff_name
       FROM leave_requests lr
       JOIN users u ON lr.student_id = u.id
       LEFT JOIN users s ON lr.staff_id = s.id
       ${where}
       ORDER BY lr.created_at DESC`,
      params
    );

    // Stats
    const [[stats]] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(days_count) AS total_days,
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status='staff_approved' THEN 1 ELSE 0 END) AS awaiting_hod,
        SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status IN ('staff_rejected','rejected') THEN 1 ELSE 0 END) AS rejected
      FROM leave_requests lr
      JOIN users u ON lr.student_id = u.id
      ${department ? 'WHERE u.department = ?' : ''}
    `, department ? [department] : []);

    res.json({ success: true, data: { leaves, stats } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch leaves' });
  }
});

// ─────────────────────────────────────────────────────────────
// SIGN LEAVE LETTER
// ─────────────────────────────────────────────────────────────

// @route  PUT /api/leave/:id/sign
// @desc   Staff or HOD signs the leave letter with a base64 signature
// @access Staff | HOD
router.put('/:id/sign', isStaffOrHOD, async (req, res) => {
  const { signature } = req.body;
  if (!signature || !signature.startsWith('data:image/')) {
    return res.status(400).json({ success: false, message: 'Valid signature image required.' });
  }
  const columnMap = { hod: 'hod_signature', staff: 'staff_signature' };
  const col = columnMap[req.user.role];
  if (!col) return res.status(403).json({ success: false, message: 'Not authorised to sign.' });
  try {
    const [[leave]] = await pool.query('SELECT id FROM leave_requests WHERE id = ?', [req.params.id]);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found.' });
    await pool.query(`UPDATE leave_requests SET ${col} = ? WHERE id = ?`, [signature, req.params.id]);
    res.json({ success: true, message: 'Signature saved successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save signature.' });
  }
});

export default router;
