import pool from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

const migrateFeatures = async () => {
  console.log('🚀 Starting feature enhancement migration...');

  try {
    // ═══════════════════════════════════════════════════════════════
    // 1. Announcements table (HOD broadcasts to all users)
    // ═══════════════════════════════════════════════════════════════
    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        priority ENUM('low','normal','high','urgent') DEFAULT 'normal',
        target_role ENUM('all','student','staff') DEFAULT 'all',
        target_department VARCHAR(100) DEFAULT NULL,
        created_by INT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        expires_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_active (is_active),
        INDEX idx_target (target_role)
      )
    `);
    console.log('✅ Announcements table created');

    // ═══════════════════════════════════════════════════════════════
    // 2. Request comments / messaging thread
    // ═══════════════════════════════════════════════════════════════
    await pool.query(`
      CREATE TABLE IF NOT EXISTS request_comments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        entity_type ENUM('od_request','leave_request') NOT NULL,
        entity_id INT NOT NULL,
        user_id INT NOT NULL,
        message TEXT NOT NULL,
        is_internal BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_entity (entity_type, entity_id),
        INDEX idx_user (user_id)
      )
    `);
    console.log('✅ Request Comments table created');

    // ═══════════════════════════════════════════════════════════════
    // 3. Rejection templates for staff/HOD
    // ═══════════════════════════════════════════════════════════════
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rejection_templates (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        category ENUM('missing_docs','fake_event','date_conflict','policy','other') DEFAULT 'other',
        created_by INT,
        is_global BOOLEAN DEFAULT TRUE,
        usage_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    // Seed default templates
    await pool.query(`
      INSERT IGNORE INTO rejection_templates (id, title, message, category, is_global) VALUES
      (1, 'Missing Supporting Documents', 'Your request is missing required supporting documents. Please resubmit with: invitation letter, event registration confirmation, or official event webpage screenshot.', 'missing_docs', TRUE),
      (2, 'Event Could Not Be Verified', 'We were unable to verify this event through our verification process. Please provide additional proof such as the official event website link or organizer contact details.', 'fake_event', TRUE),
      (3, 'Date Conflict with Exams', 'The requested dates conflict with scheduled academic activities. OD requests during examination periods require special approval from the Dean.', 'date_conflict', TRUE),
      (4, 'Insufficient Notice Period', 'OD requests must be submitted at least 3 working days before the event start date as per institutional policy.', 'policy', TRUE),
      (5, 'Exceeded OD Limit', 'You have reached the maximum number of OD days allowed for this semester. Please consult your class advisor for exceptions.', 'policy', TRUE),
      (6, 'Incomplete Team Information', 'Team member details are incomplete. Please provide register numbers and department details for all participating students.', 'missing_docs', TRUE)
    `);
    console.log('✅ Rejection Templates table created and seeded');

    // ═══════════════════════════════════════════════════════════════
    // 4. Grievance / Appeal system
    // ═══════════════════════════════════════════════════════════════
    await pool.query(`
      CREATE TABLE IF NOT EXISTS grievances (
        id INT PRIMARY KEY AUTO_INCREMENT,
        grievance_id VARCHAR(50) UNIQUE NOT NULL,
        entity_type ENUM('od_request','leave_request') NOT NULL,
        entity_id INT NOT NULL,
        student_id INT NOT NULL,
        reason TEXT NOT NULL,
        additional_documents JSON DEFAULT NULL,
        status ENUM('open','under_review','resolved','dismissed') DEFAULT 'open',
        resolved_by INT DEFAULT NULL,
        resolution_notes TEXT DEFAULT NULL,
        resolved_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_student (student_id),
        INDEX idx_status (status),
        INDEX idx_entity (entity_type, entity_id)
      )
    `);
    console.log('✅ Grievances table created');

    // ═══════════════════════════════════════════════════════════════
    // 5. Auto-approval rules
    // ═══════════════════════════════════════════════════════════════
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auto_approval_rules (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        rule_type ENUM('od','leave','both') DEFAULT 'both',
        conditions JSON NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Auto-Approval Rules table created');

    // ═══════════════════════════════════════════════════════════════
    // 6. Leave balance / quota tracking
    // ═══════════════════════════════════════════════════════════════
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_balances (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        academic_year VARCHAR(20) NOT NULL,
        sick_total INT DEFAULT 10,
        sick_used INT DEFAULT 0,
        casual_total INT DEFAULT 5,
        casual_used INT DEFAULT 0,
        emergency_total INT DEFAULT 3,
        emergency_used INT DEFAULT 0,
        medical_total INT DEFAULT 15,
        medical_used INT DEFAULT 0,
        od_total INT DEFAULT 20,
        od_used INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uniq_student_year (student_id, academic_year),
        INDEX idx_student (student_id)
      )
    `);
    console.log('✅ Leave Balances table created');

    // ═══════════════════════════════════════════════════════════════
    // 7. User sessions for active session management
    // ═══════════════════════════════════════════════════════════════
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        device_info VARCHAR(500),
        ip_address VARCHAR(50),
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_token (token_hash)
      )
    `);
    console.log('✅ User Sessions table created');

    // ═══════════════════════════════════════════════════════════════
    // 8. Add leave signature columns
    // ═══════════════════════════════════════════════════════════════
    const leaveSignCols = [
      "ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS staff_signature LONGTEXT",
      "ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS hod_signature LONGTEXT",
      "ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS hod_id INT DEFAULT NULL",
      "ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS document_path VARCHAR(500) DEFAULT NULL",
    ];
    for (const sql of leaveSignCols) {
      try { await pool.query(sql); } catch {}
    }
    console.log('✅ Leave signature columns added');

    // ═══════════════════════════════════════════════════════════════
    // 9. Certificate repository
    // ═══════════════════════════════════════════════════════════════
    await pool.query(`
      CREATE TABLE IF NOT EXISTS certificate_repository (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        od_request_id INT DEFAULT NULL,
        result_id INT DEFAULT NULL,
        title VARCHAR(255) NOT NULL,
        event_name VARCHAR(255),
        event_date DATE,
        certificate_url VARCHAR(500) NOT NULL,
        certificate_type ENUM('participation','winner','runner_up','merit','other') DEFAULT 'participation',
        is_verified BOOLEAN DEFAULT FALSE,
        verified_by INT DEFAULT NULL,
        verified_at TIMESTAMP NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (od_request_id) REFERENCES od_requests(id) ON DELETE SET NULL,
        FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_student (student_id),
        INDEX idx_event (event_name)
      )
    `);
    console.log('✅ Certificate Repository table created');

    // ═══════════════════════════════════════════════════════════════
    // 10. SLA tracking columns on od_requests and leave_requests
    // ═══════════════════════════════════════════════════════════════
    const slaCols = [
      "ALTER TABLE od_requests ADD COLUMN IF NOT EXISTS sla_deadline DATETIME NULL",
      "ALTER TABLE od_requests ADD COLUMN IF NOT EXISTS is_escalated BOOLEAN DEFAULT FALSE",
      "ALTER TABLE od_requests ADD COLUMN IF NOT EXISTS escalated_at DATETIME NULL",
      "ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS sla_deadline DATETIME NULL",
      "ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS is_escalated BOOLEAN DEFAULT FALSE",
      "ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS escalated_at DATETIME NULL",
    ];
    for (const sql of slaCols) {
      try { await pool.query(sql); } catch {}
    }
    console.log('✅ SLA tracking columns added');

    console.log('\n✨ All feature migrations completed successfully!');
  } catch (error) {
    console.error('❌ Feature migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
};

migrateFeatures();
