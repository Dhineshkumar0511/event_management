import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import pool from '../database/connection.js';
import { authenticate, isStudent, isStaff, isHOD, isStaffOrHOD } from '../middleware/auth.js';
import { uploadDocuments } from '../middleware/upload.js';

const router = express.Router();
router.use(authenticate);

// ═══════════════════════════════════════════════════════════════
// ANNOUNCEMENTS (HOD create, all view)
// ═══════════════════════════════════════════════════════════════

// GET /api/features/announcements - Get active announcements
router.get('/announcements', async (req, res) => {
  try {
    const { role, department } = req.user;
    let query_str = `
      SELECT a.*, u.name as author_name, u.role as author_role
      FROM announcements a
      JOIN users u ON a.created_by = u.id
      WHERE a.is_active = TRUE
        AND (a.expires_at IS NULL OR a.expires_at > NOW())
        AND (a.target_role = 'all' OR a.target_role = ?)
    `;
    const params = [role];

    if (department) {
      query_str += ` AND (a.target_department IS NULL OR a.target_department = ?)`;
      params.push(department);
    } else {
      query_str += ` AND a.target_department IS NULL`;
    }

    query_str += ` ORDER BY a.priority DESC, a.created_at DESC LIMIT 20`;
    const [announcements] = await pool.query(query_str, params);
    res.json({ success: true, data: announcements });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch announcements' });
  }
});

// POST /api/features/announcements - Create announcement (HOD)
router.post('/announcements', isHOD, [
  body('title').notEmpty().trim().escape(),
  body('message').notEmpty().trim(),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
  body('target_role').optional().isIn(['all', 'student', 'staff']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { title, message, priority, target_role, target_department, expires_at } = req.body;
    const [result] = await pool.query(
      `INSERT INTO announcements (title, message, priority, target_role, target_department, created_by, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, message, priority || 'normal', target_role || 'all', target_department || null, req.user.id, expires_at || null]
    );

    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'CREATE_ANNOUNCEMENT', 'announcement', ?, ?)`,
      [req.user.id, result.insertId, JSON.stringify({ title, target_role, priority })]
    );

    res.json({ success: true, message: 'Announcement created', data: { id: result.insertId } });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ success: false, message: 'Failed to create announcement' });
  }
});

// DELETE /api/features/announcements/:id
router.delete('/announcements/:id', isHOD, async (req, res) => {
  try {
    await pool.query('UPDATE announcements SET is_active = FALSE WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Announcement removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove announcement' });
  }
});

// ═══════════════════════════════════════════════════════════════
// REQUEST COMMENTS / IN-APP MESSAGING
// ═══════════════════════════════════════════════════════════════

// GET /api/features/comments/:entityType/:entityId
router.get('/comments/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    if (!['od_request', 'leave_request'].includes(entityType)) {
      return res.status(400).json({ success: false, message: 'Invalid entity type' });
    }
    const [comments] = await pool.query(
      `SELECT c.*, u.name as user_name, u.role as user_role, u.profile_image
       FROM request_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.entity_type = ? AND c.entity_id = ?
       ORDER BY c.created_at ASC`,
      [entityType, parseInt(entityId)]
    );
    res.json({ success: true, data: comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch comments' });
  }
});

// POST /api/features/comments
router.post('/comments', [
  body('entity_type').isIn(['od_request', 'leave_request']),
  body('entity_id').isInt(),
  body('message').notEmpty().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { entity_type, entity_id, message, is_internal } = req.body;
    const [result] = await pool.query(
      `INSERT INTO request_comments (entity_type, entity_id, user_id, message, is_internal)
       VALUES (?, ?, ?, ?, ?)`,
      [entity_type, parseInt(entity_id), req.user.id, message, is_internal || false]
    );

    // Emit socket notification
    const io = req.app.get('io');
    if (io) {
      // Get the request owner to notify
      const table = entity_type === 'od_request' ? 'od_requests' : 'leave_requests';
      const [rows] = await pool.query(`SELECT student_id FROM ${table} WHERE id = ?`, [parseInt(entity_id)]);
      if (rows.length > 0 && rows[0].student_id !== req.user.id) {
        const notification = {
          title: 'New Comment',
          message: `${req.user.name} commented on your request`,
          type: 'info',
          related_to: entity_type,
          related_id: parseInt(entity_id),
        };
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, type, related_to, related_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [rows[0].student_id, notification.title, notification.message, notification.type, notification.related_to, notification.related_id]
        );
      }
    }

    const [comment] = await pool.query(
      `SELECT c.*, u.name as user_name, u.role as user_role, u.profile_image
       FROM request_comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?`,
      [result.insertId]
    );

    res.json({ success: true, data: comment[0] });
  } catch (error) {
    console.error('Post comment error:', error);
    res.status(500).json({ success: false, message: 'Failed to post comment' });
  }
});

// ═══════════════════════════════════════════════════════════════
// REJECTION TEMPLATES
// ═══════════════════════════════════════════════════════════════

// GET /api/features/rejection-templates
router.get('/rejection-templates', isStaffOrHOD, async (req, res) => {
  try {
    const [templates] = await pool.query(
      'SELECT * FROM rejection_templates ORDER BY usage_count DESC'
    );
    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch templates' });
  }
});

// POST /api/features/rejection-templates
router.post('/rejection-templates', isStaffOrHOD, [
  body('title').notEmpty().trim().escape(),
  body('message').notEmpty().trim(),
  body('category').optional().isIn(['missing_docs', 'fake_event', 'date_conflict', 'policy', 'other']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { title, message, category } = req.body;
    const [result] = await pool.query(
      'INSERT INTO rejection_templates (title, message, category, created_by) VALUES (?, ?, ?, ?)',
      [title, message, category || 'other', req.user.id]
    );
    res.json({ success: true, data: { id: result.insertId, title, message, category } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create template' });
  }
});

// PUT /api/features/rejection-templates/:id/use - Increment usage count
router.put('/rejection-templates/:id/use', isStaffOrHOD, async (req, res) => {
  try {
    await pool.query('UPDATE rejection_templates SET usage_count = usage_count + 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update template' });
  }
});

// DELETE /api/features/rejection-templates/:id
router.delete('/rejection-templates/:id', isHOD, async (req, res) => {
  try {
    await pool.query('DELETE FROM rejection_templates WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete template' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GRIEVANCE / APPEAL SYSTEM
// ═══════════════════════════════════════════════════════════════

// POST /api/features/grievances - Student files a grievance
router.post('/grievances', isStudent, [
  body('entity_type').isIn(['od_request', 'leave_request']),
  body('entity_id').isInt(),
  body('reason').notEmpty().trim().isLength({ min: 20 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { entity_type, entity_id, reason } = req.body;
    const grievance_id = `GRV-${uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase()}`;

    // Verify the request belongs to the student and is rejected
    const table = entity_type === 'od_request' ? 'od_requests' : 'leave_requests';
    const statusCol = entity_type === 'od_request' ? 'status' : 'status';
    const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ? AND student_id = ?`, [parseInt(entity_id), req.user.id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (!['rejected', 'staff_rejected'].includes(rows[0].status)) {
      return res.status(400).json({ success: false, message: 'Can only appeal rejected requests' });
    }

    // Check for existing open grievance
    const [existing] = await pool.query(
      `SELECT id FROM grievances WHERE entity_type = ? AND entity_id = ? AND status IN ('open','under_review')`,
      [entity_type, parseInt(entity_id)]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'An appeal is already in progress for this request' });
    }

    const [result] = await pool.query(
      `INSERT INTO grievances (grievance_id, entity_type, entity_id, student_id, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [grievance_id, entity_type, parseInt(entity_id), req.user.id, reason]
    );

    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'GRIEVANCE_FILED', ?, ?, ?)`,
      [req.user.id, entity_type, parseInt(entity_id), JSON.stringify({ grievance_id, reason: reason.substring(0, 100) })]
    );

    res.json({ success: true, message: 'Appeal submitted successfully', data: { id: result.insertId, grievance_id } });
  } catch (error) {
    console.error('File grievance error:', error);
    res.status(500).json({ success: false, message: 'Failed to file appeal' });
  }
});

// GET /api/features/grievances - Get grievances
router.get('/grievances', async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query_str = `
      SELECT g.*, u.name as student_name, u.employee_id as student_roll,
             u.department as student_department, r.name as resolver_name
      FROM grievances g
      JOIN users u ON g.student_id = u.id
      LEFT JOIN users r ON g.resolved_by = r.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'student') {
      query_str += ' AND g.student_id = ?';
      params.push(req.user.id);
    }

    if (status) {
      query_str += ' AND g.status = ?';
      params.push(status);
    }

    query_str += ' ORDER BY g.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [grievances] = await pool.query(query_str, params);

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM grievances WHERE ${req.user.role === 'student' ? 'student_id = ?' : '1=1'}`,
      req.user.role === 'student' ? [req.user.id] : []
    );

    res.json({
      success: true,
      data: grievances,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: countResult[0].total }
    });
  } catch (error) {
    console.error('Get grievances error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch grievances' });
  }
});

// PUT /api/features/grievances/:id/resolve - HOD resolves grievance
router.put('/grievances/:id/resolve', isHOD, [
  body('status').isIn(['resolved', 'dismissed']),
  body('resolution_notes').notEmpty().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { status, resolution_notes } = req.body;

    const [grievance] = await pool.query('SELECT * FROM grievances WHERE id = ?', [req.params.id]);
    if (grievance.length === 0) return res.status(404).json({ success: false, message: 'Grievance not found' });

    await pool.query(
      `UPDATE grievances SET status = ?, resolved_by = ?, resolution_notes = ?, resolved_at = NOW() WHERE id = ?`,
      [status, req.user.id, resolution_notes, req.params.id]
    );

    // If resolved, reopen the original request for re-review
    if (status === 'resolved') {
      const g = grievance[0];
      const table = g.entity_type === 'od_request' ? 'od_requests' : 'leave_requests';
      const newStatus = g.entity_type === 'od_request' ? 'pending' : 'pending';
      await pool.query(`UPDATE ${table} SET status = ? WHERE id = ?`, [newStatus, g.entity_id]);
    }

    // Notify student
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, related_to, related_id)
       VALUES (?, ?, ?, 'info', 'grievance', ?)`,
      [grievance[0].student_id, `Appeal ${status === 'resolved' ? 'Accepted' : 'Dismissed'}`,
       status === 'resolved' ? 'Your appeal has been accepted. Your request has been reopened for review.' : `Your appeal has been dismissed. Reason: ${resolution_notes}`,
       req.params.id]
    );

    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, 'grievance', ?, ?)`,
      [req.user.id, status === 'resolved' ? 'GRIEVANCE_RESOLVED' : 'GRIEVANCE_DISMISSED', req.params.id, JSON.stringify({ resolution_notes })]
    );

    res.json({ success: true, message: `Grievance ${status}` });
  } catch (error) {
    console.error('Resolve grievance error:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve grievance' });
  }
});

// ═══════════════════════════════════════════════════════════════
// LEAVE BALANCE / QUOTA
// ═══════════════════════════════════════════════════════════════

// GET /api/features/leave-balance
router.get('/leave-balance', async (req, res) => {
  try {
    const studentId = req.query.student_id || req.user.id;
    const academicYear = req.query.year || new Date().getFullYear().toString();

    // Auto-create if not exists
    await pool.query(
      `INSERT IGNORE INTO leave_balances (student_id, academic_year) VALUES (?, ?)`,
      [studentId, academicYear]
    );

    const [balance] = await pool.query(
      'SELECT * FROM leave_balances WHERE student_id = ? AND academic_year = ?',
      [studentId, academicYear]
    );

    // Also get OD days used
    const [odCount] = await pool.query(
      `SELECT COALESCE(SUM(DATEDIFF(event_end_date, event_start_date) + 1), 0) as od_days
       FROM od_requests WHERE student_id = ? AND status = 'approved'
       AND YEAR(event_start_date) = ?`,
      [studentId, academicYear]
    );

    const data = balance[0] || {};
    data.od_used = odCount[0]?.od_days || 0;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leave balance' });
  }
});

// PUT /api/features/leave-balance/:studentId - HOD updates balance
router.put('/leave-balance/:studentId', isHOD, async (req, res) => {
  try {
    const { academic_year, sick_total, casual_total, emergency_total, medical_total, od_total } = req.body;
    const year = academic_year || new Date().getFullYear().toString();

    await pool.query(
      `INSERT INTO leave_balances (student_id, academic_year, sick_total, casual_total, emergency_total, medical_total, od_total)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE sick_total=VALUES(sick_total), casual_total=VALUES(casual_total),
       emergency_total=VALUES(emergency_total), medical_total=VALUES(medical_total), od_total=VALUES(od_total)`,
      [req.params.studentId, year, sick_total || 10, casual_total || 5, emergency_total || 3, medical_total || 15, od_total || 20]
    );

    res.json({ success: true, message: 'Leave balance updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update leave balance' });
  }
});

// ═══════════════════════════════════════════════════════════════
// AUTO-APPROVAL RULES
// ═══════════════════════════════════════════════════════════════

// GET /api/features/auto-rules
router.get('/auto-rules', isHOD, async (req, res) => {
  try {
    const [rules] = await pool.query(
      'SELECT r.*, u.name as created_by_name FROM auto_approval_rules r JOIN users u ON r.created_by = u.id ORDER BY r.created_at DESC'
    );
    // Parse JSON conditions
    const parsed = rules.map(r => ({ ...r, conditions: typeof r.conditions === 'string' ? JSON.parse(r.conditions) : r.conditions }));
    res.json({ success: true, data: parsed });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch rules' });
  }
});

// POST /api/features/auto-rules
router.post('/auto-rules', isHOD, [
  body('name').notEmpty().trim().escape(),
  body('conditions').isObject(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { name, description, rule_type, conditions } = req.body;
    const [result] = await pool.query(
      'INSERT INTO auto_approval_rules (name, description, rule_type, conditions, created_by) VALUES (?, ?, ?, ?, ?)',
      [name, description || '', rule_type || 'both', JSON.stringify(conditions), req.user.id]
    );
    res.json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create rule' });
  }
});

// PUT /api/features/auto-rules/:id/toggle
router.put('/auto-rules/:id/toggle', isHOD, async (req, res) => {
  try {
    await pool.query('UPDATE auto_approval_rules SET is_active = NOT is_active WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Rule toggled' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to toggle rule' });
  }
});

// DELETE /api/features/auto-rules/:id
router.delete('/auto-rules/:id', isHOD, async (req, res) => {
  try {
    await pool.query('DELETE FROM auto_approval_rules WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete rule' });
  }
});

// ═══════════════════════════════════════════════════════════════
// BULK APPROVE/REJECT (HOD)
// ═══════════════════════════════════════════════════════════════

// PUT /api/features/bulk-approve
router.put('/bulk-approve', isHOD, [
  body('ids').isArray({ min: 1 }),
  body('type').isIn(['od', 'leave']),
  body('comments').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { ids, type, comments } = req.body;
    let successCount = 0;

    for (const id of ids) {
      try {
        if (type === 'od') {
          const [rows] = await pool.query('SELECT * FROM od_requests WHERE id = ? AND status = ?', [id, 'hod_review']);
          if (rows.length > 0) {
            await pool.query(
              `UPDATE od_requests SET status = 'approved', hod_id = ?, hod_comments = ?, hod_reviewed_at = NOW() WHERE id = ?`,
              [req.user.id, comments || 'Bulk approved', id]
            );
            successCount++;
          }
        } else {
          const [rows] = await pool.query('SELECT * FROM leave_requests WHERE id = ? AND status = ?', [id, 'staff_approved']);
          if (rows.length > 0) {
            await pool.query(
              `UPDATE leave_requests SET status = 'approved', hod_remarks = ?, hod_reviewed_at = NOW(), hod_id = ? WHERE id = ?`,
              [comments || 'Bulk approved', req.user.id, id]
            );
            successCount++;
          }
        }
      } catch (e) { /* skip individual failures */ }
    }

    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'BULK_APPROVE', ?, 0, ?)`,
      [req.user.id, type === 'od' ? 'od_request' : 'leave_request', JSON.stringify({ count: successCount, ids })]
    );

    res.json({ success: true, message: `${successCount} of ${ids.length} requests approved` });
  } catch (error) {
    console.error('Bulk approve error:', error);
    res.status(500).json({ success: false, message: 'Failed to bulk approve' });
  }
});

// PUT /api/features/bulk-reject
router.put('/bulk-reject', isHOD, [
  body('ids').isArray({ min: 1 }),
  body('type').isIn(['od', 'leave']),
  body('comments').notEmpty().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { ids, type, comments } = req.body;
    let successCount = 0;

    for (const id of ids) {
      try {
        if (type === 'od') {
          const [rows] = await pool.query('SELECT * FROM od_requests WHERE id = ? AND status = ?', [id, 'hod_review']);
          if (rows.length > 0) {
            await pool.query(
              `UPDATE od_requests SET status = 'rejected', hod_id = ?, hod_comments = ?, hod_reviewed_at = NOW() WHERE id = ?`,
              [req.user.id, comments, id]
            );
            successCount++;
          }
        } else {
          const [rows] = await pool.query('SELECT * FROM leave_requests WHERE id = ? AND status = ?', [id, 'staff_approved']);
          if (rows.length > 0) {
            await pool.query(
              `UPDATE leave_requests SET status = 'rejected', hod_remarks = ?, hod_reviewed_at = NOW(), hod_id = ? WHERE id = ?`,
              [comments, req.user.id, id]
            );
            successCount++;
          }
        }
      } catch (e) { /* skip individual failures */ }
    }

    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'BULK_REJECT', ?, 0, ?)`,
      [req.user.id, type === 'od' ? 'od_request' : 'leave_request', JSON.stringify({ count: successCount, ids })]
    );

    res.json({ success: true, message: `${successCount} of ${ids.length} requests rejected` });
  } catch (error) {
    console.error('Bulk reject error:', error);
    res.status(500).json({ success: false, message: 'Failed to bulk reject' });
  }
});

// ═══════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// GET /api/features/sessions
router.get('/sessions', async (req, res) => {
  try {
    const [sessions] = await pool.query(
      'SELECT id, device_info, ip_address, last_active, is_active, created_at FROM user_sessions WHERE user_id = ? AND is_active = TRUE ORDER BY last_active DESC',
      [req.user.id]
    );
    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch sessions' });
  }
});

// DELETE /api/features/sessions/:id - Revoke a session
router.delete('/sessions/:id', async (req, res) => {
  try {
    await pool.query(
      'UPDATE user_sessions SET is_active = FALSE WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Session revoked' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to revoke session' });
  }
});

// ═══════════════════════════════════════════════════════════════
// CERTIFICATE REPOSITORY
// ═══════════════════════════════════════════════════════════════

// GET /api/features/certificates
router.get('/certificates', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, student_id, verified } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query_str = `
      SELECT cr.*, u.name as student_name, u.employee_id as student_roll, u.department
      FROM certificate_repository cr
      JOIN users u ON cr.student_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'student') {
      query_str += ' AND cr.student_id = ?';
      params.push(req.user.id);
    }

    if (search) {
      query_str += ' AND (cr.title LIKE ? OR cr.event_name LIKE ? OR u.name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    if (student_id) {
      query_str += ' AND cr.student_id = ?';
      params.push(parseInt(student_id));
    }

    if (verified !== undefined) {
      query_str += ' AND cr.is_verified = ?';
      params.push(verified === 'true' ? 1 : 0);
    }

    query_str += ' ORDER BY cr.uploaded_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [certs] = await pool.query(query_str, params);
    res.json({ success: true, data: certs });
  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch certificates' });
  }
});

// POST /api/features/certificates
router.post('/certificates', uploadDocuments, async (req, res) => {
  try {
    const { title, event_name, event_date, certificate_type, od_request_id, result_id } = req.body;
    const certificate_url = req.files?.[0]?.path || req.body.certificate_url;

    if (!certificate_url) {
      return res.status(400).json({ success: false, message: 'Certificate file or URL required' });
    }

    const [result] = await pool.query(
      `INSERT INTO certificate_repository (student_id, od_request_id, result_id, title, event_name, event_date, certificate_url, certificate_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, od_request_id || null, result_id || null, title, event_name || '', event_date || null, certificate_url, certificate_type || 'participation']
    );

    res.json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    console.error('Upload certificate error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload certificate' });
  }
});

// PUT /api/features/certificates/:id/verify
router.put('/certificates/:id/verify', isStaffOrHOD, async (req, res) => {
  try {
    await pool.query(
      'UPDATE certificate_repository SET is_verified = TRUE, verified_by = ?, verified_at = NOW() WHERE id = ?',
      [req.user.id, req.params.id]
    );
    res.json({ success: true, message: 'Certificate verified' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to verify certificate' });
  }
});

// ═══════════════════════════════════════════════════════════════
// AUDIT LOG EXPORT
// ═══════════════════════════════════════════════════════════════

// GET /api/features/audit-export
router.get('/audit-export', isHOD, async (req, res) => {
  try {
    const { from_date, to_date, action } = req.query;
    let query_str = `
      SELECT al.*, u.name as user_name, u.role as user_role
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (from_date) {
      query_str += ' AND al.created_at >= ?';
      params.push(from_date);
    }
    if (to_date) {
      query_str += ' AND al.created_at <= ?';
      params.push(to_date + ' 23:59:59');
    }
    if (action) {
      query_str += ' AND al.action = ?';
      params.push(action);
    }

    query_str += ' ORDER BY al.created_at DESC LIMIT 5000';
    const [logs] = await pool.query(query_str, params);

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to export audit logs' });
  }
});

// ═══════════════════════════════════════════════════════════════
// ENHANCED REPORTS WITH DATE RANGE
// ═══════════════════════════════════════════════════════════════

// GET /api/features/reports/enhanced
router.get('/reports/enhanced', isHOD, async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const dateFilter = from_date && to_date ? 'AND od.created_at BETWEEN ? AND ?' : '';
    const dateParams = from_date && to_date ? [from_date, to_date + ' 23:59:59'] : [];

    // Monthly trends
    const [monthlyTrends] = await pool.query(
      `SELECT DATE_FORMAT(od.created_at, '%Y-%m') as month,
              COUNT(*) as total,
              SUM(CASE WHEN od.status = 'approved' THEN 1 ELSE 0 END) as approved,
              SUM(CASE WHEN od.status IN ('rejected','staff_rejected') THEN 1 ELSE 0 END) as rejected,
              SUM(CASE WHEN od.status IN ('pending','staff_review','hod_review') THEN 1 ELSE 0 END) as pending
       FROM od_requests od WHERE 1=1 ${dateFilter}
       GROUP BY month ORDER BY month DESC LIMIT 12`,
      dateParams
    );

    // Department breakdown
    const [deptBreakdown] = await pool.query(
      `SELECT u.department, COUNT(*) as total,
              SUM(CASE WHEN od.status = 'approved' THEN 1 ELSE 0 END) as approved,
              SUM(CASE WHEN od.status IN ('rejected','staff_rejected') THEN 1 ELSE 0 END) as rejected
       FROM od_requests od JOIN users u ON od.student_id = u.id
       WHERE u.department IS NOT NULL ${dateFilter ? dateFilter.replace('od.created_at', 'od.created_at') : ''}
       GROUP BY u.department ORDER BY total DESC`,
      dateParams
    );

    // Event type distribution
    const [eventTypes] = await pool.query(
      `SELECT od.event_type, COUNT(*) as count
       FROM od_requests od WHERE 1=1 ${dateFilter}
       GROUP BY od.event_type ORDER BY count DESC`,
      dateParams
    );

    // Staff performance
    const [staffPerf] = await pool.query(
      `SELECT u.name as staff_name, u.id as staff_id,
              COUNT(*) as reviewed,
              SUM(CASE WHEN od.status IN ('hod_review','approved') THEN 1 ELSE 0 END) as forwarded,
              SUM(CASE WHEN od.status = 'staff_rejected' THEN 1 ELSE 0 END) as rejected,
              ROUND(AVG(TIMESTAMPDIFF(HOUR, od.created_at, od.staff_reviewed_at)), 1) as avg_review_hours
       FROM od_requests od JOIN users u ON od.staff_id = u.id
       WHERE od.staff_id IS NOT NULL ${dateFilter}
       GROUP BY u.id, u.name ORDER BY reviewed DESC`,
      dateParams
    );

    // Top students
    const [topStudents] = await pool.query(
      `SELECT u.name, u.employee_id, u.department, COUNT(*) as total_requests,
              SUM(CASE WHEN od.status = 'approved' THEN 1 ELSE 0 END) as approved
       FROM od_requests od JOIN users u ON od.student_id = u.id
       WHERE 1=1 ${dateFilter}
       GROUP BY u.id, u.name, u.employee_id, u.department
       ORDER BY total_requests DESC LIMIT 10`,
      dateParams
    );

    // SLA metrics
    const [slaMetrics] = await pool.query(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN is_escalated = TRUE THEN 1 ELSE 0 END) as escalated,
         ROUND(AVG(TIMESTAMPDIFF(HOUR, created_at, COALESCE(hod_reviewed_at, staff_reviewed_at, NOW()))), 1) as avg_resolution_hours
       FROM od_requests WHERE 1=1 ${dateFilter}`,
      dateParams
    );

    // Event success rate by department
    const [deptSuccess] = await pool.query(
      `SELECT u.department,
              COUNT(DISTINCT er.id) as results_count,
              SUM(CASE WHEN er.result_type = 'winner' THEN 1 ELSE 0 END) as winners,
              SUM(CASE WHEN er.result_type = 'runner_up' THEN 1 ELSE 0 END) as runners_up,
              SUM(COALESCE(er.prize_amount, 0)) as total_prize
       FROM event_results er
       JOIN users u ON er.student_id = u.id
       WHERE u.department IS NOT NULL
       GROUP BY u.department ORDER BY winners DESC`
    );

    // Comparative: this month vs last month
    const [comparison] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM od_requests WHERE MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())) as this_month_total,
        (SELECT COUNT(*) FROM od_requests WHERE MONTH(created_at) = MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH)) AND YEAR(created_at) = YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH))) as last_month_total,
        (SELECT COUNT(*) FROM od_requests WHERE status = 'approved' AND MONTH(hod_reviewed_at) = MONTH(NOW()) AND YEAR(hod_reviewed_at) = YEAR(NOW())) as this_month_approved,
        (SELECT COUNT(*) FROM od_requests WHERE status = 'approved' AND MONTH(hod_reviewed_at) = MONTH(DATE_SUB(NOW(), INTERVAL 1 MONTH)) AND YEAR(hod_reviewed_at) = YEAR(DATE_SUB(NOW(), INTERVAL 1 MONTH))) as last_month_approved
    `);

    res.json({
      success: true,
      data: {
        monthlyTrends,
        deptBreakdown,
        eventTypes,
        staffPerf,
        topStudents,
        slaMetrics: slaMetrics[0],
        deptSuccess,
        comparison: comparison[0]
      }
    });
  } catch (error) {
    console.error('Enhanced reports error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate reports' });
  }
});

// ═══════════════════════════════════════════════════════════════
// BATCH USER IMPORT
// ═══════════════════════════════════════════════════════════════

router.post('/bulk-import-users', isHOD, async (req, res) => {
  try {
    const { users } = req.body;
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ success: false, message: 'No users provided' });
    }

    const bcrypt = (await import('bcryptjs')).default;
    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const u of users) {
      try {
        if (!u.email || !u.name || !u.role) {
          errors.push(`Skipped: Missing required fields for ${u.email || 'unknown'}`);
          skipped++;
          continue;
        }

        // Check if user exists
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [u.email]);
        if (existing.length > 0) {
          errors.push(`Skipped: ${u.email} already exists`);
          skipped++;
          continue;
        }

        const password = u.password || 'eventpass@123';
        const hashedPassword = await bcrypt.hash(password, 10);
        const employeeId = u.employee_id || u.roll_number || `EP${Date.now().toString(36).toUpperCase()}`;

        await pool.query(
          `INSERT INTO users (employee_id, email, password, name, role, department, year_of_study, section, phone)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [employeeId, u.email, hashedPassword, u.name, u.role, u.department || null, u.year_of_study || null, u.section || null, u.phone || null]
        );
        imported++;
      } catch (e) {
        errors.push(`Error importing ${u.email}: ${e.message}`);
        skipped++;
      }
    }

    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'HOD_BULK_IMPORT', 'user', 0, ?)`,
      [req.user.id, JSON.stringify({ imported, skipped, total: users.length })]
    );

    res.json({
      success: true,
      message: `Imported ${imported} users, skipped ${skipped}`,
      data: { imported, skipped, errors: errors.slice(0, 20) }
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ success: false, message: 'Failed to bulk import users' });
  }
});

// ═══════════════════════════════════════════════════════════════
// STAFF WORKLOAD & SLA DASHBOARD
// ═══════════════════════════════════════════════════════════════

// GET /api/features/staff-workload
router.get('/staff-workload', isHOD, async (req, res) => {
  try {
    const [workload] = await pool.query(`
      SELECT u.id, u.name, u.department,
             (SELECT COUNT(*) FROM od_requests WHERE staff_id = u.id AND status IN ('staff_review','pending') AND staff_reviewed_at IS NULL) as pending_od,
             (SELECT COUNT(*) FROM leave_requests WHERE staff_id = u.id AND status = 'pending') as pending_leave,
             (SELECT COUNT(*) FROM od_requests WHERE staff_id = u.id AND staff_reviewed_at IS NOT NULL AND DATE(staff_reviewed_at) = CURDATE()) as reviewed_today,
             (SELECT ROUND(AVG(TIMESTAMPDIFF(HOUR, created_at, staff_reviewed_at)), 1) FROM od_requests WHERE staff_id = u.id AND staff_reviewed_at IS NOT NULL) as avg_review_hours
      FROM users u WHERE u.role = 'staff' AND u.is_active = TRUE
      ORDER BY pending_od DESC
    `);

    // Escalated requests
    const [escalated] = await pool.query(`
      SELECT od.*, u.name as student_name, u.employee_id as student_roll
      FROM od_requests od JOIN users u ON od.student_id = u.id
      WHERE od.is_escalated = TRUE AND od.status IN ('pending','staff_review','hod_review')
      ORDER BY od.created_at ASC LIMIT 20
    `);

    res.json({ success: true, data: { workload, escalated } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch workload' });
  }
});

// ═══════════════════════════════════════════════════════════════
// STUDENT OF THE MONTH
// ═══════════════════════════════════════════════════════════════

// GET /api/features/student-of-month - current + history
router.get('/student-of-month', async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const m = month ? parseInt(month) : now.getMonth() + 1;
    const y = year ? parseInt(year) : now.getFullYear();

    // Current month's student
    const [current] = await pool.query(`
      SELECT sm.*, u.name, u.employee_id, u.department, u.year_of_study,
             u.section, u.profile_image, u.email,
             sel.name as selected_by_name
      FROM student_of_month sm
      JOIN users u ON sm.student_id = u.id
      LEFT JOIN users sel ON sm.selected_by = sel.id
      WHERE sm.month = ? AND sm.year = ?
      ORDER BY sm.created_at DESC
    `, [m, y]);

    // Past 12 months history
    const [history] = await pool.query(`
      SELECT sm.*, u.name, u.employee_id, u.department, u.year_of_study,
             u.section, u.profile_image
      FROM student_of_month sm
      JOIN users u ON sm.student_id = u.id
      ORDER BY sm.year DESC, sm.month DESC
      LIMIT 12
    `);

    res.json({ success: true, data: { current, history } });
  } catch (error) {
    console.error('Get student of month error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch student of the month' });
  }
});

// POST /api/features/student-of-month - Select student of the month (HOD)
router.post('/student-of-month', isHOD, [
  body('student_id').isInt(),
  body('month').isInt({ min: 1, max: 12 }),
  body('year').isInt({ min: 2020, max: 2099 }),
  body('achievement').notEmpty().trim(),
  body('reason').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { student_id, month, year, achievement, reason } = req.body;

    // Get student details for department
    const [students] = await pool.query('SELECT department FROM users WHERE id = ? AND role = ?', [student_id, 'student']);
    if (students.length === 0) return res.status(404).json({ success: false, message: 'Student not found' });

    // Upsert — replace if exists for that month/dept
    await pool.query(`
      INSERT INTO student_of_month (student_id, month, year, achievement, reason, department, selected_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE student_id = VALUES(student_id), achievement = VALUES(achievement),
        reason = VALUES(reason), selected_by = VALUES(selected_by)
    `, [student_id, month, year, achievement, reason || null, students[0].department, req.user.id]);

    res.json({ success: true, message: 'Student of the Month selected successfully' });
  } catch (error) {
    console.error('Select student of month error:', error);
    res.status(500).json({ success: false, message: 'Failed to select student of the month' });
  }
});

// GET /api/features/student-of-month/top5 - Top 5 students (most wins) for HOD to pick from
router.get('/student-of-month/top5', async (req, res) => {
  try {
    const [top5] = await pool.query(`
      SELECT u.id, u.name, u.employee_id, u.department, u.year_of_study,
             u.section, u.profile_image,
             COUNT(*) as total_results,
             SUM(CASE WHEN er.result_type = 'winner' THEN 1 ELSE 0 END) as wins,
             SUM(CASE WHEN er.result_type = 'runner_up' THEN 1 ELSE 0 END) as runner_ups,
             GROUP_CONCAT(DISTINCT od.event_name SEPARATOR ', ') as events
      FROM event_results er
      JOIN users u ON er.student_id = u.id
      JOIN od_requests od ON er.od_request_id = od.id
      WHERE er.result_type IN ('winner','runner_up','finalist')
      GROUP BY u.id ORDER BY wins DESC, total_results DESC LIMIT 5
    `);
    res.json({ success: true, data: top5 });
  } catch (error) {
    console.error('Get top 5 students error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch top students' });
  }
});

// DELETE /api/features/student-of-month/:id - Delete a SOTM entry (HOD)
router.delete('/student-of-month/:id', isHOD, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
    await pool.query('DELETE FROM student_of_month WHERE id = ?', [id]);
    res.json({ success: true, message: 'Student of the Month entry deleted' });
  } catch (error) {
    console.error('Delete student of month error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete entry' });
  }
});

// DELETE /api/features/student-of-month - Reset ALL SOTM entries (HOD)
router.delete('/student-of-month', isHOD, async (req, res) => {
  try {
    await pool.query('DELETE FROM student_of_month');
    res.json({ success: true, message: 'All Student of the Month data has been reset' });
  } catch (error) {
    console.error('Reset student of month error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset data' });
  }
});

// POST /api/features/student-of-month/seed-demo - Seed dummy data (HOD)
router.post('/student-of-month/seed-demo', isHOD, async (req, res) => {
  try {
    const [students] = await pool.query(
      "SELECT id, name, department, year_of_study, section FROM users WHERE role = 'student' AND is_active = TRUE LIMIT 10"
    );
    if (students.length === 0) {
      return res.status(400).json({ success: false, message: 'No students found in the system to seed' });
    }

    const now = new Date();
    const achievements = [
      'Outstanding academic performance and leadership in department activities',
      'Won first place in National Level Hackathon and mentored juniors',
      'Excellence in sports and cultural events across multiple competitions',
      'Best paper presentation at International Conference on AI/ML',
      'Led the team to victory in Smart India Hackathon 2025',
      'Active participation in community service and social initiatives',
    ];
    const eventNames = ['National Hackathon 2025', 'Smart India Hackathon', 'TechFest 2025', 'IEEE Conference', 'Code Sprint 2025', 'Robotics Championship'];
    const eventTypes = ['hackathon', 'hackathon', 'symposium', 'conference', 'hackathon', 'other'];
    const resultTypes = ['winner', 'winner', 'runner_up', 'winner', 'runner_up', 'finalist'];
    const prizeAmounts = [5000, 10000, 3000, 7500, 2000, 1000];

    // Seed OD requests + event results so top-5 list works
    for (let i = 0; i < Math.min(students.length, 6); i++) {
      const s = students[i];
      for (let j = 0; j < 2; j++) {
        const idx = (i * 2 + j) % eventNames.length;
        const requestId = `OD-SEED-${Date.now()}-${i}-${j}`;
        try {
          const [odResult] = await pool.query(
            `INSERT INTO od_requests (request_id, student_id, event_name, event_type, venue, location_city, location_state,
              event_start_date, event_end_date, status, event_description, organizer_name)
            VALUES (?, ?, ?, ?, 'Convention Center', 'Chennai', 'Tamil Nadu', ?, ?, 'approved', ?, 'SMVEC')`,
            [requestId, s.id, eventNames[idx], eventTypes[idx], '2025-01-15', '2025-01-17', `Demo event for seeding`]
          );
          await pool.query(
            `INSERT INTO event_results (od_request_id, student_id, result_type, prize_amount, achievement_description, submitted_at)
             VALUES (?, ?, ?, ?, 'Excellent performance', NOW() - INTERVAL ? DAY)`,
            [odResult.insertId, s.id, resultTypes[(i + j) % resultTypes.length], prizeAmounts[(i + j) % prizeAmounts.length], i * 15]
          );
        } catch {}
      }
    }

    // Seed SOTM entries for past months
    await pool.query('DELETE FROM student_of_month');
    for (let i = 0; i < Math.min(students.length, 6); i++) {
      const s = students[i];
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      try {
        await pool.query(
          `INSERT INTO student_of_month (student_id, month, year, achievement, department, selected_by) VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE student_id = VALUES(student_id), achievement = VALUES(achievement)`,
          [s.id, date.getMonth() + 1, date.getFullYear(), achievements[i % achievements.length], s.department, req.user.id]
        );
      } catch {}
    }

    res.json({ success: true, message: `Seeded demo data: event results + ${Math.min(students.length, 6)} Student of the Month entries` });
  } catch (error) {
    console.error('Seed SOTM error:', error);
    res.status(500).json({ success: false, message: 'Failed to seed dummy data' });
  }
});

// ═══════════════════════════════════════════════════════════════
// PUBLIC ACHIEVEMENT GALLERY (no auth required — handled separately)
// ═══════════════════════════════════════════════════════════════

// GET /api/features/hall-of-fame
router.get('/hall-of-fame', async (req, res) => {
  try {
    const { year } = req.query;
    const yearFilter = year ? 'AND YEAR(er.submitted_at) = ?' : '';
    const yearParams = year ? [parseInt(year)] : [];

    const [hallOfFame] = await pool.query(`
      SELECT u.name, u.department, u.employee_id, u.profile_image,
             COUNT(*) as total_results,
             SUM(CASE WHEN er.result_type = 'winner' THEN 1 ELSE 0 END) as wins,
             SUM(CASE WHEN er.result_type = 'runner_up' THEN 1 ELSE 0 END) as runner_ups,
             SUM(COALESCE(er.prize_amount, 0)) as total_prize,
             GROUP_CONCAT(DISTINCT od.event_name SEPARATOR ', ') as events
      FROM event_results er
      JOIN users u ON er.student_id = u.id
      JOIN od_requests od ON er.od_request_id = od.id
      WHERE er.result_type IN ('winner','runner_up','finalist') ${yearFilter}
      GROUP BY u.id ORDER BY wins DESC, total_prize DESC LIMIT 25
    `, yearParams);

    // Department stats
    const [deptStats] = await pool.query(`
      SELECT u.department,
             COUNT(*) as total_achievements,
             SUM(CASE WHEN er.result_type = 'winner' THEN 1 ELSE 0 END) as wins,
             SUM(COALESCE(er.prize_amount, 0)) as total_prize
      FROM event_results er JOIN users u ON er.student_id = u.id
      WHERE u.department IS NOT NULL ${yearFilter}
      GROUP BY u.department ORDER BY wins DESC
    `, yearParams);

    res.json({ success: true, data: { hallOfFame, deptStats } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch hall of fame' });
  }
});

// ═══════════════════════════════════════════════════════════════
// ROLL NUMBER AUTO-POPULATE
// ═══════════════════════════════════════════════════════════════

// GET /api/features/lookup-student?roll=XXX
router.get('/lookup-student', async (req, res) => {
  try {
    const { roll, email } = req.query;
    if (!roll && !email) return res.status(400).json({ success: false, message: 'Provide roll or email' });

    let query_str = 'SELECT id, name, email, employee_id, department, year_of_study, section, phone FROM users WHERE role = ? AND is_active = TRUE AND ';
    const params = ['student'];

    if (roll) {
      query_str += 'employee_id = ?';
      params.push(roll);
    } else {
      query_str += 'email = ?';
      params.push(email);
    }

    const [users] = await pool.query(query_str, params);
    if (users.length === 0) {
      return res.json({ success: false, message: 'Student not found' });
    }

    res.json({ success: true, data: users[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to lookup student' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DUPLICATE OD DETECTION
// ═══════════════════════════════════════════════════════════════

// GET /api/features/check-duplicate
router.get('/check-duplicate', isStudent, async (req, res) => {
  try {
    const { event_name, event_start_date, event_end_date } = req.query;

    const [duplicates] = await pool.query(
      `SELECT id, request_id, event_name, event_start_date, event_end_date, status
       FROM od_requests
       WHERE student_id = ? AND status NOT IN ('rejected','staff_rejected','draft')
       AND (
         (event_start_date <= ? AND event_end_date >= ?)
         OR (event_name = ? AND ABS(DATEDIFF(event_start_date, ?)) < 3)
       )`,
      [req.user.id, event_end_date, event_start_date, event_name, event_start_date]
    );

    res.json({
      success: true,
      hasDuplicate: duplicates.length > 0,
      data: duplicates
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to check duplicates' });
  }
});

// ═══════════════════════════════════════════════════════════════
// iCAL EXPORT
// ═══════════════════════════════════════════════════════════════

// GET /api/features/calendar-export
router.get('/calendar-export', async (req, res) => {
  try {
    const [events] = await pool.query(
      `SELECT od.event_name, od.venue, od.event_start_date, od.event_end_date,
              od.event_start_time, od.event_end_time, od.event_type, od.status
       FROM od_requests od
       WHERE od.student_id = ? AND od.status IN ('approved','hod_review','staff_approved')
       ORDER BY od.event_start_date`,
      [req.user.id]
    );

    // Generate iCal format
    let ical = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//EventPass//Calendar//EN\r\n';

    for (const event of events) {
      const startDate = new Date(event.event_start_date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endDate = new Date(event.event_end_date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const uid = `${startDate}-${event.event_name.replace(/\s/g, '')}@eventpass`;

      ical += `BEGIN:VEVENT\r\n`;
      ical += `UID:${uid}\r\n`;
      ical += `DTSTART:${startDate}\r\n`;
      ical += `DTEND:${endDate}\r\n`;
      ical += `SUMMARY:${event.event_name}\r\n`;
      ical += `LOCATION:${event.venue || ''}\r\n`;
      ical += `DESCRIPTION:Event Type: ${event.event_type}\\nStatus: ${event.status}\r\n`;
      ical += `END:VEVENT\r\n`;
    }

    ical += 'END:VCALENDAR';

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=eventpass-calendar.ics');
    res.send(ical);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to export calendar' });
  }
});

// ═══════════════════════════════════════════════════════════════
// GEOFENCING SETTINGS
// ═══════════════════════════════════════════════════════════════

// PUT /api/features/geofence/:requestId
router.put('/geofence/:requestId', isStaffOrHOD, async (req, res) => {
  try {
    const { venue_latitude, venue_longitude, venue_radius_meters } = req.body;
    await pool.query(
      `UPDATE od_requests SET venue_latitude = ?, venue_longitude = ?, venue_radius_meters = ? WHERE id = ?`,
      [venue_latitude, venue_longitude, venue_radius_meters || 5000, req.params.requestId]
    );
    res.json({ success: true, message: 'Geofence updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update geofence' });
  }
});

export default router;
