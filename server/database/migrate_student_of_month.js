import pool from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

const migrate = async () => {
  console.log('🚀 Creating student_of_month table...');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student_of_month (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        month INT NOT NULL,
        year INT NOT NULL,
        achievement TEXT,
        reason TEXT,
        department VARCHAR(100),
        selected_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_month_dept (month, year, department),
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (selected_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_month_year (month, year)
      )
    `);
    console.log('✅ student_of_month table created');
    console.log('✨ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
};

migrate();
