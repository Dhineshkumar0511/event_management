import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import pool from '../database/connection.js';
import { authenticate, isHOD } from '../middleware/auth.js';
import { generateODLetter } from '../services/letterService.js';
import { notifyHODApproved, notifyHODRejected, isAutoEnabled } from '../services/notificationService.js';
import { cloudinary } from '../middleware/upload.js';

const router = express.Router();

// Helper: resolve Cloudinary resource_type from URL
const cloudinaryResourceType = (url) =>
  (url && (url.includes('/raw/') || /\.pdf$/i.test(url))) ? 'raw' : 'image';

// Helper function to delete files from Cloudinary
// Accepts either an array of URL strings OR an array of doc objects {name, path, size} / {url} / {secure_url}
const deleteCloudinaryFiles = async (fileUrls = []) => {
  if (!Array.isArray(fileUrls) || fileUrls.length === 0) return;
  
  for (const entry of fileUrls) {
    try {
      // Coerce doc objects to URL strings
      const url = typeof entry === 'string' ? entry : (entry?.path || entry?.url || entry?.secure_url);
      if (!url || typeof url !== 'string') continue;
      // Only attempt deletion for Cloudinary URLs (local paths won't match)
      if (!url.includes('cloudinary.com')) {
        console.log(`[Cloudinary] Skipping local file: ${url}`);
        continue;
      }
      const matches = url.match(/\/upload\/(?:v\d+\/)?(?:eventpass\/)?(.*?)(?:\.[^.]+)?$/);
      if (matches && matches[1]) {
        const publicId = `eventpass/${matches[1]}`;
        const resType = cloudinaryResourceType(url);
        await cloudinary.uploader.destroy(publicId, { resource_type: resType });
        console.log(`✓ Deleted from Cloudinary: ${publicId} (${resType})`);
      } else {
        console.warn(`[Cloudinary] Could not parse public_id from URL: ${url}`);
      }
    } catch (error) {
      console.error(`Error deleting file from Cloudinary:`, error.message || error);
    }
  }
};

// Apply authentication to all routes
router.use(authenticate);
router.use(isHOD);

// @route   GET /api/hod/od-requests
// @desc    Get all OD requests pending HOD approval
// @access  HOD
router.get('/od-requests', async (req, res) => {
  try {
    const { status, department, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT od.*, 
             u.name as student_name, u.employee_id as student_roll_number, 
             u.department as student_department, u.year_of_study as student_year, u.section,
             s.name as staff_name,
             (SELECT COUNT(*) FROM team_members WHERE od_request_id = od.id) as team_size
      FROM od_requests od
      JOIN users u ON od.student_id = u.id
      LEFT JOIN users s ON od.staff_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND od.status = ?';
      params.push(status);
    } else {
      // By default show requests that need HOD attention
      query += ' AND od.status = "hod_review"';
    }

    if (department) {
      query += ' AND u.department = ?';
      params.push(department);
    }

    query += ' ORDER BY od.staff_reviewed_at DESC LIMIT ? OFFSET ?';
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
      countQuery += ' AND od.status = "hod_review"';
    }

    if (department) {
      countQuery += ' AND u.department = ?';
      countParams.push(department);
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
    console.error('Get HOD OD requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch OD requests' });
  }
});

// @route   GET /api/hod/od-request/:id
// @desc    Get single OD request details
// @access  HOD
router.get('/od-request/:id', async (req, res) => {
  try {
    const [requests] = await pool.query(
      `SELECT od.*, 
              u.name as student_name, u.employee_id as student_roll_number,
              u.email as student_email, u.phone as student_phone,
              u.department as student_department, u.year_of_study as student_year, u.section,
              s.name as staff_name, s.email as staff_email
       FROM od_requests od
       JOIN users u ON od.student_id = u.id
       LEFT JOIN users s ON od.staff_id = s.id
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

    const [checkins] = await pool.query(
      'SELECT * FROM location_checkins WHERE od_request_id = ? ORDER BY checkin_time',
      [req.params.id]
    );

    const [results] = await pool.query(
      'SELECT * FROM event_results WHERE od_request_id = ?',
      [req.params.id]
    );

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
        result: results[0] || null,
        activities
      }
    });

  } catch (error) {
    console.error('Get OD request detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch OD request' });
  }
});

// @route   PUT /api/hod/od-request/:id/approve
// @desc    Final approval of OD request
// @access  HOD
router.put('/od-request/:id/approve', [
  body('comments').optional().trim()
], async (req, res) => {
  try {
    const { comments } = req.body;

    const [requests] = await pool.query(
      `SELECT od.*, u.name as student_name, u.email as student_email, u.phone as student_phone, u.department
       FROM od_requests od
       JOIN users u ON od.student_id = u.id
       WHERE od.id = ?`,
      [req.params.id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ success: false, message: 'OD request not found' });
    }

    if (requests[0].status !== 'hod_review') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only requests in HOD review status can be approved' 
      });
    }

    // Generate OD letter (non-blocking — approval succeeds even if PDF fails)
    let letterPath = null;
    try {
      letterPath = await generateODLetter(req.params.id);
    } catch (pdfErr) {
      console.error('OD letter PDF generation failed (non-fatal):', pdfErr?.message || pdfErr);
    }

    // Update request status
    await pool.query(
      `UPDATE od_requests SET 
       status = 'approved',
       hod_id = ?,
       hod_comments = ?,
       hod_reviewed_at = NOW(),
       letter_generated = TRUE,
       letter_path = ?
       WHERE id = ?`,
      [req.user.id, comments, letterPath, req.params.id]
    );

    // Notify student
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, related_to, related_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [requests[0].student_id, 'OD Request Approved! 🎉', 
       `Congratulations! Your OD request for ${requests[0].event_name} has been approved. You can download your OD letter now.`,
       'success', 'od_request', req.params.id]
    );

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'HOD_APPROVE', 'od_request', req.params.id, JSON.stringify({ comments })]
    );

    // Emit socket event
    const io = req.app.get('io');
    io.to(`student_${requests[0].student_id}`).emit('request_status_update', {
      requestId: req.params.id,
      status: 'approved',
      message: 'Your OD request has been approved!'
    });

    // WhatsApp / SMS notify student (only if auto-notifications enabled)
    if (isAutoEnabled()) notifyHODApproved(
      { name: requests[0].student_name, phone: requests[0].student_phone },
      { event_name: requests[0].event_name, id: req.params.id, request_id: requests[0].request_id }
    ).catch(() => {});

    res.json({
      success: true,
      message: 'OD request approved successfully',
      data: { letterPath }
    });

  } catch (error) {
    console.error('HOD approve error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve request' });
  }
});

// @route   PUT /api/hod/od-request/:id/reject
// @desc    Reject OD request
// @access  HOD
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
      `SELECT od.*, u.name as student_name, u.phone as student_phone
       FROM od_requests od
       JOIN users u ON od.student_id = u.id
       WHERE od.id = ?`,
      [req.params.id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ success: false, message: 'OD request not found' });
    }

    if (requests[0].status !== 'hod_review') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only requests in HOD review status can be rejected' 
      });
    }

    await pool.query(
      `UPDATE od_requests SET 
       status = 'rejected',
       hod_id = ?,
       hod_comments = ?,
       hod_reviewed_at = NOW()
       WHERE id = ?`,
      [req.user.id, comments, req.params.id]
    );

    // Notify student
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, related_to, related_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [requests[0].student_id, 'OD Request Rejected', 
       `Your OD request for ${requests[0].event_name} has been rejected by HOD. Reason: ${comments}`,
       'error', 'od_request', req.params.id]
    );

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'HOD_REJECT', 'od_request', req.params.id, JSON.stringify({ comments })]
    );

    // Emit socket event
    const io = req.app.get('io');
    io.to(`student_${requests[0].student_id}`).emit('request_status_update', {
      requestId: req.params.id,
      status: 'rejected',
      message: `Rejected by HOD: ${comments}`
    });

    // WhatsApp / SMS notify student (only if auto-notifications enabled)
    if (isAutoEnabled()) notifyHODRejected(
      { name: requests[0].student_name, phone: requests[0].student_phone },
      { event_name: requests[0].event_name, id: req.params.id, request_id: requests[0].request_id },
      comments
    ).catch(() => {});

    res.json({
      success: true,
      message: 'OD request rejected'
    });

  } catch (error) {
    console.error('HOD reject error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject request' });
  }
});

// @route   GET /api/hod/dashboard
// @desc    Get HOD dashboard with analytics
// @access  HOD
router.get('/dashboard', async (req, res) => {
  try {
    // Overall stats
    const [totalStats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'hod_review' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status IN ('rejected', 'staff_rejected') THEN 1 ELSE 0 END) as rejected
      FROM od_requests
    `);

    // By department
    const [byDepartment] = await pool.query(`
      SELECT 
        u.department,
        COUNT(*) as total,
        SUM(CASE WHEN od.status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN od.status IN ('rejected', 'staff_rejected') THEN 1 ELSE 0 END) as rejected
      FROM od_requests od
      JOIN users u ON od.student_id = u.id
      GROUP BY u.department
    `);

    // By event type
    const [byEventType] = await pool.query(`
      SELECT 
        event_type,
        COUNT(*) as count
      FROM od_requests
      GROUP BY event_type
      ORDER BY count DESC
    `);

    // Monthly trend (last 6 months)
    const [monthlyTrend] = await pool.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
      FROM od_requests
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month
    `);

    // Pending for HOD review
    const [pendingRequests] = await pool.query(`
      SELECT od.id, od.request_id, od.event_name, od.event_type, 
             od.event_start_date, od.staff_reviewed_at,
             u.name as student_name, u.department,
             s.name as staff_name
      FROM od_requests od
      JOIN users u ON od.student_id = u.id
      LEFT JOIN users s ON od.staff_id = s.id
      WHERE od.status = 'hod_review'
      ORDER BY od.staff_reviewed_at DESC
      LIMIT 10
    `);

    // Recent activities
    const [recentActivities] = await pool.query(`
      SELECT al.*, u.name as user_name, u.role as user_role
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.entity_type = 'od_request'
      ORDER BY al.created_at DESC
      LIMIT 20
    `);

    // Active events (ongoing)
    const [activeEvents] = await pool.query(`
      SELECT od.*, u.name as student_name,
             (SELECT COUNT(*) FROM location_checkins WHERE od_request_id = od.id) as checkin_count,
             (SELECT MAX(checkin_time) FROM location_checkins WHERE od_request_id = od.id) as last_checkin
      FROM od_requests od
      JOIN users u ON od.student_id = u.id
      WHERE od.status = 'approved'
        AND od.event_start_date <= CURDATE()
        AND od.event_end_date >= CURDATE()
    `);

    res.json({
      success: true,
      data: {
        stats: totalStats[0],
        byDepartment,
        byEventType,
        monthlyTrend,
        pendingRequests,
        recentActivities,
        activeEvents
      }
    });

  } catch (error) {
    console.error('Get HOD dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
});

// @route   GET /api/hod/users
// @desc    Get all users (Admin function)
// @access  HOD
router.get('/users', async (req, res) => {
  try {
    const { role, department, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT id, employee_id, email, name, role, department, year_of_study, section, phone, is_active, created_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    if (department) {
      query += ' AND department = ?';
      params.push(department);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [users] = await pool.query(query, params);

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM users' + 
      (role ? ' WHERE role = ?' : '') +
      (department ? (role ? ' AND' : ' WHERE') + ' department = ?' : ''),
      [...(role ? [role] : []), ...(department ? [department] : [])]
    );

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// @route   PUT /api/hod/users/:id/toggle-status
// @desc    Activate/Deactivate user
// @access  HOD
router.put('/users/:id/toggle-status', async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const newStatus = !users[0].is_active;

    await pool.query(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [newStatus, req.params.id]
    );

    res.json({
      success: true,
      message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
});

// @route   GET /api/hod/all-requests
// @desc    Get all OD requests with advanced filters
// @access  HOD
router.get('/all-requests', async (req, res) => {
  try {
    const { status, department, event_type, from_date, to_date, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT od.*, 
             u.name as student_name, u.employee_id as student_roll_number, u.department,
             s.name as staff_name,
             h.name as hod_name
      FROM od_requests od
      JOIN users u ON od.student_id = u.id
      LEFT JOIN users s ON od.staff_id = s.id
      LEFT JOIN users h ON od.hod_id = h.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND od.status = ?';
      params.push(status);
    }

    if (department) {
      query += ' AND u.department = ?';
      params.push(department);
    }

    if (event_type) {
      query += ' AND od.event_type = ?';
      params.push(event_type);
    }

    if (from_date) {
      query += ' AND od.event_start_date >= ?';
      params.push(from_date);
    }

    if (to_date) {
      query += ' AND od.event_end_date <= ?';
      params.push(to_date);
    }

    query += ' ORDER BY od.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [requests] = await pool.query(query, params);

    res.json({
      success: true,
      data: requests
    });

  } catch (error) {
    console.error('Get all requests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
});

// @route   GET /api/hod/analytics
// @desc    Get analytics data for HOD dashboard
// @access  HOD
router.get('/analytics', async (req, res) => {
  try {
    const [[stats]] = await pool.query(`
      SELECT 
        SUM(CASE WHEN status = 'hod_review' THEN 1 ELSE 0 END) as pending_approval,
        SUM(CASE WHEN status = 'approved' AND DATE(hod_reviewed_at) = CURDATE() THEN 1 ELSE 0 END) as approved_today,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as total_approved,
        SUM(CASE WHEN status IN ('rejected', 'staff_rejected') THEN 1 ELSE 0 END) as total_rejected
      FROM od_requests
    `);

    const [[activeCount]] = await pool.query(`
      SELECT COUNT(*) as active_events
      FROM od_requests
      WHERE status = 'approved'
        AND event_start_date <= CURDATE()
        AND event_end_date >= CURDATE()
    `);

    const [[studentCount]] = await pool.query(`
      SELECT COUNT(*) as total_students FROM users WHERE role = 'student'
    `);

    res.json({
      success: true,
      data: {
        ...stats,
        active_events: activeCount.active_events,
        total_students: studentCount.total_students
      }
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

// @route   GET /api/hod/reports
// @desc    Get comprehensive reports data
// @access  HOD
router.get('/reports', async (req, res) => {
  try {
    // Monthly trends (last 6 months)
    const [monthlyTrends] = await pool.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status IN ('rejected', 'staff_rejected') THEN 1 ELSE 0 END) as rejected
      FROM od_requests
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
    `);

    // Event type distribution
    const [eventTypes] = await pool.query(`
      SELECT event_type, COUNT(*) as count
      FROM od_requests
      GROUP BY event_type
      ORDER BY count DESC
    `);

    // Department-wise breakdown
    const [departments] = await pool.query(`
      SELECT u.department, COUNT(*) as total,
        SUM(CASE WHEN od.status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN od.status IN ('rejected', 'staff_rejected') THEN 1 ELSE 0 END) as rejected
      FROM od_requests od
      JOIN users u ON od.student_id = u.id
      WHERE u.department IS NOT NULL
      GROUP BY u.department
      ORDER BY total DESC
    `);

    // Staff performance
    const [staffPerformance] = await pool.query(`
      SELECT s.name as staff_name,
        COUNT(*) as total_reviewed,
        SUM(CASE WHEN od.status IN ('hod_review', 'approved', 'staff_approved') THEN 1 ELSE 0 END) as forwarded,
        SUM(CASE WHEN od.status = 'staff_rejected' THEN 1 ELSE 0 END) as rejected,
        AVG(TIMESTAMPDIFF(HOUR, od.created_at, od.staff_reviewed_at)) as avg_review_hours
      FROM od_requests od
      JOIN users s ON od.staff_id = s.id
      WHERE od.staff_id IS NOT NULL
      GROUP BY od.staff_id, s.name
      ORDER BY total_reviewed DESC
    `);

    // Top students by OD requests
    const [topStudents] = await pool.query(`
      SELECT u.name, u.employee_id as roll_number, u.department,
        COUNT(*) as total_requests,
        SUM(CASE WHEN od.status = 'approved' THEN 1 ELSE 0 END) as approved
      FROM od_requests od
      JOIN users u ON od.student_id = u.id
      GROUP BY od.student_id, u.name, u.employee_id, u.department
      ORDER BY total_requests DESC
      LIMIT 10
    `);

    // Overall stats
    const [[overallStats]] = await pool.query(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as total_approved,
        SUM(CASE WHEN status IN ('rejected', 'staff_rejected') THEN 1 ELSE 0 END) as total_rejected,
        SUM(CASE WHEN status IN ('pending', 'staff_review', 'hod_review') THEN 1 ELSE 0 END) as total_pending,
        (SELECT COUNT(DISTINCT student_id) FROM od_requests) as unique_students
      FROM od_requests
    `);

    res.json({
      success: true,
      data: {
        monthlyTrends,
        eventTypes,
        departments,
        staffPerformance,
        topStudents,
        overallStats
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
});

// @route   GET /api/hod/active-events
// @desc    Get all currently active events (including upcoming within 3 days)
// @access  HOD
router.get('/active-events', async (req, res) => {
  try {
    const [events] = await pool.query(`
      SELECT od.*, 
             u.name as student_name, u.employee_id as student_roll_number, 
             u.department as student_department,
             (SELECT COUNT(*) FROM location_checkins WHERE od_request_id = od.id) as checkin_count,
             (SELECT MAX(checkin_time) FROM location_checkins WHERE od_request_id = od.id) as last_checkin,
             CASE 
               WHEN od.event_start_date <= CURDATE() AND od.event_end_date >= CURDATE() THEN 'active'
               WHEN od.event_start_date > CURDATE() AND od.event_start_date <= DATE_ADD(CURDATE(), INTERVAL 3 DAY) THEN 'upcoming'
               ELSE 'ended'
             END as event_status
      FROM od_requests od
      JOIN users u ON od.student_id = u.id
      WHERE od.status = 'approved'
        AND od.event_start_date <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)
        AND od.event_end_date >= CURDATE()
      ORDER BY event_status ASC, last_checkin DESC
    `);

    res.json({
      success: true,
      data: events
    });

  } catch (error) {
    console.error('Get active events error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch active events' });
  }
});

// @route   GET /api/hod/student-activity
// @desc    Get recent check-in activity across all students (HOD monitoring feed)
// @access  HOD
router.get('/student-activity', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const [activity] = await pool.query(`
      SELECT lc.*, 
             u.name as student_name, u.employee_id as student_roll_number,
             u.department as student_department,
             od.event_name, od.venue, od.event_start_date, od.event_end_date
      FROM location_checkins lc
      JOIN users u ON lc.student_id = u.id
      JOIN od_requests od ON lc.od_request_id = od.id
      WHERE od.status = 'approved'
      ORDER BY lc.checkin_time DESC
      LIMIT ?
    `, [limit]);

    // Also get students who haven't checked in recently
    const [overdueStudents] = await pool.query(`
      SELECT od.id as od_request_id, od.event_name, od.venue,
             od.checkin_interval_minutes,
             u.id as student_id, u.name as student_name, u.employee_id as student_roll_number,
             u.department as student_department,
             (SELECT MAX(checkin_time) FROM location_checkins WHERE od_request_id = od.id) as last_checkin,
             TIMESTAMPDIFF(MINUTE, 
               COALESCE((SELECT MAX(checkin_time) FROM location_checkins WHERE od_request_id = od.id), od.event_start_date),
               NOW()
             ) as minutes_since_last_checkin
      FROM od_requests od
      JOIN users u ON od.student_id = u.id
      WHERE od.status = 'approved'
        AND od.event_start_date <= CURDATE()
        AND od.event_end_date >= CURDATE()
      HAVING minutes_since_last_checkin > COALESCE(od.checkin_interval_minutes, 180)
      ORDER BY minutes_since_last_checkin DESC
    `);

    res.json({
      success: true,
      data: {
        recentActivity: activity,
        overdueStudents
      }
    });

  } catch (error) {
    console.error('Get student activity error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch student activity' });
  }
});

// @route   GET /api/hod/student-monitor/:studentId
// @desc    Get detailed monitoring info for a specific student
// @access  HOD
router.get('/student-monitor/:studentId', async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    
    const [student] = await pool.query(
      'SELECT id, name, email, employee_id, department, year_of_study FROM users WHERE id = ?',
      [studentId]
    );
    if (student.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const [activeODs] = await pool.query(`
      SELECT od.*,
             (SELECT COUNT(*) FROM location_checkins WHERE od_request_id = od.id) as checkin_count,
             (SELECT MAX(checkin_time) FROM location_checkins WHERE od_request_id = od.id) as last_checkin
      FROM od_requests od
      WHERE od.student_id = ? AND od.status = 'approved'
        AND od.event_end_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      ORDER BY od.event_start_date DESC
    `, [studentId]);

    const [checkins] = await pool.query(`
      SELECT lc.*, od.event_name, od.venue
      FROM location_checkins lc
      JOIN od_requests od ON lc.od_request_id = od.id
      WHERE lc.student_id = ?
      ORDER BY lc.checkin_time DESC
      LIMIT 50
    `, [studentId]);

    res.json({
      success: true,
      data: {
        student: student[0],
        activeODs,
        recentCheckins: checkins
      }
    });

  } catch (error) {
    console.error('Get student monitor error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch student details' });
  }
});

// @route   POST /api/hod/users
// @desc    Create a new user
// @access  HOD
router.post('/users', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character (@$!%*?&)'),
  body('role').isIn(['student', 'staff']).withMessage('Role must be student or staff')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, role, department, roll_number, year } = req.body;

    // Check if email already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users (name, email, password, role, department, employee_id, year_of_study, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, true)`,
      [name, email, hashedPassword, role, department || null, roll_number || null, year || null]
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { id: result.insertId }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
});

// @route   PUT /api/hod/users/:id
// @desc    Update a user
// @access  HOD
router.put('/users/:id', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').isIn(['student', 'staff']).withMessage('Role must be student or staff'),
  body('password').optional().isLength({ min: 12 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must be at least 12 chars with uppercase, lowercase, number and special char'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  try {
    const { name, email, password, role, department, roll_number, year } = req.body;

    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let updateQuery = `UPDATE users SET name = ?, email = ?, role = ?, department = ?, employee_id = ?, year_of_study = ?`;
    let params = [name, email, role, department || null, roll_number || null, year || null];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += ', password = ?';
      params.push(hashedPassword);
    }

    updateQuery += ' WHERE id = ?';
    params.push(req.params.id);

    await pool.query(updateQuery, params);

    res.json({
      success: true,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

// @route   DELETE /api/hod/users/:id
// @desc    Delete a user
// @access  HOD
router.delete('/users/:id', async (req, res) => {
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Don't allow deleting yourself
    if (users[0].id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

// @route   DELETE /api/hod/od-request/:id
// @desc    Delete OD request and cleanup files
// @access  HOD
router.delete('/od-request/:id', isHOD, async (req, res) => {
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
      await deleteCloudinaryFiles(supportingDocs);
    }

    // Delete related records
    await pool.query('DELETE FROM team_members WHERE od_request_id = ?', [req.params.id]);
    await pool.query('DELETE FROM location_checkins WHERE od_request_id = ?', [req.params.id]);
    await pool.query('DELETE FROM event_results WHERE od_request_id = ?', [req.params.id]);
    await pool.query("DELETE FROM notifications WHERE related_to = 'od_request' AND related_id = ?", [req.params.id]);
    await pool.query('DELETE FROM od_requests WHERE id = ?', [req.params.id]);

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'HOD_DELETE_REQUEST', 'od_request', req.params.id, 
       JSON.stringify({ event_name: existing[0].event_name })]
    );

    res.json({ success: true, message: 'OD request and files deleted successfully' });

  } catch (error) {
    console.error('Delete OD request error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete OD request' });
  }
});

// @route   DELETE /api/hod/od-requests
// @desc    Bulk delete OD requests and cleanup files
// @access  HOD
router.delete('/od-requests', isHOD, [
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
        message: 'Some requests were not found' 
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
        await deleteCloudinaryFiles(supportingDocs);
      }
    }

    // Delete all related records
    for (const id of ids) {
      await pool.query('DELETE FROM team_members WHERE od_request_id = ?', [id]);
      await pool.query('DELETE FROM location_checkins WHERE od_request_id = ?', [id]);
      await pool.query('DELETE FROM event_results WHERE od_request_id = ?', [id]);
      await pool.query("DELETE FROM notifications WHERE related_to = 'od_request' AND related_id = ?", [id]);
    }

    await pool.query(
      `DELETE FROM od_requests WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'HOD_BULK_DELETE', 'od_requests', null, 
       JSON.stringify({ count: ids.length })]
    );

    res.json({ success: true, message: `${ids.length} request(s) and files deleted successfully` });

  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete requests' });
  }
});

// @route   DELETE /api/hod/od-requests/delete-all
// @desc    Delete ALL OD requests + Cloudinary docs
// @access  HOD
router.delete('/od-requests/delete-all', isHOD, async (req, res) => {
  try {
    const [existing] = await pool.query(
      'SELECT id, supporting_documents FROM od_requests'
    );

    if (existing.length === 0) {
      return res.json({ success: true, message: 'No requests to delete', deleted: 0 });
    }

    // Delete Cloudinary files
    for (const request of existing) {
      let supportingDocs = request.supporting_documents || [];
      if (typeof supportingDocs === 'string') {
        try { supportingDocs = JSON.parse(supportingDocs); } catch { supportingDocs = []; }
      }
      if (Array.isArray(supportingDocs) && supportingDocs.length > 0) {
        const fileUrls = supportingDocs.map(doc => doc.path || doc.url || doc).filter(Boolean);
        await deleteCloudinaryFiles(fileUrls);
      }
    }

    const ids = existing.map(r => r.id);
    for (const id of ids) {
      await pool.query('DELETE FROM team_members WHERE od_request_id = ?', [id]);
      await pool.query('DELETE FROM location_checkins WHERE od_request_id = ?', [id]);
      await pool.query('DELETE FROM event_results WHERE od_request_id = ?', [id]);
      await pool.query("DELETE FROM notifications WHERE related_to = 'od_request' AND related_id = ?", [id]);
    }
    await pool.query(
      `DELETE FROM od_requests WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'HOD_DELETE_ALL', 'od_requests', null,
       JSON.stringify({ count: ids.length })]
    );

    res.json({ success: true, message: `${ids.length} request(s) deleted successfully`, deleted: ids.length });
  } catch (error) {
    console.error('Delete all error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete all requests' });
  }
});

// @route   GET /api/hod/calendar-events
// @desc    Get all events for HOD calendar view
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
    console.error('HOD calendar error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch calendar events' });
  }
});

// @route   GET /api/hod/availability
// @desc    Get availability entries for the HOD's department
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
    console.error('HOD availability fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch availability' });
  }
});

// @route   POST /api/hod/availability
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
    console.error('HOD availability create error:', error);
    res.status(500).json({ success: false, message: 'Failed to save availability' });
  }
});

// @route   DELETE /api/hod/availability/:id
// @desc    Delete own availability entry
router.delete('/availability/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM staff_availability WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Availability deleted' });
  } catch (error) {
    console.error('HOD availability delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete availability' });
  }
});

// @route   GET /api/hod/audit-logs
// @desc    Get activity audit trail with filters
// @access  HOD
router.get('/audit-logs', async (req, res) => {
  try {
    const { action, user_id, entity_type, limit = 100, offset = 0 } = req.query;
    const params = [];
    const conditions = [];

    if (action) { conditions.push('al.action = ?'); params.push(action); }
    if (user_id) { conditions.push('al.user_id = ?'); params.push(user_id); }
    if (entity_type) { conditions.push('al.entity_type = ?'); params.push(entity_type); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [logs] = await pool.query(`
      SELECT al.id, al.action, al.entity_type, al.entity_id, al.details,
             al.created_at, u.name AS actor_name, u.role AS actor_role
      FROM activity_logs al
      JOIN users u ON al.user_id = u.id
      ${where}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM activity_logs al ${where}`,
      params
    );

    // Distinct action types for filter dropdown
    const [actions] = await pool.query(
      'SELECT DISTINCT action FROM activity_logs ORDER BY action'
    );

    res.json({ success: true, data: { logs, total, actions: actions.map(a => a.action) } });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

// @route   POST /api/hod/users/bulk-import
// @desc    Bulk create users from CSV data
// @access  HOD
router.post('/users/bulk-import', [
  body('users').isArray({ min: 1 }).withMessage('Users array required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { users } = req.body;

  const results = { created: 0, skipped: 0, errors: [] };

  for (const u of users) {
    const { name, email, employee_id, role, department, phone } = u;
    if (!name || !email || !employee_id || !role) {
      results.errors.push({ email: email || '?', reason: 'Missing required fields' });
      results.skipped++;
      continue;
    }
    const validRoles = ['student', 'staff'];
    if (!validRoles.includes(role)) {
      results.errors.push({ email, reason: `Invalid role: ${role} (must be student or staff)` });
      results.skipped++;
      continue;
    }
    try {
      const [[existing]] = await pool.query(
        'SELECT id FROM users WHERE email = ? OR employee_id = ?', [email, employee_id]
      );
      if (existing) {
        results.errors.push({ email, reason: 'Email or ID already exists' });
        results.skipped++;
        continue;
      }
      // Generate a unique random temporary password (not predictable)
      const tempPassword = crypto.randomBytes(8).toString('hex'); // 16-char hex
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      await pool.query(
        'INSERT INTO users (name, email, employee_id, password, role, department, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name.trim(), email.trim().toLowerCase(), employee_id.trim(), hashedPassword, role, department || null, phone || null]
      );
      results.created++;
      // Include temp password in response so HOD can distribute credentials
      results.errors.push({ email, reason: `Created — temp password: ${tempPassword}` });
    } catch (err) {
      results.errors.push({ email, reason: err.message });
      results.skipped++;
    }
  }

  await pool.query(
    `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
    [req.user.id, 'HOD_BULK_IMPORT', 'users', null, JSON.stringify({ created: results.created, skipped: results.skipped })]
  );

  res.json({ success: true, data: results });
});

export default router;
