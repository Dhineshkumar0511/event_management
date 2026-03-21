import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../database/connection.js';
import { authenticate, isStaffOrHOD } from '../middleware/auth.js';
import { verifyEventWithAI, generateEventSummary } from '../services/aiService.js';
import { notifyStaffApproved, notifyStaffRejected, isAutoEnabled } from '../services/notificationService.js';
import { cloudinary } from '../middleware/upload.js';

const router = express.Router();

// Helper function to delete files from Cloudinary
const deleteCloudinaryFiles = async (fileUrls = []) => {
  if (!Array.isArray(fileUrls) || fileUrls.length === 0) return;
  
  for (const url of fileUrls) {
    try {
      const matches = url.match(/\/upload\/(?:v\d+\/)?(?:eventpass\/)?(.*?)(?:\.[^.]+)?$/);
      if (matches && matches[1]) {
        const publicId = `eventpass/${matches[1]}`;
        await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
        console.log(`✓ Deleted from Cloudinary: ${publicId}`);
      }
    } catch (error) {
      console.error(`Error deleting file from Cloudinary: ${url}`, error);
    }
  }
};

// Apply authentication to all routes
router.use(authenticate);
router.use(isStaffOrHOD);

// @route   GET /api/staff/od-requests
// @desc    Get all pending OD requests for staff review
// @access  Staff
router.get('/od-requests', async (req, res) => {
  try {
    const { status, department, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT od.*, 
             u.name as student_name, u.employee_id as student_roll_number, 
             u.department as student_department, u.year_of_study as student_year, u.section,
             (SELECT COUNT(*) FROM team_members WHERE od_request_id = od.id) as team_size
      FROM od_requests od
      JOIN users u ON od.student_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by status (pending, staff_review means needs staff action)
    if (status) {
      query += ' AND od.status = ?';
      params.push(status);
    } else {
      // By default show requests that need staff attention
      query += ' AND od.status IN ("pending", "staff_review")';
    }

    // Filter by department if specified
    if (department) {
      query += ' AND u.department = ?';
      params.push(department);
    } else if (req.user.role === 'staff') {
      // Staff can only see their department
      query += ' AND u.department = ?';
      params.push(req.user.department);
    }

    query += ' ORDER BY od.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [requests] = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total FROM od_requests od
      JOIN users u ON od.student_id = u.id
      WHERE 1=1
    `;
    const countParams = [];

    if (status) {
      countQuery += ' AND od.status = ?';
      countParams.push(status);
    } else {
      countQuery += ' AND od.status IN ("pending", "staff_review")';
    }

    if (department) {
      countQuery += ' AND u.department = ?';
      countParams.push(department);
    } else if (req.user.role === 'staff') {
      countQuery += ' AND u.department = ?';
      countParams.push(req.user.department);
    }

    const [countResult] = await pool.query(countQuery, countParams);

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
    console.error('Get staff OD requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch OD requests' });
  }
});

// @route   GET /api/staff/od-request/:id
// @desc    Get single OD request details with full information
// @access  Staff
router.get('/od-request/:id', async (req, res) => {
  try {
    const [requests] = await pool.query(
      `SELECT od.*, 
              u.name as student_name, u.employee_id as student_roll_number,
              u.email as student_email, u.phone as student_phone,
              u.department as student_department, u.year_of_study as student_year, u.section,
              s.name as staff_name,
              h.name as hod_name
       FROM od_requests od
       JOIN users u ON od.student_id = u.id
       LEFT JOIN users s ON od.staff_id = s.id
       LEFT JOIN users h ON od.hod_id = h.id
       WHERE od.id = ?`,
      [req.params.id]
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

    // Get activity log for this request
    const [activities] = await pool.query(
      `SELECT al.*, u.name as user_name, u.role as user_role
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.entity_type = 'od_request' AND al.entity_id = ?
       ORDER BY al.created_at DESC`,
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
        activities
      }
    });

  } catch (error) {
    console.error('Get OD request detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch OD request' });
  }
});

// @route   POST /api/staff/od-request/:id/ai-verify
// @desc    Trigger AI verification for an OD request
// @access  Staff
router.post('/od-request/:id/ai-verify', async (req, res) => {
  try {
    const [requests] = await pool.query(
      'SELECT * FROM od_requests WHERE id = ?',
      [req.params.id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ success: false, message: 'OD request not found' });
    }

    const odRequest = requests[0];

    // Call AI verification service
    const aiResult = await verifyEventWithAI({
      event_name: odRequest.event_name,
      event_type: odRequest.event_type,
      organizer_name: odRequest.organizer_name,
      event_website: odRequest.event_website,
      venue: odRequest.venue,
      location_city: odRequest.location_city,
      event_start_date: odRequest.event_start_date,
      event_end_date: odRequest.event_end_date
    });

    // Update OD request with AI verification results
    await pool.query(
      `UPDATE od_requests SET 
       ai_verification_score = ?,
       ai_verification_details = ?,
       is_verified_real = ?,
       status = 'staff_review'
       WHERE id = ?`,
      [aiResult.score, JSON.stringify(aiResult), aiResult.isReal, req.params.id]
    );

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'AI_VERIFICATION', 'od_request', req.params.id, JSON.stringify(aiResult)]
    );

    res.json({
      success: true,
      message: 'AI verification completed',
      data: aiResult
    });

  } catch (error) {
    console.error('AI verification error:', error);
    res.status(500).json({ success: false, message: 'AI verification failed' });
  }
});

// @route   POST /api/staff/od-request/:id/generate-summary
// @desc    Generate AI summary of the OD request
// @access  Staff
router.post('/od-request/:id/generate-summary', async (req, res) => {
  try {
    const [requests] = await pool.query(
      `SELECT od.*, u.name as student_name, u.department
       FROM od_requests od
       JOIN users u ON od.student_id = u.id
       WHERE od.id = ?`,
      [req.params.id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ success: false, message: 'OD request not found' });
    }

    const [teamMembers] = await pool.query(
      'SELECT * FROM team_members WHERE od_request_id = ?',
      [req.params.id]
    );

    const summary = await generateEventSummary({
      ...requests[0],
      team_members: teamMembers
    });

    res.json({
      success: true,
      data: { summary }
    });

  } catch (error) {
    console.error('Generate summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate summary' });
  }
});

// @route   PUT /api/staff/od-request/:id/approve
// @desc    Approve OD request and forward to HOD
// @access  Staff
router.put('/od-request/:id/approve', [
  body('comments').optional().trim()
], async (req, res) => {
  try {
    const { comments } = req.body;

    const [requests] = await pool.query(
      `SELECT od.*, u.name as student_name, u.phone as student_phone, u.department as student_department
       FROM od_requests od
       JOIN users u ON od.student_id = u.id
       WHERE od.id = ?`,
      [req.params.id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ success: false, message: 'OD request not found' });
    }

    // Department ownership check: staff can only action requests from their own department
    if (req.user.role === 'staff' && requests[0].student_department !== req.user.department) {
      return res.status(403).json({ success: false, message: 'Access denied: this request is not from your department' });
    }

    if (!['pending', 'staff_review'].includes(requests[0].status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot approve request in current status' 
      });
    }

    // Update request status
    await pool.query(
      `UPDATE od_requests SET 
       status = 'hod_review',
       staff_id = ?,
       staff_comments = ?,
       staff_reviewed_at = NOW()
       WHERE id = ?`,
      [req.user.id, comments, req.params.id]
    );

    // Notify student
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, related_to, related_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [requests[0].student_id, 'OD Request Approved by Staff', 
       'Your OD request has been approved by staff and forwarded to HOD for final approval.',
       'success', 'od_request', req.params.id]
    );

    // Notify HOD
    const [hodUsers] = await pool.query(
      'SELECT id FROM users WHERE role = "hod"'
    );

    for (const hod of hodUsers) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, related_to, related_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [hod.id, 'OD Request Pending Approval', 
         `An OD request for ${requests[0].event_name} has been approved by staff and requires your approval.`,
         'action_required', 'od_request', req.params.id]
      );
    }

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'STAFF_APPROVE', 'od_request', req.params.id, JSON.stringify({ comments })]
    );

    // Emit socket event
    const io = req.app.get('io');
    io.to(`student_${requests[0].student_id}`).emit('request_status_update', {
      requestId: req.params.id,
      status: 'hod_review',
      message: 'Approved by staff, forwarded to HOD'
    });
    io.to('hod').emit('new_approval_request', {
      requestId: req.params.id,
      eventName: requests[0].event_name
    });

    // WhatsApp / SMS notify student (only if auto-notifications enabled)
    if (isAutoEnabled()) notifyStaffApproved(
      { name: requests[0].student_name, phone: requests[0].student_phone },
      { event_name: requests[0].event_name, id: req.params.id, request_id: requests[0].request_id }
    ).catch(() => {});

    res.json({
      success: true,
      message: 'OD request approved and forwarded to HOD'
    });

  } catch (error) {
    console.error('Staff approve error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve request' });
  }
});

// @route   PUT /api/staff/od-request/:id/reject
// @desc    Reject OD request
// @access  Staff
router.put('/od-request/:id/reject', [
  body('comments').trim().notEmpty().withMessage('Please provide a reason for rejection')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { comments } = req.body;

    const [requests] = await pool.query(
      `SELECT od.*, u.name as student_name, u.phone as student_phone, u.department as student_department
       FROM od_requests od
       JOIN users u ON od.student_id = u.id
       WHERE od.id = ?`,
      [req.params.id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ success: false, message: 'OD request not found' });
    }

    // Department ownership check: staff can only action requests from their own department
    if (req.user.role === 'staff' && requests[0].student_department !== req.user.department) {
      return res.status(403).json({ success: false, message: 'Access denied: this request is not from your department' });
    }

    if (!['pending', 'staff_review'].includes(requests[0].status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot reject request in current status' 
      });
    }

    // Update request status
    await pool.query(
      `UPDATE od_requests SET 
       status = 'staff_rejected',
       staff_id = ?,
       staff_comments = ?,
       staff_reviewed_at = NOW()
       WHERE id = ?`,
      [req.user.id, comments, req.params.id]
    );

    // Notify student
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, related_to, related_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [requests[0].student_id, 'OD Request Rejected', 
       `Your OD request for ${requests[0].event_name} has been rejected. Reason: ${comments}`,
       'error', 'od_request', req.params.id]
    );

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'STAFF_REJECT', 'od_request', req.params.id, JSON.stringify({ comments })]
    );

    // Emit socket event
    const io = req.app.get('io');
    io.to(`student_${requests[0].student_id}`).emit('request_status_update', {
      requestId: req.params.id,
      status: 'staff_rejected',
      message: `Rejected by staff: ${comments}`
    });

    // WhatsApp / SMS notify student (only if auto-notifications enabled)
    if (isAutoEnabled()) notifyStaffRejected(
      { name: requests[0].student_name, phone: requests[0].student_phone },
      { event_name: requests[0].event_name, id: req.params.id, request_id: requests[0].request_id },
      comments
    ).catch(() => {});

    res.json({
      success: true,
      message: 'OD request rejected'
    });

  } catch (error) {
    console.error('Staff reject error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject request' });
  }
});

// @route   GET /api/staff/dashboard
// @desc    Get staff dashboard data
// @access  Staff
router.get('/dashboard', async (req, res) => {
  try {
    const departmentFilter = req.user.role === 'staff' 
      ? 'AND u.department = ?' 
      : '';
    const params = req.user.role === 'staff' ? [req.user.department] : [];

    // Pending for staff review
    const [pendingCount] = await pool.query(`
      SELECT COUNT(*) as count FROM od_requests od
      JOIN users u ON od.student_id = u.id
      WHERE od.status IN ('pending', 'staff_review') ${departmentFilter}
    `, params);

    // Approved count (by this staff)
    const [approvedCount] = await pool.query(`
      SELECT COUNT(*) as count FROM od_requests
      WHERE staff_id = ? AND status IN ('hod_review', 'approved', 'staff_approved')
    `, [req.user.id]);

    // Rejected count (by this staff)
    const [rejectedCount] = await pool.query(`
      SELECT COUNT(*) as count FROM od_requests
      WHERE staff_id = ? AND status = 'staff_rejected'
    `, [req.user.id]);

    // Recent requests
    const [recentRequests] = await pool.query(`
      SELECT od.id, od.request_id, od.event_name, od.event_type, od.status, 
             od.event_start_date, od.created_at, od.ai_verification_score,
             u.name as student_name, u.employee_id as student_roll_number
      FROM od_requests od
      JOIN users u ON od.student_id = u.id
      WHERE od.status IN ('pending', 'staff_review') ${departmentFilter}
      ORDER BY od.created_at DESC
      LIMIT 10
    `, params);

    // Requests reviewed today
    const [todayReviewed] = await pool.query(`
      SELECT COUNT(*) as count FROM od_requests
      WHERE DATE(staff_reviewed_at) = CURDATE() AND staff_id = ?
    `, [req.user.id]);

    res.json({
      success: true,
      data: {
        pending: pendingCount[0].count,
        reviewed_today: todayReviewed[0].count,
        approved: approvedCount[0].count,
        rejected: rejectedCount[0].count,
        recentRequests
      }
    });

  } catch (error) {
    console.error('Get staff dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
});

// @route   GET /api/staff/history
// @desc    Get staff's review history
// @access  Staff
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [requests] = await pool.query(`
      SELECT od.*, 
             u.name as student_name, u.employee_id as student_roll_number
      FROM od_requests od
      JOIN users u ON od.student_id = u.id
      WHERE od.staff_id = ?
      ORDER BY od.staff_reviewed_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.id, parseInt(limit), parseInt(offset)]);

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM od_requests WHERE staff_id = ?',
      [req.user.id]
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
    console.error('Get staff history error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch history' });
  }
});

// @route   DELETE /api/staff/od-request/:id
// @desc    Delete OD request and cleanup files
// @access  Staff
router.delete('/od-request/:id', async (req, res) => {
  try {
    const [existing] = await pool.query(
      'SELECT * FROM od_requests WHERE id = ?',
      [req.params.id]
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
      const fileUrls = supportingDocs.map(doc => doc.url || doc).filter(Boolean);
      await deleteCloudinaryFiles(fileUrls);
    }

    // Delete related records
    await pool.query('DELETE FROM team_members WHERE od_request_id = ?', [req.params.id]);
    await pool.query('DELETE FROM location_checkins WHERE od_request_id = ?', [req.params.id]);
    await pool.query('DELETE FROM event_results WHERE od_request_id = ?', [req.params.id]);
    await pool.query('DELETE FROM od_requests WHERE id = ?', [req.params.id]);

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'STAFF_DELETE_REQUEST', 'od_request', req.params.id, 
       JSON.stringify({ event_name: existing[0].event_name })]
    );

    res.json({ success: true, message: 'OD request and files deleted successfully' });

  } catch (error) {
    console.error('Delete OD request error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete OD request' });
  }
});

// @route   DELETE /api/staff/od-requests
// @desc    Bulk delete OD requests and cleanup files
// @access  Staff
router.delete('/od-requests', [
  body('ids').isArray().withMessage('IDs must be array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { ids } = req.body;

    // Get all requests with supporting documents
    const [existing] = await pool.query(
      `SELECT id, supporting_documents FROM od_requests WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    if (existing.length !== ids.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Some requests not found' 
      });
    }

    // Delete supporting documents from Cloudinary
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
        const fileUrls = supportingDocs.map(doc => doc.url || doc).filter(Boolean);
        await deleteCloudinaryFiles(fileUrls);
      }
    }

    // Delete all related records and requests
    for (const id of ids) {
      await pool.query('DELETE FROM team_members WHERE od_request_id = ?', [id]);
      await pool.query('DELETE FROM location_checkins WHERE od_request_id = ?', [id]);
      await pool.query('DELETE FROM event_results WHERE od_request_id = ?', [id]);
    }

    await pool.query(
      `DELETE FROM od_requests WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'STAFF_BULK_DELETE', 'od_requests', null, 
       JSON.stringify({ count: ids.length })]
    );

    res.json({ success: true, message: `${ids.length} request(s) deleted successfully` });

  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete requests' });
  }
});

// @route   GET /api/staff/calendar-events
// @desc    Get all events for calendar (staff sees all requests)
router.get('/calendar-events', async (req, res) => {
  try {
    const [events] = await pool.query(
      `SELECT r.*, u.name as student_name, u.department as student_department, u.employee_id as student_roll,
        (SELECT JSON_ARRAYAGG(JSON_OBJECT('name', tm.name, 'register_number', tm.register_number, 'department', tm.department, 'year_of_study', tm.year_of_study, 'section', tm.section, 'is_team_lead', tm.is_team_lead))
         FROM team_members tm WHERE tm.od_request_id = r.id) as team_members
       FROM od_requests r
       JOIN users u ON u.id = r.student_id
       ORDER BY r.event_start_date DESC`
    );
    const data = events.map(e => ({
      ...e,
      team_members: typeof e.team_members === 'string' ? JSON.parse(e.team_members) : (e.team_members || [])
    }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Staff calendar error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch calendar events' });
  }
});

// @route   GET /api/staff/availability
// @desc    Get availability entries for the staff member's department
router.get('/availability', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT sa.*, u.name as user_name, u.role as user_role
       FROM staff_availability sa
       JOIN users u ON u.id = sa.user_id
       WHERE u.department = ?
       ORDER BY sa.date ASC, sa.start_time ASC`,
      [req.user.department]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Availability fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch availability' });
  }
});

// @route   POST /api/staff/availability
// @desc    Create a new availability entry
router.post('/availability', async (req, res) => {
  try {
    const { date, start_time, end_time, title, note } = req.body;
    if (!date || !start_time || !end_time) {
      return res.status(400).json({ success: false, message: 'Date and time range are required' });
    }
    const [result] = await pool.query(
      'INSERT INTO staff_availability (user_id, date, start_time, end_time, title, note) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, date, start_time, end_time, title || null, note || null]
    );
    res.json({ success: true, data: { id: result.insertId }, message: 'Availability saved' });
  } catch (error) {
    console.error('Availability create error:', error);
    res.status(500).json({ success: false, message: 'Failed to save availability' });
  }
});

// @route   DELETE /api/staff/availability/:id
// @desc    Delete own availability entry
router.delete('/availability/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM staff_availability WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Availability deleted' });
  } catch (error) {
    console.error('Availability delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete availability' });
  }
});

export default router;
