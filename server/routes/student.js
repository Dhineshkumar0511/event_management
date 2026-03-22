import express from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';
import pool from '../database/connection.js';
import { notifyODSubmitted, isAutoEnabled } from '../services/notificationService.js';
import { authenticate, isStudent } from '../middleware/auth.js';
import { uploadDocuments, cloudinary } from '../middleware/upload.js';

const router = express.Router();

const trimToNull = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
};

const normalizeTeamMember = (member = {}) => ({
  name: trimToNull(member.name),
  email: trimToNull(member.email),
  register_number: trimToNull(member.register_number),
  department: trimToNull(member.department),
  year_of_study: trimToNull(member.year_of_study),
  section: trimToNull(member.section),
  phone: trimToNull(member.phone),
});

const hasAnyTeamMemberValue = (member = {}) => Object.values(normalizeTeamMember(member)).some(Boolean);

const parseTeamMembers = (rawTeamMembers) => {
  if (!rawTeamMembers) return [];

  const parsed = typeof rawTeamMembers === 'string'
    ? JSON.parse(rawTeamMembers)
    : rawTeamMembers;

  if (!Array.isArray(parsed)) {
    throw new Error('Team members payload must be an array');
  }

  return parsed
    .map(normalizeTeamMember)
    .filter(hasAnyTeamMemberValue);
};

// Helper function to delete files from Cloudinary
// Accepts URL strings OR doc objects {name, path, size} / {url} / {secure_url}
const deleteCloudinaryFiles = async (fileUrls = []) => {
  if (!Array.isArray(fileUrls) || fileUrls.length === 0) return;
  
  for (const entry of fileUrls) {
    try {
      // Coerce doc objects to URL strings
      const url = typeof entry === 'string' ? entry : (entry?.path || entry?.url || entry?.secure_url);
      if (!url || typeof url !== 'string') continue;
      const matches = url.match(/\/upload\/(?:v\d+\/)?(?:eventpass\/)?(.*?)(?:\.[^.]+)?$/);
      if (matches && matches[1]) {
        const publicId = `eventpass/${matches[1]}`;
        await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
        console.log(`✓ Deleted from Cloudinary: ${publicId}`);
      }
    } catch (error) {
      console.error(`Error deleting file from Cloudinary:`, error);
    }
  }
};

// Apply authentication to all routes
router.use(authenticate);

// @route   POST /api/student/od-request
// @desc    Create new OD request
// @access  Student
router.post('/od-request', isStudent, uploadDocuments, [
  body('event_name').trim().notEmpty().withMessage('Event name is required'),
  body('event_type').isIn(['hackathon', 'symposium', 'sports', 'workshop', 'conference', 'cultural', 'other']),
  body('venue').trim().notEmpty().withMessage('Venue is required'),
  body('event_start_date').isDate().withMessage('Valid start date is required'),
  body('event_end_date').isDate().withMessage('Valid end date is required'),
  body('parent_name').trim().notEmpty().withMessage('Parent name is required'),
  body('parent_phone').isMobilePhone().withMessage('Valid parent phone is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('[OD Create] Validation failed', {
        studentId: req.user?.id,
        errors: errors.array(),
        body: req.body,
      });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      event_name, event_type, event_description, organizer_name,
      organizer_contact, event_website, venue, location_city,
      location_state, event_start_date, event_end_date,
      event_start_time, event_end_time, parent_name, parent_phone,
      parent_email, emergency_contact, team_members
    } = req.body;

    let parsedTeamMembers = [];
    try {
      parsedTeamMembers = parseTeamMembers(team_members);
    } catch (parseError) {
      console.error('[OD Create] Team member parse failed', {
        studentId: req.user?.id,
        rawTeamMembers: team_members,
        message: parseError.message,
        stack: parseError.stack,
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid team member details. Please review the team section and try again.'
      });
    }

    const invalidMemberIndex = parsedTeamMembers.findIndex(member => !member.name);
    if (invalidMemberIndex !== -1) {
      return res.status(400).json({
        success: false,
        message: `Team member ${invalidMemberIndex + 1} must include a name`
      });
    }

    // Duplicate check: same student, overlapping date range, not rejected/cancelled
    const [existing] = await pool.query(
      `SELECT id, event_name, status, event_start_date, event_end_date
       FROM od_requests
       WHERE student_id = ?
         AND status NOT IN ('rejected', 'cancelled')
         AND NOT (DATE(event_end_date) < ? OR DATE(event_start_date) > ?)`,
      [req.user.id, event_start_date, event_end_date]
    );
    if (existing.length > 0) {
      const ex = existing[0];
      const fmtD = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      return res.status(409).json({
        success: false,
        message: `You already have a ${ex.status === 'hod_review' ? 'pending HOD review' : ex.status} OD request for "${ex.event_name}" on overlapping dates (${fmtD(ex.event_start_date)} – ${fmtD(ex.event_end_date)}). Please check My Requests.`,
        duplicate: true,
        existingRequestId: ex.id
      });
    }

    const requestId = `OD${uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase()}`;
    
    // Handle uploaded documents
    const supportingDocs = req.files ? req.files.map(f => ({
      name: f.originalname,
      path: f.path,
      size: f.size
    })) : [];

    // Insert OD request
    const [result] = await pool.query(
      `INSERT INTO od_requests 
       (request_id, student_id, event_name, event_type, event_description,
        organizer_name, organizer_contact, event_website, venue, location_city,
        location_state, event_start_date, event_end_date, event_start_time,
        event_end_time, parent_name, parent_phone, parent_email,
        emergency_contact, supporting_documents, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [requestId, req.user.id, event_name, event_type, event_description,
       organizer_name, organizer_contact, event_website, venue, location_city,
       location_state, event_start_date, event_end_date, event_start_time,
       event_end_time, parent_name, parent_phone, parent_email,
       emergency_contact, JSON.stringify(supportingDocs), 'pending']
    );

    const odRequestId = result.insertId;

    // Add the student as team lead
    await pool.query(
      `INSERT INTO team_members 
       (od_request_id, student_id, name, email, register_number, department, year_of_study, section, phone, is_team_lead)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [odRequestId, req.user.id, req.user.name, req.user.email, req.user.employee_id,
       req.user.department, req.user.year_of_study, req.user.section, req.user.phone, true]
    );

    // Add team members if provided
    if (parsedTeamMembers.length > 0) {
      for (const member of parsedTeamMembers) {
        await pool.query(
          `INSERT INTO team_members 
           (od_request_id, name, email, register_number, department, year_of_study, section, phone, is_team_lead)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [odRequestId, member.name, member.email, member.register_number,
           member.department, member.year_of_study, member.section, member.phone, false]
        );
      }
    }

    // Create notification for staff
    const [staffUsers] = await pool.query(
      'SELECT id FROM users WHERE role = "staff" AND department = ?',
      [req.user.department]
    );

    for (const staff of staffUsers) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, related_to, related_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [staff.id, 'New OD Request', `${req.user.name} submitted an OD request for ${event_name}`,
         'action_required', 'od_request', odRequestId]
      );
    }

    // Emit socket event
    const io = req.app.get('io');
    io.to('staff').emit('new_od_request', {
      requestId,
      studentName: req.user.name,
      eventName: event_name
    });

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'CREATE_OD_REQUEST', 'od_request', odRequestId, 
       JSON.stringify({ event_name, event_type })]
    );

    // WhatsApp / SMS notification to staff (only if auto-notifications enabled by HOD)
    if (isAutoEnabled()) {
      const [staffPhones] = await pool.query(
        'SELECT phone FROM users WHERE role = "staff" AND department = ? AND phone IS NOT NULL',
        [req.user.department]
      );
      notifyODSubmitted(
        { name: req.user.name, phone: req.user.phone, department: req.user.department },
        { event_name, event_start_date, event_end_date, request_id: requestId },
        staffPhones
      ).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: 'OD request submitted successfully',
      data: {
        id: odRequestId,
        requestId,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('[OD Create] Request failed', {
      studentId: req.user?.id,
      body: req.body,
      files: req.files?.map(file => ({
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      })),
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage,
        stack: error.stack,
      }
    });

    const errorMessage = error.code === 'ER_DATA_TOO_LONG'
      ? 'One of the submitted fields is too long. Please shorten it and try again.'
      : error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD'
      ? 'One of the submitted values has an invalid format. Please review the form and try again.'
      : 'Failed to create OD request';

    res.status(500).json({ success: false, message: errorMessage });
  }
});

// @route   GET /api/student/od-requests
// @desc    Get all OD requests for current student
// @access  Student
router.get('/od-requests', isStudent, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT od.*, 
             (SELECT COUNT(*) FROM team_members WHERE od_request_id = od.id) as team_size,
             (SELECT COUNT(*) FROM location_checkins WHERE od_request_id = od.id) as checkin_count
      FROM od_requests od
      WHERE od.student_id = ?
    `;
    const params = [req.user.id];

    if (status) {
      query += ' AND od.status = ?';
      params.push(status);
    }

    query += ' ORDER BY od.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [requests] = await pool.query(query, params);

    // Get total count
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM od_requests WHERE student_id = ?' + 
      (status ? ' AND status = ?' : ''),
      status ? [req.user.id, status] : [req.user.id]
    );

    res.json({
      success: true,
      data: requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get OD requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch OD requests' });
  }
});

// @route   GET /api/student/od-request/:id
// @desc    Get single OD request details
// @access  Student
router.get('/od-request/:id', isStudent, async (req, res) => {
  try {
    const [requests] = await pool.query(
      `SELECT od.*, 
              s.name as staff_name,
              h.name as hod_name
       FROM od_requests od
       LEFT JOIN users s ON od.staff_id = s.id
       LEFT JOIN users h ON od.hod_id = h.id
       WHERE od.id = ? AND od.student_id = ?`,
      [req.params.id, req.user.id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ success: false, message: 'OD request not found' });
    }

    // Get team members
    const [teamMembers] = await pool.query(
      'SELECT * FROM team_members WHERE od_request_id = ?',
      [req.params.id]
    );

    // Get check-ins
    const [checkins] = await pool.query(
      'SELECT * FROM location_checkins WHERE od_request_id = ? ORDER BY checkin_time',
      [req.params.id]
    );

    // Get results if any
    const [results] = await pool.query(
      'SELECT * FROM event_results WHERE od_request_id = ?',
      [req.params.id]
    );

    const req_data = requests[0];
    let supporting_documents = req_data.supporting_documents || [];
    if (typeof supporting_documents === 'string') {
      try { supporting_documents = JSON.parse(supporting_documents); } catch { supporting_documents = []; }
    }
    let ai_verification_details = req_data.ai_verification_details || {};
    if (typeof ai_verification_details === 'string') {
      try { ai_verification_details = JSON.parse(ai_verification_details); } catch { ai_verification_details = {}; }
    }

    res.json({
      success: true,
      data: {
        ...req_data,
        supporting_documents,
        ai_verification_details,
        team_members: teamMembers,
        checkins,
        result: results[0] || null
      }
    });

  } catch (error) {
    console.error('Get OD request error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch OD request' });
  }
});

// @route   PUT /api/student/od-request/:id
// @desc    Update OD request (only if draft or rejected)
// @access  Student
router.put('/od-request/:id', isStudent, uploadDocuments, async (req, res) => {
  try {
    // Check if request exists and belongs to student
    const [existing] = await pool.query(
      'SELECT * FROM od_requests WHERE id = ? AND student_id = ?',
      [req.params.id, req.user.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'OD request not found' });
    }

    if (!['draft', 'rejected', 'staff_rejected'].includes(existing[0].status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot edit request in current status' 
      });
    }

    const {
      event_name, event_type, event_description, organizer_name,
      organizer_contact, event_website, venue, location_city,
      location_state, event_start_date, event_end_date,
      event_start_time, event_end_time, parent_name, parent_phone,
      parent_email, emergency_contact, team_members
    } = req.body;

    let parsedTeamMembers = [];
    try {
      parsedTeamMembers = parseTeamMembers(team_members);
    } catch (parseError) {
      console.error('[OD Update] Team member parse failed', {
        studentId: req.user?.id,
        requestId: req.params.id,
        rawTeamMembers: team_members,
        message: parseError.message,
        stack: parseError.stack,
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid team member details. Please review the team section and try again.'
      });
    }

    const invalidMemberIndex = parsedTeamMembers.findIndex(member => !member.name);
    if (invalidMemberIndex !== -1) {
      return res.status(400).json({
        success: false,
        message: `Team member ${invalidMemberIndex + 1} must include a name`
      });
    }

    // Handle new uploaded documents
    let supportingDocs = existing[0].supporting_documents || [];
    if (typeof supportingDocs === 'string') {
      try { supportingDocs = JSON.parse(supportingDocs); } catch { supportingDocs = []; }
    }
    if (req.files && req.files.length > 0) {
      const newDocs = req.files.map(f => ({
        name: f.originalname,
        path: f.path,
        size: f.size
      }));
      supportingDocs = [...supportingDocs, ...newDocs];
    }

    await pool.query(
      `UPDATE od_requests SET
       event_name = ?, event_type = ?, event_description = ?,
       organizer_name = ?, organizer_contact = ?, event_website = ?,
       venue = ?, location_city = ?, location_state = ?,
       event_start_date = ?, event_end_date = ?, event_start_time = ?,
       event_end_time = ?, parent_name = ?, parent_phone = ?,
      parent_email = ?, emergency_contact = ?, supporting_documents = ?,
       status = 'pending', staff_comments = NULL, hod_comments = NULL
       WHERE id = ?`,
      [event_name, event_type, event_description, organizer_name,
       organizer_contact, event_website, venue, location_city,
       location_state, event_start_date, event_end_date, event_start_time,
       event_end_time, parent_name, parent_phone, parent_email,
       emergency_contact, JSON.stringify(supportingDocs), req.params.id]
    );

    await pool.query('DELETE FROM team_members WHERE od_request_id = ?', [req.params.id]);
    await pool.query(
      `INSERT INTO team_members 
       (od_request_id, student_id, name, email, register_number, department, year_of_study, section, phone, is_team_lead)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.params.id, req.user.id, req.user.name, req.user.email, req.user.employee_id,
       req.user.department, req.user.year_of_study, req.user.section, req.user.phone, true]
    );

    for (const member of parsedTeamMembers) {
      await pool.query(
        `INSERT INTO team_members 
         (od_request_id, name, email, register_number, department, year_of_study, section, phone, is_team_lead)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.params.id, member.name, member.email, member.register_number,
         member.department, member.year_of_study, member.section, member.phone, false]
      );
    }

    res.json({
      success: true,
      message: 'OD request updated and resubmitted'
    });

  } catch (error) {
    console.error('[OD Update] Request failed', {
      studentId: req.user?.id,
      requestId: req.params.id,
      body: req.body,
      files: req.files?.map(file => ({
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      })),
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage,
        stack: error.stack,
      }
    });

    const errorMessage = error.code === 'ER_DATA_TOO_LONG'
      ? 'One of the submitted fields is too long. Please shorten it and try again.'
      : error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD'
      ? 'One of the submitted values has an invalid format. Please review the form and try again.'
      : 'Failed to update OD request';

    res.status(500).json({ success: false, message: errorMessage });
  }
});

// @route   GET /api/student/dashboard
// @desc    Get student dashboard data
// @access  Student
router.get('/dashboard', isStudent, async (req, res) => {
  try {
    // Get counts by status
    const [statusCounts] = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM od_requests
      WHERE student_id = ?
      GROUP BY status
    `, [req.user.id]);

    // Get recent requests
    const [recentRequests] = await pool.query(`
      SELECT id, request_id, event_name, event_type, status, event_start_date, created_at
      FROM od_requests
      WHERE student_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `, [req.user.id]);

    // Get upcoming events (approved)
    const [upcomingEvents] = await pool.query(`
      SELECT id, request_id, event_name, event_type, venue, event_start_date, event_end_date
      FROM od_requests
      WHERE student_id = ? AND status = 'approved' AND event_start_date >= CURDATE()
      ORDER BY event_start_date
      LIMIT 5
    `, [req.user.id]);

    // Active event (currently happening)
    const [activeEvents] = await pool.query(`
      SELECT id, event_name, venue, event_start_date, event_end_date, event_phase,
             checkin_compliance_rate, checkin_interval_minutes,
             (SELECT MAX(checkin_time) FROM location_checkins WHERE od_request_id = od_requests.id) as last_checkin,
             (SELECT COUNT(*) FROM location_checkins WHERE od_request_id = od_requests.id AND DATE(checkin_time) = CURDATE()) as checkins_today
      FROM od_requests
      WHERE student_id = ? AND status = 'approved' 
        AND event_start_date <= DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND event_end_date >= CURDATE()
      ORDER BY event_start_date
      LIMIT 3
    `, [req.user.id]);

    // Pending result submissions with deadlines
    const [pendingResults] = await pool.query(`
      SELECT id, event_name, event_end_date, result_submission_deadline, event_phase,
             DATEDIFF(result_submission_deadline, NOW()) as days_until_deadline
      FROM od_requests
      WHERE student_id = ? AND status = 'approved'
        AND event_end_date < CURDATE() AND result_submitted = FALSE
      ORDER BY result_submission_deadline ASC
      LIMIT 5
    `, [req.user.id]);

    // Get notifications
    const [notifications] = await pool.query(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [req.user.id]);

    // Stats summary
    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    };

    statusCounts.forEach(row => {
      stats.total += row.count;
      if (['pending', 'staff_review', 'hod_review'].includes(row.status)) {
        stats.pending += row.count;
      } else if (row.status === 'approved') {
        stats.approved = row.count;
      } else if (['rejected', 'staff_rejected'].includes(row.status)) {
        stats.rejected += row.count;
      }
    });

    res.json({
      success: true,
      data: {
        stats,
        recentRequests,
        upcomingEvents,
        activeEvents,
        pendingResults,
        notifications
      }
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
});

// @route   GET /api/student/notifications
// @desc    Get student notifications
// @access  Student
router.get('/notifications', isStudent, async (req, res) => {
  try {
    const [notifications] = await pool.query(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `, [req.user.id]);

    res.json({ success: true, data: notifications });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// @route   PUT /api/student/notifications/:id/read
// @desc    Mark notification as read
// @access  Student
router.put('/notifications/:id/read', isStudent, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    res.json({ success: true, message: 'Notification marked as read' });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark notification' });
  }
});

// @route   PUT /api/student/notifications/read-all
// @desc    Mark all notifications as read
// @access  Student
router.put('/notifications/read-all', isStudent, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
      [req.user.id]
    );

    res.json({ success: true, message: 'All notifications marked as read' });

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark notifications' });
  }
});

// @route   GET /api/student/od-request/:id/letter
// @desc    Download OD letter as PDF
// @access  Student
router.get('/od-request/:id/letter', isStudent, async (req, res) => {
  try {
    const [requests] = await pool.query(
      `SELECT od.*, 
              u.name as student_name, u.employee_id as roll_number,
              u.department, u.year_of_study, u.section,
              s.name as staff_name,
              h.name as hod_name
       FROM od_requests od
       JOIN users u ON od.student_id = u.id
       LEFT JOIN users s ON od.staff_id = s.id
       LEFT JOIN users h ON od.hod_id = h.id
       WHERE od.id = ? AND od.student_id = ?`,
      [req.params.id, req.user.id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const r = requests[0];

    if (r.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'OD letter is only available for approved requests' });
    }

    const doc = new PDFDocument({ margin: 60, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=OD_Letter_${r.request_id}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text('ON-DUTY LETTER', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(12).font('Helvetica').text('EventPass - Smart OD Letter Management System', { align: 'center' });
    doc.moveDown(0.3);
    doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke();
    doc.moveDown(1);

    // Date & Reference
    doc.fontSize(10).text(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, { align: 'right' });
    doc.text(`Ref: ${r.request_id}`, { align: 'right' });
    doc.moveDown(1);

    // Body
    doc.fontSize(11).font('Helvetica-Bold').text('To Whom It May Concern,');
    doc.moveDown(0.5);

    doc.font('Helvetica').text(
      `This is to certify that ${r.student_name} (Roll No: ${r.roll_number || 'N/A'}), ` +
      `studying in ${r.department || 'N/A'} department, Year ${r.year_of_study || 'N/A'}, Section ${r.section || 'N/A'}, ` +
      `has been granted On-Duty leave to attend the following event:`,
      { lineGap: 4 }
    );
    doc.moveDown(0.8);

    // Event Details Box
    const boxTop = doc.y;
    doc.rect(60, boxTop, 475, 130).stroke();
    doc.moveDown(0.3);
    const left = 80;
    doc.font('Helvetica-Bold').text('Event Details', left, boxTop + 10);
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Event Name:  ${r.event_name}`, left, doc.y);
    doc.text(`Event Type:  ${r.event_type}`, left);
    doc.text(`Venue:  ${r.venue}`, left);
    doc.text(`From:  ${new Date(r.event_start_date).toLocaleDateString('en-IN')}  To:  ${new Date(r.event_end_date).toLocaleDateString('en-IN')}`, left);
    if (r.organizer_name) doc.text(`Organizer:  ${r.organizer_name}`, left);
    doc.y = boxTop + 140;

    doc.moveDown(0.5);
    doc.fontSize(11).text(
      'The student is permitted to be absent from regular classes during the above-mentioned period for the purpose of attending this event. ' +
      'All concerned faculty members are requested to grant the necessary On-Duty leave.',
      { lineGap: 4 }
    );
    doc.moveDown(1.5);

    // Approval Info
    if (r.staff_name) {
      doc.font('Helvetica-Bold').text('Staff Reviewer:', { continued: true });
      doc.font('Helvetica').text(`  ${r.staff_name}`);
      if (r.staff_reviewed_at) doc.fontSize(9).text(`  Reviewed on: ${new Date(r.staff_reviewed_at).toLocaleDateString('en-IN')}`);
      doc.moveDown(0.5);
    }

    if (r.hod_name) {
      doc.fontSize(11).font('Helvetica-Bold').text('Approved by (HOD):', { continued: true });
      doc.font('Helvetica').text(`  ${r.hod_name}`);
      if (r.hod_reviewed_at) doc.fontSize(9).text(`  Approved on: ${new Date(r.hod_reviewed_at).toLocaleDateString('en-IN')}`);
    }

    doc.moveDown(3);
    doc.fontSize(10).text('This is a system-generated document from EventPass.', { align: 'center', color: '#888' });

    doc.end();

  } catch (error) {
    console.error('Generate letter error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate OD letter' });
  }
});

// @route   DELETE /api/student/od-request/:id
// @desc    Delete individual OD request
// @access  Student
router.delete('/od-request/:id', isStudent, async (req, res) => {
  try {
    const [existing] = await pool.query(
      'SELECT * FROM od_requests WHERE id = ? AND student_id = ?',
      [req.params.id, req.user.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'OD request not found' });
    }

    // Get supporting documents and delete from Cloudinary
    let supportingDocs = existing[0].supporting_documents || [];
    if (typeof supportingDocs === 'string') {
      try {
        supportingDocs = JSON.parse(supportingDocs);
      } catch {
        supportingDocs = [];
      }
    }
    
    if (Array.isArray(supportingDocs) && supportingDocs.length > 0) {
      await deleteCloudinaryFiles(supportingDocs);
    }

    // Delete related records
    await pool.query('DELETE FROM team_members WHERE od_request_id = ?', [req.params.id]);
    await pool.query('DELETE FROM location_checkins WHERE od_request_id = ?', [req.params.id]);
    await pool.query('DELETE FROM event_results WHERE od_request_id = ?', [req.params.id]);
    
    // Delete OD request
    await pool.query('DELETE FROM od_requests WHERE id = ?', [req.params.id]);

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'DELETE_REQUEST', 'od_request', req.params.id, 
       JSON.stringify({ event_name: existing[0].event_name })]
    );

    res.json({ success: true, message: 'OD request and files deleted successfully' });

  } catch (error) {
    console.error('Delete OD request error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete OD request' });
  }
});

// @route   DELETE /api/student/od-requests
// @desc    Delete multiple OD requests (bulk delete)
// @access  Student
router.delete('/od-requests', isStudent, [
  body('ids').isArray().withMessage('IDs must be array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { ids } = req.body;

    // Get all requests with their documents
    const [existing] = await pool.query(
      `SELECT id, status, supporting_documents FROM od_requests 
       WHERE student_id = ? AND id IN (${ids.map(() => '?').join(',')})`,
      [req.user.id, ...ids]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'No requests found' });
    }

    // Delete supporting documents from Cloudinary for each request
    for (const request of existing) {
      let supportingDocs = request.supporting_documents || [];
      if (typeof supportingDocs === 'string') {
        try {
          supportingDocs = JSON.parse(supportingDocs);
        } catch {
          supportingDocs = [];
        }
      }
      
      if (Array.isArray(supportingDocs) && supportingDocs.length > 0) {
        await deleteCloudinaryFiles(supportingDocs);
      }
    }

    // Delete all related records
    for (const id of ids) {
      await pool.query('DELETE FROM team_members WHERE od_request_id = ?', [id]);
      await pool.query('DELETE FROM location_checkins WHERE od_request_id = ?', [id]);
      await pool.query('DELETE FROM event_results WHERE od_request_id = ?', [id]);
    }

    // Delete requests
    await pool.query(
      `DELETE FROM od_requests WHERE student_id = ? AND id IN (${ids.map(() => '?').join(',')})`,
      [req.user.id, ...ids]
    );

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'BULK_DELETE', 'od_requests', null, 
       JSON.stringify({ count: ids.length })]
    );

    res.json({ success: true, message: `${ids.length} OD request(s) and files deleted successfully` });

  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete requests' });
  }
});

// @route   GET /api/student/availability
// @desc    Get staff/HOD availability for student's department
router.get('/availability', async (req, res) => {
  try {
    const [avails] = await pool.query(
      `SELECT sa.*, u.name as user_name, u.role as user_role
       FROM staff_availability sa
       JOIN users u ON sa.user_id = u.id
       WHERE u.department = (SELECT department FROM users WHERE id = ?)
       ORDER BY sa.date ASC, sa.start_time ASC`,
      [req.user.id]
    );
    res.json({ success: true, data: avails });
  } catch (error) {
    console.error('Student availability error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch availability' });
  }
});

// @route   GET /api/student/calendar-events
// @desc    Get all student's events for calendar view
router.get('/calendar-events', async (req, res) => {
  try {
    const [events] = await pool.query(
      `SELECT r.*,
        (SELECT JSON_ARRAYAGG(JSON_OBJECT('name', tm.name, 'register_number', tm.register_number, 'department', tm.department, 'is_team_lead', tm.is_team_lead))
         FROM team_members tm WHERE tm.od_request_id = r.id) as team_members
       FROM od_requests r
       WHERE r.student_id = ?
       ORDER BY r.event_start_date DESC`,
      [req.user.id]
    );
    const data = events.map(e => ({
      ...e,
      team_members: typeof e.team_members === 'string' ? JSON.parse(e.team_members) : (e.team_members || [])
    }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Calendar events error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch calendar events' });
  }
});

export default router;
