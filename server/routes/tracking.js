import express from 'express';
import { body, validationResult } from 'express-validator';
import pool from '../database/connection.js';
import { authenticate, isStudent, isStaffOrHOD } from '../middleware/auth.js';
import { upload, uploadCheckInPhoto, uploadPhotos, uploadCertificate } from '../middleware/upload.js';
import { haversineDistance } from '../services/cronService.js';

const router = express.Router();

router.use(authenticate);

// ==================== STUDENT CHECK-IN ROUTES ====================

// @route   POST /api/tracking/checkin
// @desc    Record location check-in during event
// @access  Student
router.post('/checkin', isStudent, uploadCheckInPhoto, [
  body('od_request_id').isInt().withMessage('OD request ID is required'),
  body('checkin_type').isIn(['arrival', 'hourly', 'departure', 'manual']).optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { od_request_id, latitude, longitude, location_name, checkin_type = 'manual', notes } = req.body;

    // Verify the OD request belongs to student and is approved
    // Allow check-in from 3 days before start until end date
    const [requests] = await pool.query(
      `SELECT * FROM od_requests 
       WHERE id = ? AND student_id = ? AND status = 'approved'
       AND event_start_date <= DATE_ADD(CURDATE(), INTERVAL 3 DAY) AND event_end_date >= CURDATE()`,
      [od_request_id, req.user.id]
    );

    if (requests.length === 0) {
      // Check if request exists but is outside check-in window
      const [futureReqs] = await pool.query(
        `SELECT event_start_date FROM od_requests 
         WHERE id = ? AND student_id = ? AND status = 'approved' AND event_end_date >= CURDATE()`,
        [od_request_id, req.user.id]
      );
      if (futureReqs.length > 0) {
        const startDate = new Date(futureReqs[0].event_start_date);
        return res.status(400).json({
          success: false,
          message: `Event hasn't started yet — starts on ${startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
        });
      }
      return res.status(400).json({ 
        success: false, 
        message: 'No active approved OD request found for check-in' 
      });
    }

    // Calculate geofencing — real distance check
    let isWithinVenue = null;
    let distanceFromVenue = null;
    if (latitude && longitude && requests[0].venue_latitude && requests[0].venue_longitude) {
      distanceFromVenue = haversineDistance(
        parseFloat(latitude), parseFloat(longitude),
        parseFloat(requests[0].venue_latitude), parseFloat(requests[0].venue_longitude)
      );
      const radius = requests[0].venue_radius_meters || 5000;
      isWithinVenue = distanceFromVenue <= radius;
    } else if (latitude && longitude) {
      isWithinVenue = true; // fallback if venue coords not set
    }

    const photoPath = req.file ? req.file.path : null; // Cloudinary secure_url

    const [result] = await pool.query(
      `INSERT INTO location_checkins 
       (od_request_id, student_id, latitude, longitude, location_name, 
        checkin_type, photo_proof, notes, is_within_venue, distance_from_venue, is_within_radius)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [od_request_id, req.user.id, latitude, longitude, location_name,
       checkin_type, photoPath, notes, isWithinVenue, 
       distanceFromVenue ? Math.round(distanceFromVenue) : null, isWithinVenue]
    );

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'LOCATION_CHECKIN', 'od_request', od_request_id, 
       JSON.stringify({ checkin_type, location_name })]
    );

    // Emit socket event for real-time tracking
    const io = req.app.get('io');
    io.to('tracking').emit('student_checkin', {
      studentId: req.user.id,
      studentName: req.user.name,
      odRequestId: od_request_id,
      eventName: requests[0].event_name,
      checkinType: checkin_type,
      location: location_name,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: isWithinVenue === false 
        ? `Check-in recorded (${(distanceFromVenue/1000).toFixed(1)}km from venue — outside radius)` 
        : 'Check-in recorded successfully',
      data: { 
        id: result.insertId,
        isWithinVenue,
        distanceFromVenue: distanceFromVenue ? Math.round(distanceFromVenue) : null
      }
    });

  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ success: false, message: 'Failed to record check-in' });
  }
});

// @route   GET /api/tracking/my-checkins/:odRequestId
// @desc    Get student's check-ins for an OD request
// @access  Student
router.get('/my-checkins/:odRequestId', isStudent, async (req, res) => {
  try {
    const [checkins] = await pool.query(
      `SELECT * FROM location_checkins 
       WHERE od_request_id = ? AND student_id = ?
       ORDER BY checkin_time DESC`,
      [req.params.odRequestId, req.user.id]
    );

    res.json({ success: true, data: checkins });

  } catch (error) {
    console.error('Get checkins error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch check-ins' });
  }
});

// @route   GET /api/tracking/active-event
// @desc    Get student's active event (if any)
// @access  Student
router.get('/active-event', isStudent, async (req, res) => {
  try {
    const [events] = await pool.query(
      `SELECT od.*, 
              od.checkin_interval_minutes, od.venue_latitude, od.venue_longitude, 
              od.venue_radius_meters, od.event_phase, od.checkin_compliance_rate,
              od.total_expected_checkins, od.total_actual_checkins,
              (SELECT COUNT(*) FROM location_checkins WHERE od_request_id = od.id) as checkin_count,
              (SELECT MAX(checkin_time) FROM location_checkins WHERE od_request_id = od.id) as last_checkin
       FROM od_requests od
       WHERE od.student_id = ? AND od.status = 'approved'
         AND od.event_start_date <= DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND od.event_end_date >= CURDATE()
       LIMIT 1`,
      [req.user.id]
    );

    if (events.length === 0) {
      return res.json({ success: true, data: null });
    }

    // Get today's check-ins
    const [todayCheckins] = await pool.query(
      `SELECT * FROM location_checkins 
       WHERE od_request_id = ? AND DATE(checkin_time) = CURDATE()
       ORDER BY checkin_time DESC`,
      [events[0].id]
    );

    res.json({
      success: true,
      data: {
        ...events[0],
        todayCheckins
      }
    });

  } catch (error) {
    console.error('Get active event error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch active event' });
  }
});

// ==================== RESULT SUBMISSION ROUTES ====================

// @route   POST /api/tracking/submit-result
// @desc    Submit event results
// @access  Student
router.post('/submit-result', isStudent, upload.fields([
  { name: 'certificate', maxCount: 1 },
  { name: 'photos', maxCount: 10 }
]), [
  body('od_request_id').isInt().withMessage('OD request ID is required'),
  body('result_type').isIn(['winner', 'runner_up', 'finalist', 'participated', 'special_mention', 'other']).optional(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { 
      od_request_id, result_type = 'participated', position,
      achievement_description, award_name, prize_details,
      prize_amount, what_happened, learning_outcomes,
      team_reflection, feedback
    } = req.body;

    // Verify the OD request belongs to student
    const [requests] = await pool.query(
      `SELECT * FROM od_requests WHERE id = ? AND student_id = ? AND status = 'approved'`,
      [od_request_id, req.user.id]
    );

    if (requests.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot submit result. No approved OD request found.' 
      });
    }

    // Calculate late submission info
    const eventEndDate = new Date(requests[0].event_end_date);
    const now = new Date();
    const daysAfterEvent = Math.max(0, Math.floor((now - eventEndDate) / (1000 * 60 * 60 * 24)));
    const deadline = requests[0].result_submission_deadline ? new Date(requests[0].result_submission_deadline) : null;
    const isLate = deadline ? now > deadline : daysAfterEvent > 14;

    // Check if already submitted
    const [existingResult] = await pool.query(
      'SELECT id FROM event_results WHERE od_request_id = ? AND student_id = ?',
      [od_request_id, req.user.id]
    );

    if (existingResult.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Result already submitted for this event' 
      });
    }

    // Handle uploaded files (Cloudinary returns secure_url in f.path)
    const certificatePath = req.files?.certificate?.[0]?.path || null;
    const uploadedPhotos = (req.files?.photos || []).map(f => ({
      name: f.originalname,
      url: f.path,  // Cloudinary secure_url
    }));

    const [result] = await pool.query(
      `INSERT INTO event_results 
       (od_request_id, student_id, result_type, position, achievement_description,
        award_name, prize_details, prize_amount, certificate_path,
        what_happened, learning_outcomes, team_reflection, feedback, photo_urls,
        is_late_submission, days_after_event)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [od_request_id, req.user.id, result_type, position || null, achievement_description || null,
       award_name || null, prize_details || null, prize_amount || null, certificatePath,
       what_happened || null, learning_outcomes || null, team_reflection || null,
       feedback || null, uploadedPhotos.length ? JSON.stringify(uploadedPhotos) : null,
       isLate, daysAfterEvent]
    );

    // Mark OD request as result_submitted + completed phase
    await pool.query(
      'UPDATE od_requests SET result_submitted = TRUE, event_phase = ? WHERE id = ?',
      ['completed', od_request_id]
    ).catch(() => {});

    // Notify all staff and HODs
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, related_to, related_id)
       SELECT id, ?, ?, 'info', 'event_result', ?
       FROM users WHERE role IN ('staff', 'hod')`,
      ['🏆 Event Result Submitted', 
       `${req.user.name} submitted post-event report for "${requests[0].event_name}"`
       + (result_type !== 'participated' ? ` — ${result_type.replace('_',' ')} ${award_name ? '('+award_name+')' : ''}` : ''),
       result.insertId]
    ).catch(() => {});

    await pool.query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
       VALUES (?, 'SUBMIT_RESULT', 'event_result', ?, ?)`,
      [req.user.id, result.insertId, JSON.stringify({ result_type, award_name })]
    ).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Post-event report submitted successfully!',
      data: { id: result.insertId }
    });

  } catch (error) {
    console.error('Submit result error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit result' });
  }
});

// @route   POST /api/tracking/result/:resultId/photos
// @desc    Add photos to event result
// @access  Student
router.post('/result/:resultId/photos', isStudent, uploadPhotos, async (req, res) => {
  try {
    // Verify ownership
    const [results] = await pool.query(
      'SELECT * FROM event_results WHERE id = ? AND student_id = ?',
      [req.params.resultId, req.user.id]
    );

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Result not found' });
    }

    const existingPhotos = JSON.parse(results[0].photos || '[]');
    const newPhotos = req.files.map(f => ({
      name: f.originalname,
      path: f.path
    }));

    await pool.query(
      'UPDATE event_results SET photos = ? WHERE id = ?',
      [JSON.stringify([...existingPhotos, ...newPhotos]), req.params.resultId]
    );

    res.json({
      success: true,
      message: 'Photos uploaded successfully'
    });

  } catch (error) {
    console.error('Upload photos error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload photos' });
  }
});

// @route   GET /api/tracking/my-results
// @desc    Get student's event results
// @access  Student
router.get('/my-results', isStudent, async (req, res) => {
  try {
    const [results] = await pool.query(
      `SELECT er.*, od.event_name, od.event_type, od.venue, od.event_start_date, od.event_end_date
       FROM event_results er
       JOIN od_requests od ON er.od_request_id = od.id
       WHERE er.student_id = ?
       ORDER BY er.submitted_at DESC`,
      [req.user.id]
    );
    const parsed = results.map(r => ({
      ...r,
      photo_urls: typeof r.photo_urls === 'string' ? JSON.parse(r.photo_urls || '[]') : (r.photo_urls || []),
      photos: typeof r.photos === 'string' ? JSON.parse(r.photos || '[]') : (r.photos || [])
    }));
    res.json({ success: true, data: parsed });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch results' });
  }
});

// ==================== STAFF/HOD TRACKING ROUTES ====================

// @route   GET /api/tracking/live
// @desc    Get live tracking of all students at events (with compliance stats)
// @access  Staff/HOD
router.get('/live', isStaffOrHOD, async (req, res) => {
  try {
    const { department } = req.query;

    let query = `
      SELECT od.id, od.request_id, od.event_name, od.venue, od.event_start_date, od.event_end_date,
             od.checkin_compliance_rate, od.total_expected_checkins, od.total_actual_checkins,
             od.checkin_interval_minutes, od.event_phase,
             u.id as student_id, u.name as student_name, u.department,
             (SELECT COUNT(*) FROM location_checkins WHERE od_request_id = od.id) as total_checkins,
             (SELECT checkin_time FROM location_checkins WHERE od_request_id = od.id ORDER BY checkin_time DESC LIMIT 1) as last_checkin,
             (SELECT location_name FROM location_checkins WHERE od_request_id = od.id ORDER BY checkin_time DESC LIMIT 1) as last_location,
             (SELECT COUNT(*) FROM location_checkins WHERE od_request_id = od.id AND DATE(checkin_time) = CURDATE()) as checkins_today,
             (SELECT COUNT(*) FROM location_checkins WHERE od_request_id = od.id AND is_within_radius = FALSE) as outside_venue_count,
             TIMESTAMPDIFF(MINUTE, 
               (SELECT MAX(checkin_time) FROM location_checkins WHERE od_request_id = od.id), 
               NOW()
             ) as minutes_since_last_checkin
      FROM od_requests od
      JOIN users u ON od.student_id = u.id
      WHERE od.status = 'approved'
        AND od.event_start_date <= CURDATE()
        AND od.event_end_date >= CURDATE()
    `;
    
    const params = [];
    
    if (department) {
      query += ' AND u.department = ?';
      params.push(department);
    } else if (req.user.role === 'staff') {
      query += ' AND u.department = ?';
      params.push(req.user.department);
    }

    query += ' ORDER BY last_checkin DESC';

    const [activeStudents] = await pool.query(query, params);

    res.json({ success: true, data: activeStudents });

  } catch (error) {
    console.error('Get live tracking error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tracking data' });
  }
});

// @route   GET /api/tracking/student/:studentId/checkins
// @desc    Get all check-ins for a student's event
// @access  Staff/HOD
router.get('/student/:studentId/checkins', isStaffOrHOD, async (req, res) => {
  try {
    const { odRequestId } = req.query;

    let query = `
      SELECT lc.*, od.event_name
      FROM location_checkins lc
      JOIN od_requests od ON lc.od_request_id = od.id
      WHERE lc.student_id = ?
    `;
    const params = [req.params.studentId];

    if (odRequestId) {
      query += ' AND lc.od_request_id = ?';
      params.push(odRequestId);
    }

    query += ' ORDER BY lc.checkin_time DESC';

    const [checkins] = await pool.query(query, params);

    res.json({ success: true, data: checkins });

  } catch (error) {
    console.error('Get student checkins error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch check-ins' });
  }
});

// @route   GET /api/tracking/results
// @desc    Get all submitted event results
// @access  Staff/HOD
router.get('/results', isStaffOrHOD, async (req, res) => {
  try {
    const { department, result_type, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT er.*, 
             od.event_name, od.event_type, od.venue, od.event_start_date, od.event_end_date,
             u.name as student_name, u.department as student_department,
             u.employee_id as register_number, u.year_of_study, u.section
      FROM event_results er
      JOIN od_requests od ON er.od_request_id = od.id
      JOIN users u ON er.student_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (department) {
      query += ' AND u.department = ?';
      params.push(department);
    }
    if (result_type) {
      query += ' AND er.result_type = ?';
      params.push(result_type);
    }
    if (search) {
      query += ' AND (u.name LIKE ? OR od.event_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY er.submitted_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [results] = await pool.query(query, params);
    const parsed = results.map(r => ({
      ...r,
      photo_urls: typeof r.photo_urls === 'string' ? JSON.parse(r.photo_urls || '[]') : (r.photo_urls || []),
      photos: typeof r.photos === 'string' ? JSON.parse(r.photos || '[]') : (r.photos || [])
    }));

    res.json({ success: true, data: parsed });

  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch results' });
  }
});

// @route   PUT /api/tracking/results/:id/verify
// @desc    Verify / unverify a student result
// @access  Staff/HOD
router.put('/results/:id/verify', isStaffOrHOD, async (req, res) => {
  try {
    const { notes, verified = true } = req.body;
    await pool.query(
      `UPDATE event_results SET is_verified = ?, verified_by_staff = ?,
       staff_verification_notes = ?, verified_at = ? WHERE id = ?`,
      [verified, verified, notes || null, verified ? new Date() : null, req.params.id]
    );
    res.json({ success: true, message: verified ? 'Result verified' : 'Verification removed' });
  } catch (error) {
    console.error('Verify result error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify result' });
  }
});

// @route   PUT /api/tracking/results/:id/verify
// @desc    Verify student's event result
// @access  Staff/HOD
router.put('/results/:id/verify', isStaffOrHOD, async (req, res) => {
  try {
    const { notes } = req.body;

    await pool.query(
      `UPDATE event_results SET 
       verified_by_staff = TRUE,
       staff_verification_notes = ?
       WHERE id = ?`,
      [notes, req.params.id]
    );

    res.json({
      success: true,
      message: 'Result verified successfully'
    });

  } catch (error) {
    console.error('Verify result error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify result' });
  }
});

// @route   GET /api/tracking/checkins/:requestId
// @desc    Get all check-ins for a specific OD request
// @access  Authenticated
router.get('/checkins/:requestId', async (req, res) => {
  try {
    const [checkins] = await pool.query(
      `SELECT * FROM location_checkins 
       WHERE od_request_id = ?
       ORDER BY checkin_time DESC`,
      [req.params.requestId]
    );

    res.json({ success: true, data: checkins });

  } catch (error) {
    console.error('Get checkins error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch check-ins' });
  }
});

// @route   GET /api/tracking/live/:requestId
// @desc    Get live check-ins for a specific OD request (HOD)
// @access  Staff/HOD
router.get('/live/:requestId', isStaffOrHOD, async (req, res) => {
  try {
    const [checkins] = await pool.query(
      `SELECT lc.*, u.name as student_name
       FROM location_checkins lc
       JOIN users u ON lc.student_id = u.id
       WHERE lc.od_request_id = ?
       ORDER BY lc.checkin_time DESC`,
      [req.params.requestId]
    );

    res.json({ success: true, data: checkins });

  } catch (error) {
    console.error('Get live tracking error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tracking data' });
  }
});

// @route   GET /api/tracking/pending-results
// @desc    Get events pending result submission for a student
// @access  Student
router.get('/pending-results', isStudent, async (req, res) => {
  try {
    const [pending] = await pool.query(`
      SELECT od.id, od.event_name, od.event_type, od.venue, od.event_start_date, od.event_end_date,
             od.result_submission_deadline, od.result_submitted, od.event_phase,
             od.checkin_compliance_rate,
             DATEDIFF(od.result_submission_deadline, NOW()) as days_until_deadline,
             (SELECT COUNT(*) FROM event_results WHERE od_request_id = od.id AND student_id = od.student_id) as has_result
      FROM od_requests od
      WHERE od.student_id = ? AND od.status = 'approved'
        AND od.event_end_date < CURDATE()
        AND od.result_submitted = FALSE
      ORDER BY od.result_submission_deadline ASC
    `, [req.user.id]);

    res.json({ success: true, data: pending });
  } catch (error) {
    console.error('Get pending results error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending results' });
  }
});

// @route   GET /api/tracking/compliance-summary
// @desc    Get compliance summary for staff/HOD dashboard
// @access  Staff/HOD
router.get('/compliance-summary', isStaffOrHOD, async (req, res) => {
  try {
    const [active] = await pool.query(`
      SELECT COUNT(*) as total_active,
             SUM(CASE WHEN checkin_compliance_rate >= 80 THEN 1 ELSE 0 END) as good_compliance,
             SUM(CASE WHEN checkin_compliance_rate >= 40 AND checkin_compliance_rate < 80 THEN 1 ELSE 0 END) as medium_compliance,
             SUM(CASE WHEN checkin_compliance_rate < 40 THEN 1 ELSE 0 END) as poor_compliance
      FROM od_requests
      WHERE status = 'approved' AND event_phase = 'active'
    `);

    const [overdue] = await pool.query(`
      SELECT COUNT(*) as count FROM od_requests
      WHERE status = 'approved' AND event_phase = 'overdue'
    `);

    const [pendingResults] = await pool.query(`
      SELECT COUNT(*) as count FROM od_requests
      WHERE status = 'approved' AND event_phase = 'result_pending'
    `);

    res.json({
      success: true,
      data: {
        ...(active[0] || {}),
        overdue_results: overdue[0]?.count || 0,
        pending_results: pendingResults[0]?.count || 0
      }
    });
  } catch (error) {
    console.error('Get compliance summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch compliance data' });
  }
});

export default router;
