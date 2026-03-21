import cron from 'node-cron';
import pool from '../database/connection.js';
import { sendDailyGroupSummary } from './notificationService.js';

const RESULT_DEADLINE_DAYS = 7;
const CHECKIN_INTERVAL_MINUTES = 180; // 3 hours

/**
 * Haversine formula — distance between two GPS coordinates in meters
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Update event phases based on current date:
 *   upcoming → active → ended → result_pending → overdue
 */
async function updateEventPhases() {
  try {
    // upcoming → active (event started today or already started)
    await pool.query(`
      UPDATE od_requests SET event_phase = 'active'
      WHERE status = 'approved' AND event_phase = 'upcoming'
        AND event_start_date <= CURDATE() AND event_end_date >= CURDATE()
    `);

    // active → ended (event ended)
    await pool.query(`
      UPDATE od_requests SET event_phase = 'ended'
      WHERE status = 'approved' AND event_phase = 'active'
        AND event_end_date < CURDATE()
    `);

    // ended → result_pending (set deadline if not set)
    await pool.query(`
      UPDATE od_requests
      SET event_phase = 'result_pending',
          result_submission_deadline = DATE_ADD(event_end_date, INTERVAL ? DAY)
      WHERE status = 'approved' AND event_phase = 'ended'
        AND result_submitted = FALSE
        AND result_submission_deadline IS NULL
    `, [RESULT_DEADLINE_DAYS]);

    // result_pending → overdue (deadline passed, no submission)
    await pool.query(`
      UPDATE od_requests SET event_phase = 'overdue'
      WHERE status = 'approved' AND event_phase = 'result_pending'
        AND result_submitted = FALSE
        AND result_submission_deadline < NOW()
    `);

    // any → completed (result submitted)
    await pool.query(`
      UPDATE od_requests SET event_phase = 'completed'
      WHERE status = 'approved' AND result_submitted = TRUE
        AND event_phase NOT IN ('completed')
    `);
  } catch (error) {
    console.error('❌ [Cron] updateEventPhases error:', error.message);
  }
}

/**
 * Send check-in reminders to students with active events
 * who haven't checked in within the last checkin_interval_minutes
 */
async function sendCheckinReminders(io) {
  try {
    const [students] = await pool.query(`
      SELECT od.id AS od_request_id, od.student_id, od.event_name, od.checkin_interval_minutes,
             u.name AS student_name,
             (SELECT MAX(checkin_time) FROM location_checkins WHERE od_request_id = od.id) AS last_checkin
      FROM od_requests od
      JOIN users u ON od.student_id = u.id
      WHERE od.status = 'approved'
        AND od.event_phase = 'active'
        AND od.event_start_date <= CURDATE()
        AND od.event_end_date >= CURDATE()
    `);

    const now = new Date();

    for (const s of students) {
      const interval = s.checkin_interval_minutes || CHECKIN_INTERVAL_MINUTES;
      const lastCheckin = s.last_checkin ? new Date(s.last_checkin) : null;
      const minutesSinceLastCheckin = lastCheckin
        ? (now - lastCheckin) / (1000 * 60)
        : Infinity;

      if (minutesSinceLastCheckin >= interval) {
        // Insert notification
        const hoursAgo = lastCheckin
          ? `${Math.floor(minutesSinceLastCheckin / 60)}h ${Math.floor(minutesSinceLastCheckin % 60)}m ago`
          : 'never';

        await pool.query(
          `INSERT INTO notifications (user_id, title, message, type, category, priority, related_to, related_id, action_url)
           VALUES (?, ?, ?, 'warning', 'checkin', 'high', 'od_request', ?, ?)`,
          [
            s.student_id,
            '📍 Time to Check In!',
            `Your event "${s.event_name}" needs a check-in. Last check-in: ${hoursAgo}. Please open Active Event to check in now.`,
            s.od_request_id,
            '/student/active-event'
          ]
        );

        // Push real-time notification via socket
        if (io?.emitToUser) {
          io.emitToUser(s.student_id, 'checkin_reminder', {
            odRequestId: s.od_request_id,
            eventName: s.event_name,
            minutesSinceLastCheckin: Math.floor(minutesSinceLastCheckin),
            message: `Time to check in for "${s.event_name}"! Last check-in: ${hoursAgo}`
          });
          io.emitToUser(s.student_id, 'notification', {
            title: '📍 Time to Check In!',
            message: `Check in for "${s.event_name}" — last check-in: ${hoursAgo}`,
            type: 'warning'
          });
        }
      }
    }
  } catch (error) {
    console.error('❌ [Cron] sendCheckinReminders error:', error.message);
  }
}

/**
 * Send result submission reminders
 *  - Day after event ends: "Submit your results within 7 days"
 *  - 3 days before deadline: "3 days left to submit results"
 *  - 1 day before deadline: "Tomorrow is the deadline!"
 *  - On deadline day: "Today is the last day!"
 *  - After deadline: "Overdue — submit ASAP"
 */
async function sendResultReminders(io) {
  try {
    const [requests] = await pool.query(`
      SELECT od.id, od.student_id, od.event_name, od.event_end_date,
             od.result_submission_deadline, od.result_submitted, od.reminder_count,
             od.last_reminder_sent_at, od.event_phase,
             u.name AS student_name
      FROM od_requests od
      JOIN users u ON od.student_id = u.id
      WHERE od.status = 'approved'
        AND od.result_submitted = FALSE
        AND od.event_end_date < CURDATE()
        AND od.event_phase IN ('ended', 'result_pending', 'overdue')
    `);

    const now = new Date();

    for (const req of requests) {
      // Don't spam — max 1 reminder per 12 hours
      if (req.last_reminder_sent_at) {
        const hoursSinceLastReminder = (now - new Date(req.last_reminder_sent_at)) / (1000 * 60 * 60);
        if (hoursSinceLastReminder < 12) continue;
      }

      const deadline = req.result_submission_deadline ? new Date(req.result_submission_deadline) : null;
      const daysUntilDeadline = deadline
        ? Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
        : null;

      let title, message, priority;

      if (daysUntilDeadline !== null && daysUntilDeadline < 0) {
        // OVERDUE
        const daysLate = Math.abs(daysUntilDeadline);
        title = `🔴 Result ${daysLate} Day${daysLate > 1 ? 's' : ''} Overdue!`;
        message = `Your post-event report for "${req.event_name}" is ${daysLate} day${daysLate > 1 ? 's' : ''} overdue. Submit immediately to avoid penalties.`;
        priority = 'urgent';
      } else if (daysUntilDeadline !== null && daysUntilDeadline <= 1) {
        title = '⚠️ Result Deadline Tomorrow!';
        message = `Tomorrow is the last day to submit your post-event report for "${req.event_name}". Don't miss the deadline!`;
        priority = 'urgent';
      } else if (daysUntilDeadline !== null && daysUntilDeadline <= 3) {
        title = `⏰ ${daysUntilDeadline} Days Left — Submit Results`;
        message = `You have ${daysUntilDeadline} days to submit your post-event report for "${req.event_name}".`;
        priority = 'high';
      } else {
        title = '📝 Submit Your Event Results';
        message = `Your event "${req.event_name}" has ended. Please submit your post-event report${deadline ? ` by ${deadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}.`;
        priority = 'normal';
      }

      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, category, priority, related_to, related_id, action_url)
         VALUES (?, ?, ?, ?, 'deadline', ?, 'od_request', ?, '/student/submit-result')`,
        [req.student_id, title, message, priority === 'urgent' ? 'error' : 'warning', priority, req.id]
      );

      await pool.query(
        `UPDATE od_requests SET last_reminder_sent_at = NOW(), reminder_count = reminder_count + 1 WHERE id = ?`,
        [req.id]
      );

      // Real-time push
      if (io?.emitToUser) {
        io.emitToUser(req.student_id, 'notification', { title, message, type: priority === 'urgent' ? 'error' : 'warning' });
        io.emitToUser(req.student_id, 'result_deadline_reminder', {
          odRequestId: req.id,
          eventName: req.event_name,
          daysUntilDeadline,
          deadline: req.result_submission_deadline
        });
      }

      // Also notify staff about overdue results
      if (daysUntilDeadline !== null && daysUntilDeadline < 0) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, type, category, priority, related_to, related_id)
           SELECT u.id, ?, ?, 'warning', 'deadline', 'high', 'od_request', ?
           FROM users u WHERE u.role IN ('staff', 'hod') AND u.department = (
             SELECT department FROM users WHERE id = ?
           )`,
          [
            `⚠️ Overdue Result: ${req.student_name}`,
            `${req.student_name}'s report for "${req.event_name}" is ${Math.abs(daysUntilDeadline)} days overdue.`,
            req.id,
            req.student_id
          ]
        );
      }
    }
  } catch (error) {
    console.error('❌ [Cron] sendResultReminders error:', error.message);
  }
}

/**
 * Update check-in compliance statistics for active events
 */
async function updateComplianceStats() {
  try {
    // Calculate expected checkins based on event duration and interval
    await pool.query(`
      UPDATE od_requests od SET
        total_actual_checkins = (SELECT COUNT(*) FROM location_checkins WHERE od_request_id = od.id),
        total_expected_checkins = GREATEST(1, 
          FLOOR(
            TIMESTAMPDIFF(HOUR, 
              GREATEST(od.event_start_date, DATE_SUB(NOW(), INTERVAL 30 DAY)),
              LEAST(od.event_end_date, CURDATE())
            ) / (od.checkin_interval_minutes / 60)
          )
        ),
        checkin_compliance_rate = LEAST(100, ROUND(
          (SELECT COUNT(*) FROM location_checkins WHERE od_request_id = od.id) * 100.0 /
          GREATEST(1, FLOOR(
            TIMESTAMPDIFF(HOUR,
              GREATEST(od.event_start_date, DATE_SUB(NOW(), INTERVAL 30 DAY)),
              LEAST(od.event_end_date, CURDATE())
            ) / (od.checkin_interval_minutes / 60)
          )), 1
        ))
      WHERE od.status = 'approved'
        AND od.event_phase IN ('active', 'ended', 'result_pending', 'overdue', 'completed')
    `);
  } catch (error) {
    console.error('❌ [Cron] updateComplianceStats error:', error.message);
  }
}

/**
 * Notify upcoming events (1 day before)
 */
async function notifyUpcomingEvents(io) {
  try {
    const [upcoming] = await pool.query(`
      SELECT od.id, od.student_id, od.event_name, od.event_start_date, od.venue,
             u.name AS student_name
      FROM od_requests od
      JOIN users u ON od.student_id = u.id
      WHERE od.status = 'approved'
        AND od.event_start_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY)
        AND od.event_phase = 'upcoming'
        AND od.reminder_count = 0
    `);

    for (const ev of upcoming) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, category, priority, related_to, related_id, action_url)
         VALUES (?, ?, ?, 'info', 'reminder', 'high', 'od_request', ?, '/student/active-event')`,
        [
          ev.student_id,
          '🎯 Event Tomorrow!',
          `Your event "${ev.event_name}" at ${ev.venue} starts tomorrow. Don't forget to check in regularly (every 3 hours)!`,
          ev.id
        ]
      );
      await pool.query('UPDATE od_requests SET reminder_count = 1 WHERE id = ?', [ev.id]);

      if (io?.emitToUser) {
        io.emitToUser(ev.student_id, 'notification', {
          title: '🎯 Event Tomorrow!',
          message: `"${ev.event_name}" starts tomorrow — prepare to check in!`,
          type: 'info'
        });
      }
    }
  } catch (error) {
    console.error('❌ [Cron] notifyUpcomingEvents error:', error.message);
  }
}

/**
 * Send a daily WhatsApp group summary of pending OD + leave requests
 */
async function sendDailyWhatsAppSummary() {
  try {
    const [[odStats]] = await pool.query(`
      SELECT
        SUM(CASE WHEN status IN ('pending','staff_review') THEN 1 ELSE 0 END) AS pendingOD,
        SUM(CASE WHEN status = 'hod_review' THEN 1 ELSE 0 END) AS pendingHODOD,
        SUM(CASE WHEN status = 'approved' AND DATE(hod_reviewed_at) = CURDATE() THEN 1 ELSE 0 END) AS approvedODToday
      FROM od_requests
    `);
    const [[leaveStats]] = await pool.query(`
      SELECT
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingLeave,
        SUM(CASE WHEN status = 'staff_approved' THEN 1 ELSE 0 END) AS pendingHODLeave,
        SUM(CASE WHEN status = 'approved' AND DATE(hod_reviewed_at) = CURDATE() THEN 1 ELSE 0 END) AS approvedLeaveToday
      FROM leave_requests
    `);

    // Students on OD today (event is active today)
    const [odStudents] = await pool.query(`
      SELECT u.name, u.year_of_study, u.section, u.department,
             od.event_name, od.event_start_date, od.event_end_date
      FROM od_requests od
      JOIN users u ON od.student_id = u.id
      WHERE od.status = 'approved'
        AND od.event_start_date <= CURDATE()
        AND od.event_end_date >= CURDATE()
      ORDER BY u.year_of_study, u.section, u.name
    `);

    // Students on approved leave today
    const [leaveStudents] = await pool.query(`
      SELECT u.name, u.year_of_study, u.section, u.department,
             lr.leave_type, lr.from_date, lr.to_date, lr.days_count
      FROM leave_requests lr
      JOIN users u ON lr.student_id = u.id
      WHERE lr.status = 'approved'
        AND lr.from_date <= CURDATE()
        AND lr.to_date >= CURDATE()
      ORDER BY u.year_of_study, u.section, u.name
    `);

    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    await sendDailyGroupSummary({ date: today, ...odStats, ...leaveStats, odStudents, leaveStudents });
  } catch (error) {
    console.error('❌ [Cron] WhatsApp daily summary error:', error.message);
  }
}

/**
 * Initialize all cron jobs
 */
export function initCronJobs(io) {
  console.log('⏰ Initializing cron jobs...');

  // Every 3 hours: check-in reminders for active events
  cron.schedule('0 */3 * * *', () => {
    console.log('⏰ [Cron] Running check-in reminders...');
    sendCheckinReminders(io);
  });

  // Every hour: update event phases
  cron.schedule('0 * * * *', () => {
    console.log('⏰ [Cron] Updating event phases...');
    updateEventPhases();
    updateComplianceStats();
  });

  // Every day at 8:00 AM: result submission reminders
  cron.schedule('0 8 * * *', () => {
    console.log('⏰ [Cron] Sending result submission reminders...');
    sendResultReminders(io);
  });

  // Every day at 7:00 AM: notify upcoming events
  cron.schedule('0 7 * * *', () => {
    console.log('⏰ [Cron] Sending upcoming event notifications...');
    notifyUpcomingEvents(io);
  });

  // Every day at 8:30 AM: WhatsApp group daily summary
  cron.schedule('30 8 * * *', () => {
    console.log('⏰ [Cron] Sending daily WhatsApp group summary...');
    sendDailyWhatsAppSummary();
  });

  // Run immediately on startup
  setTimeout(() => {
    updateEventPhases();
    updateComplianceStats();
  }, 5000);

  console.log('✅ Cron jobs initialized:');
  console.log('   • Check-in reminders — every 3 hours');
  console.log('   • Event phase updates — every hour');
  console.log('   • Result deadline reminders — daily 8 AM');
  console.log('   • Upcoming event alerts — daily 7 AM');
  console.log('   • WhatsApp group summary — daily 8:30 AM');
}
