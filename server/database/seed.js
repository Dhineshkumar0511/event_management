import pool from './connection.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const seed = async () => {
  console.log('🌱 Starting database seeding...');

  try {
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create HOD user
    await pool.query(`
      INSERT INTO users (employee_id, email, password, name, role, department, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `, ['HOD001', 'hod@college.edu', hashedPassword, 'Dr. Rajesh Kumar', 'hod', 'AI & DS', '9876543210']);
    console.log('✅ HOD user created');

    // Create Staff users
    const staffData = [
      ['STAFF001', 'staff1@college.edu', hashedPassword, 'Prof. Priya Sharma', 'staff', 'AI & DS', '9876543211'],
      ['STAFF002', 'staff2@college.edu', hashedPassword, 'Prof. Arun Nair', 'staff', 'AI & DS', '9876543212'],
      ['STAFF003', 'staff3@college.edu', hashedPassword, 'Prof. Meera Patel', 'staff', 'Information Technology', '9876543213'],
    ];

    for (const staff of staffData) {
      await pool.query(`
        INSERT INTO users (employee_id, email, password, name, role, department, phone)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name)
      `, staff);
    }
    console.log('✅ Staff users created');

    // Create Student users
    const studentData = [
      ['STU2024001', 'student1@college.edu', hashedPassword, 'Arjun Menon', 'student', 'AI & DS', 3, 'A', '9876543221'],
      ['STU2024002', 'student2@college.edu', hashedPassword, 'Sneha Reddy', 'student', 'AI & DS', 3, 'A', '9876543222'],
      ['STU2024003', 'student3@college.edu', hashedPassword, 'Karthik S', 'student', 'AI & DS', 2, 'B', '9876543223'],
      ['STU2024004', 'student4@college.edu', hashedPassword, 'Divya R', 'student', 'Information Technology', 3, 'A', '9876543224'],
      ['STU2024005', 'student5@college.edu', hashedPassword, 'Rahul V', 'student', 'Computer Science', 4, 'A', '9876543225'],
    ];

    for (const student of studentData) {
      await pool.query(`
        INSERT INTO users (employee_id, email, password, name, role, department, year_of_study, section, phone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name)
      `, student);
    }
    console.log('✅ Student users created');

    // Create default letter template
    await pool.query(`
      INSERT INTO letter_templates (name, template_type, content, is_default)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE content = VALUES(content)
    `, [
      'Default OD Request Template',
      'od_request',
      `
        <h2 style="text-align: center;">ON DUTY REQUEST LETTER</h2>
        <p>Date: {{date}}</p>
        <p>To,<br>The Head of Department,<br>{{department}}<br>{{college_name}}</p>
        <p>Subject: Request for On-Duty Leave for attending {{event_type}}</p>
        <p>Respected Sir/Madam,</p>
        <p>I, {{student_name}}, a student of {{department}}, {{year}} Year, Section {{section}}, 
        Register Number: {{register_number}}, hereby request you to grant me On-Duty leave 
        from {{start_date}} to {{end_date}} for attending {{event_name}} at {{venue}}, {{location}}.</p>
        <p><strong>Event Details:</strong></p>
        <ul>
          <li>Event Name: {{event_name}}</li>
          <li>Event Type: {{event_type}}</li>
          <li>Venue: {{venue}}</li>
          <li>Date: {{start_date}} to {{end_date}}</li>
          <li>Organizer: {{organizer_name}}</li>
        </ul>
        <p><strong>Team Members:</strong></p>
        {{team_members}}
        <p><strong>Parent Contact:</strong> {{parent_name}} - {{parent_phone}}</p>
        <p>I assure you that I will submit all the required documents and certificates upon my return.</p>
        <p>Thanking you,<br>Yours faithfully,<br><br>{{student_name}}<br>{{register_number}}</p>
      `,
      true
    ]);
    console.log('✅ Letter template created');

    console.log('\n✨ Database seeding completed successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('   HOD: hod@college.edu / password123');
    console.log('   Staff: staff1@college.edu / password123');
    console.log('   Student: student1@college.edu / password123');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
};

seed();
