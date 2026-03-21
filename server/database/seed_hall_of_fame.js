import pool from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

const seedHallOfFame = async () => {
  console.log('🚀 Seeding Hall of Fame demo data...\n');

  try {
    // Get existing students
    const [students] = await pool.query(
      "SELECT id, name, department, year_of_study, section, employee_id FROM users WHERE role = 'student' AND is_active = TRUE LIMIT 10"
    );

    if (students.length === 0) {
      console.log('⚠️  No students found. Creating demo students...');
      const demoStudents = [
        ['DEMO-001', 'demo1@smvec.ac.in', '$2b$10$dummyhash000000000000000000000001', 'Arun Kumar', 'student', 'CSE', 3, 'A', '9876543001'],
        ['DEMO-002', 'demo2@smvec.ac.in', '$2b$10$dummyhash000000000000000000000002', 'Priya Sharma', 'student', 'IT', 2, 'B', '9876543002'],
        ['DEMO-003', 'demo3@smvec.ac.in', '$2b$10$dummyhash000000000000000000000003', 'Rahul Verma', 'student', 'ECE', 3, 'A', '9876543003'],
        ['DEMO-004', 'demo4@smvec.ac.in', '$2b$10$dummyhash000000000000000000000004', 'Sneha Patel', 'student', 'EEE', 4, 'A', '9876543004'],
        ['DEMO-005', 'demo5@smvec.ac.in', '$2b$10$dummyhash000000000000000000000005', 'Karthik Raja', 'student', 'MECH', 2, 'B', '9876543005'],
        ['DEMO-006', 'demo6@smvec.ac.in', '$2b$10$dummyhash000000000000000000000006', 'Divya Lakshmi', 'student', 'CSE', 4, 'A', '9876543006'],
        ['DEMO-007', 'demo7@smvec.ac.in', '$2b$10$dummyhash000000000000000000000007', 'Vijay Kumar', 'student', 'IT', 3, 'A', '9876543007'],
      ];

      for (const s of demoStudents) {
        try {
          await pool.query(
            'INSERT INTO users (employee_id, email, password, name, role, department, year_of_study, section, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            s
          );
        } catch (e) {
          // Might already exist
        }
      }

      // Re-fetch
      const [refetched] = await pool.query(
        "SELECT id, name, department, year_of_study, section, employee_id FROM users WHERE role = 'student' AND is_active = TRUE LIMIT 10"
      );
      students.push(...refetched);
      console.log(`✅ Created ${refetched.length} demo students`);
    }

    console.log(`📋 Found ${students.length} students\n`);

    // --- Seed OD Requests (approved) for these students ---
    const eventNames = [
      'National Hackathon 2025', 'Smart India Hackathon', 'TechFest 2025',
      'IEEE Conference on AI/ML', 'Inter-College Sports Meet', 'Cultural Fest Symphony',
      'Cloud Computing Workshop', 'Robotics Championship', 'Code Sprint 2025',
      'Data Science Summit'
    ];
    const eventTypes = ['hackathon', 'hackathon', 'symposium', 'conference', 'sports', 'cultural', 'workshop', 'other', 'hackathon', 'conference'];
    
    const odIds = [];
    for (let i = 0; i < Math.min(students.length, 8); i++) {
      const s = students[i];
      for (let j = 0; j < 2; j++) {
        const idx = (i * 2 + j) % eventNames.length;
        const requestId = `OD-DEMO-${String(i * 2 + j + 1).padStart(3, '0')}`;
        try {
          const [result] = await pool.query(
            `INSERT INTO od_requests (request_id, student_id, event_name, event_type, venue, location_city, location_state,
              event_start_date, event_end_date, status, event_description, organizer_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)
            ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
            [requestId, s.id, eventNames[idx], eventTypes[idx], 'Convention Center', 'Chennai', 'Tamil Nadu',
             '2025-01-15', '2025-01-17', `Demo event for ${eventNames[idx]}`, 'SMVEC']
          );
          odIds.push({ odId: result.insertId, studentId: s.id, eventName: eventNames[idx] });
        } catch (e) {
          // If duplicate request_id, fetch existing
          const [existing] = await pool.query('SELECT id FROM od_requests WHERE request_id = ?', [requestId]);
          if (existing.length > 0) odIds.push({ odId: existing[0].id, studentId: s.id, eventName: eventNames[idx] });
        }
      }
    }
    console.log(`✅ ${odIds.length} OD requests seeded`);

    // --- Seed Event Results ---
    const resultTypes = ['winner', 'winner', 'runner_up', 'winner', 'runner_up', 'finalist', 'winner', 'runner_up', 'finalist', 'winner',
                         'winner', 'runner_up', 'finalist', 'winner', 'runner_up', 'winner'];
    const prizeAmounts = [5000, 10000, 3000, 7500, 2000, 1000, 8000, 3500, 500, 6000, 12000, 4000, 1500, 9000, 2500, 5500];

    let resultCount = 0;
    for (let i = 0; i < odIds.length; i++) {
      const { odId, studentId } = odIds[i];
      try {
        await pool.query(
          `INSERT INTO event_results (od_request_id, student_id, result_type, prize_amount, achievement_description, submitted_at)
           VALUES (?, ?, ?, ?, ?, NOW() - INTERVAL ? DAY)
           ON DUPLICATE KEY UPDATE result_type = VALUES(result_type)`,
          [odId, studentId, resultTypes[i % resultTypes.length], prizeAmounts[i % prizeAmounts.length],
           `Excellent performance in the competition`, i * 15]
        );
        resultCount++;
      } catch (e) {
        // Skip duplicates
      }
    }
    console.log(`✅ ${resultCount} event results seeded`);

    // --- Seed Student of the Month ---
    const achievements = [
      'Outstanding academic performance and leadership in department activities',
      'Won first place in National Level Hackathon and mentored juniors',
      'Excellence in sports and cultural events across multiple competitions',
      'Best paper presentation at International Conference on AI/ML',
      'Led the team to victory in Smart India Hackathon 2025',
      'Active participation in community service and social initiatives',
    ];

    // Get HOD user for selected_by
    const [hods] = await pool.query("SELECT id FROM users WHERE role = 'hod' LIMIT 1");
    const hodId = hods.length > 0 ? hods[0].id : null;

    // Clear existing SOTM
    await pool.query('DELETE FROM student_of_month');

    const now = new Date();
    let sotmCount = 0;
    for (let i = 0; i < Math.min(students.length, 6); i++) {
      const s = students[i];
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = date.getMonth() + 1;
      const y = date.getFullYear();
      try {
        await pool.query(
          'INSERT INTO student_of_month (student_id, month, year, achievement, department, selected_by) VALUES (?, ?, ?, ?, ?, ?)',
          [s.id, m, y, achievements[i % achievements.length], s.department, hodId]
        );
        sotmCount++;
      } catch (e) {
        // Skip duplicates
      }
    }
    console.log(`✅ ${sotmCount} Student of the Month entries seeded`);

    console.log('\n✨ All Hall of Fame demo data seeded successfully!');
    console.log('   You can now view the Hall of Fame page to see all features in action.');
    console.log('   HOD can use "Reset All Data" button to clear everything.\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
};

seedHallOfFame();
