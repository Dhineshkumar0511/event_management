import pool from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

const migrate = async () => {
  console.log('🚀 Starting database migration...');

  try {
    // Users table (students, staff, hod)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        employee_id VARCHAR(50) UNIQUE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role ENUM('student', 'staff', 'hod') NOT NULL DEFAULT 'student',
        department VARCHAR(100),
        year_of_study INT,
        section VARCHAR(10),
        phone VARCHAR(20),
        profile_image VARCHAR(500),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_role (role),
        INDEX idx_department (department)
      )
    `);
    console.log('✅ Users table created');

    // Events/OD Requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS od_requests (
        id INT PRIMARY KEY AUTO_INCREMENT,
        request_id VARCHAR(50) UNIQUE NOT NULL,
        student_id INT NOT NULL,
        event_name VARCHAR(500) NOT NULL,
        event_type ENUM('hackathon', 'symposium', 'sports', 'workshop', 'conference', 'cultural', 'other') NOT NULL,
        event_description TEXT,
        organizer_name VARCHAR(255),
        organizer_contact VARCHAR(100),
        event_website VARCHAR(500),
        venue VARCHAR(500) NOT NULL,
        location_city VARCHAR(100),
        location_state VARCHAR(100),
        event_start_date DATE NOT NULL,
        event_end_date DATE NOT NULL,
        event_start_time TIME,
        event_end_time TIME,
        parent_name VARCHAR(255),
        parent_phone VARCHAR(20),
        parent_email VARCHAR(255),
        emergency_contact VARCHAR(20),
        status ENUM('draft', 'pending', 'staff_review', 'staff_approved', 'staff_rejected', 'hod_review', 'approved', 'rejected') DEFAULT 'draft',
        staff_id INT,
        staff_comments TEXT,
        staff_reviewed_at TIMESTAMP,
        hod_id INT,
        hod_comments TEXT,
        hod_reviewed_at TIMESTAMP,
        ai_verification_score DECIMAL(5,2),
        ai_verification_details JSON,
        is_verified_real BOOLEAN,
        letter_generated BOOLEAN DEFAULT FALSE,
        letter_path VARCHAR(500),
        supporting_documents JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (hod_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_status (status),
        INDEX idx_event_date (event_start_date),
        INDEX idx_student (student_id)
      )
    `);
    console.log('✅ OD Requests table created');

    // Team members table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id INT PRIMARY KEY AUTO_INCREMENT,
        od_request_id INT NOT NULL,
        student_id INT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        register_number VARCHAR(50),
        department VARCHAR(100),
        year_of_study INT,
        section VARCHAR(10),
        phone VARCHAR(20),
        parent_contact VARCHAR(20),
        is_team_lead BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (od_request_id) REFERENCES od_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_od_request (od_request_id)
      )
    `);
    console.log('✅ Team Members table created');

    // Tracking/Check-ins table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS location_checkins (
        id INT PRIMARY KEY AUTO_INCREMENT,
        od_request_id INT NOT NULL,
        student_id INT NOT NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        location_name VARCHAR(255),
        checkin_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checkin_type ENUM('arrival', 'hourly', 'departure', 'manual') DEFAULT 'manual',
        photo_proof VARCHAR(500),
        notes TEXT,
        is_within_venue BOOLEAN,
        FOREIGN KEY (od_request_id) REFERENCES od_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_od_checkin (od_request_id),
        INDEX idx_student_checkin (student_id),
        INDEX idx_checkin_time (checkin_time)
      )
    `);
    console.log('✅ Location Check-ins table created');

    // Event Results table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS event_results (
        id INT PRIMARY KEY AUTO_INCREMENT,
        od_request_id INT NOT NULL,
        student_id INT NOT NULL,
        result_type ENUM('winner', 'runner_up', 'participation', 'special_mention', 'other') DEFAULT 'participation',
        position VARCHAR(100),
        achievement_description TEXT,
        prize_amount DECIMAL(10, 2),
        certificate_path VARCHAR(500),
        photos JSON,
        feedback TEXT,
        learning_outcomes TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified_by_staff BOOLEAN DEFAULT FALSE,
        staff_verification_notes TEXT,
        FOREIGN KEY (od_request_id) REFERENCES od_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_od_result (od_request_id)
      )
    `);
    console.log('✅ Event Results table created');

    // Notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('info', 'success', 'warning', 'error', 'action_required') DEFAULT 'info',
        related_to VARCHAR(50),
        related_id INT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_notification (user_id),
        INDEX idx_unread (user_id, is_read)
      )
    `);
    console.log('✅ Notifications table created');

    // Activity logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INT,
        details JSON,
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user_activity (user_id),
        INDEX idx_entity (entity_type, entity_id)
      )
    `);
    console.log('✅ Activity Logs table created');

    // OD Letter templates table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS letter_templates (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        template_type ENUM('od_request', 'approval', 'rejection') NOT NULL,
        content TEXT NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Letter Templates table created');

    // Staff/HOD Availability table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff_availability (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        title VARCHAR(255),
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_avail (user_id),
        INDEX idx_date (date)
      )
    `);
    console.log('✅ Staff Availability table created');

    // Enhance event_results with extra columns (ignore errors if already exist)
    const alterColumns = [
      "ALTER TABLE event_results ADD COLUMN IF NOT EXISTS award_name VARCHAR(255)",
      "ALTER TABLE event_results ADD COLUMN IF NOT EXISTS prize_details TEXT",
      "ALTER TABLE event_results ADD COLUMN IF NOT EXISTS what_happened TEXT",
      "ALTER TABLE event_results ADD COLUMN IF NOT EXISTS team_reflection TEXT",
      "ALTER TABLE event_results ADD COLUMN IF NOT EXISTS photo_urls JSON",
      "ALTER TABLE event_results ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE",
      "ALTER TABLE event_results ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP NULL",
      "ALTER TABLE event_results MODIFY COLUMN result_type ENUM('winner','runner_up','finalist','participated','special_mention','other') DEFAULT 'participated'"
    ];
    for (const sql of alterColumns) {
      try { await pool.query(sql); } catch {}
    }
    console.log('✅ Event Results table enhanced');

    // Add signature columns to od_requests for OD Letter feature
    const sigColumns = [
      "ALTER TABLE od_requests ADD COLUMN IF NOT EXISTS staff_signature LONGTEXT",
      "ALTER TABLE od_requests ADD COLUMN IF NOT EXISTS hod_signature LONGTEXT",
      "ALTER TABLE od_requests MODIFY COLUMN event_name VARCHAR(500) NOT NULL",
    ];
    for (const sql of sigColumns) {
      try { await pool.query(sql); } catch {}
    }
    console.log('✅ OD Letter signature columns added');

    // Add parent_contact column to team_members
    try { await pool.query("ALTER TABLE team_members ADD COLUMN IF NOT EXISTS parent_contact VARCHAR(20) AFTER phone"); } catch {}
    console.log('✅ team_members parent_contact column ensured');

    // ═══════════════════════════════════════════════════════════════
    // NEW: Automation, deadline enforcement & compliance tracking
    // ═══════════════════════════════════════════════════════════════

    // Add deadline & compliance columns to od_requests
    const automationColumns = [
      "ALTER TABLE od_requests ADD COLUMN IF NOT EXISTS result_submitted BOOLEAN DEFAULT FALSE",
      "ALTER TABLE od_requests ADD COLUMN IF NOT EXISTS result_submission_deadline DATETIME NULL",
      "ALTER TABLE od_requests ADD COLUMN IF NOT EXISTS checkin_interval_minutes INT DEFAULT 180",
      "ALTER TABLE od_requests ADD COLUMN IF NOT EXISTS venue_latitude DECIMAL(10,8) NULL",
      "ALTER TABLE od_requests ADD COLUMN IF NOT EXISTS venue_longitude DECIMAL(11,8) NULL",
      "ALTER TABLE od_requests ADD COLUMN IF NOT EXISTS venue_radius_meters INT DEFAULT 5000",
      "ALTER TABLE od_requests ADD COLUMN IF NOT EXISTS event_phase ENUM('upcoming','active','ended','result_pending','completed','overdue') DEFAULT 'upcoming'",
      "ALTER TABLE od_requests ADD COLUMN IF NOT EXISTS checkin_compliance_rate DECIMAL(5,2) DEFAULT 0",
      "ALTER TABLE od_requests ADD COLUMN IF NOT EXISTS total_expected_checkins INT DEFAULT 0",
      "ALTER TABLE od_requests ADD COLUMN IF NOT EXISTS total_actual_checkins INT DEFAULT 0",
      "ALTER TABLE od_requests ADD COLUMN IF NOT EXISTS last_reminder_sent_at DATETIME NULL",
      "ALTER TABLE od_requests ADD COLUMN IF NOT EXISTS reminder_count INT DEFAULT 0",
    ];
    for (const sql of automationColumns) {
      try { await pool.query(sql); } catch {}
    }
    console.log('✅ Automation & compliance columns added to od_requests');

    // Add geofencing columns to location_checkins
    const checkinColumns = [
      "ALTER TABLE location_checkins ADD COLUMN IF NOT EXISTS distance_from_venue DECIMAL(10,2) NULL",
      "ALTER TABLE location_checkins ADD COLUMN IF NOT EXISTS is_within_radius BOOLEAN DEFAULT NULL",
      "ALTER TABLE location_checkins ADD COLUMN IF NOT EXISTS device_info VARCHAR(255) NULL",
    ];
    for (const sql of checkinColumns) {
      try { await pool.query(sql); } catch {}
    }
    console.log('✅ Geofencing columns added to location_checkins');

    // Add late submission tracking to event_results
    const resultColumns = [
      "ALTER TABLE event_results ADD COLUMN IF NOT EXISTS is_late_submission BOOLEAN DEFAULT FALSE",
      "ALTER TABLE event_results ADD COLUMN IF NOT EXISTS days_after_event INT DEFAULT 0",
      "ALTER TABLE event_results ADD COLUMN IF NOT EXISTS deadline_extension_granted BOOLEAN DEFAULT FALSE",
      "ALTER TABLE event_results ADD COLUMN IF NOT EXISTS extended_deadline DATETIME NULL",
    ];
    for (const sql of resultColumns) {
      try { await pool.query(sql); } catch {}
    }
    console.log('✅ Late submission tracking columns added to event_results');

    // Enhanced notifications with category
    const notifColumns = [
      "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category ENUM('system','checkin','deadline','approval','result','reminder') DEFAULT 'system'",
      "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url VARCHAR(500) NULL",
      "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority ENUM('low','normal','high','urgent') DEFAULT 'normal'",
      "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS expires_at DATETIME NULL",
    ];
    for (const sql of notifColumns) {
      try { await pool.query(sql); } catch {}
    }
    console.log('✅ Enhanced notification columns added');

    // Add password reset columns to users
    const passwordResetCols = [
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255) NULL",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires DATETIME NULL",
    ];
    for (const sql of passwordResetCols) {
      try { await pool.query(sql); } catch {}
    }
    console.log('✅ Password reset columns added to users');

    // ═══════════════════════════════════════════════════════════════
    // Leave Request system
    // ═══════════════════════════════════════════════════════════════
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id INT PRIMARY KEY AUTO_INCREMENT,
        leave_id VARCHAR(50) UNIQUE NOT NULL,
        student_id INT NOT NULL,
        leave_type ENUM('sick','casual','emergency','medical','family','other') NOT NULL,
        leave_mode ENUM('pre_leave','post_leave') NOT NULL DEFAULT 'pre_leave',
        from_date DATE NOT NULL,
        to_date DATE NOT NULL,
        days_count INT NOT NULL DEFAULT 1,
        reason TEXT NOT NULL,
        contact_during_leave VARCHAR(20),
        parent_name VARCHAR(100),
        parent_phone VARCHAR(20),
        document_url VARCHAR(500),
        status ENUM('pending','staff_approved','staff_rejected','approved','rejected') NOT NULL DEFAULT 'pending',
        staff_id INT,
        staff_remarks TEXT,
        staff_reviewed_at TIMESTAMP NULL,
        hod_remarks TEXT,
        hod_reviewed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_student (student_id),
        INDEX idx_status (status),
        INDEX idx_from_date (from_date)
      )
    `);
    console.log('✅ Leave Requests table created');

    // WhatsApp config table (stores HOD settings: auto_enabled, saved_contacts, notify_group_id)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_config (
        id INT PRIMARY KEY DEFAULT 1,
        auto_enabled BOOLEAN DEFAULT FALSE,
        notify_group_id VARCHAR(100) DEFAULT '',
        saved_contacts JSON DEFAULT '[]',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`INSERT IGNORE INTO whatsapp_config (id) VALUES (1)`);
    console.log('✅ WhatsApp config table created');

    console.log('\n✨ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
};

migrate();
