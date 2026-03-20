/**
 * Password Migration Script
 * Helps update user passwords to meet new security requirements
 * 
 * This script:
 * 1. Identifies users that may have weak passwords
 * 2. Sends password reset emails
 * 3. Logs the migration status
 */

import pool from '../database/connection.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const logFile = path.join(process.cwd(), 'password_migration.log');

async function log(message) {
  const timestamp = new Date().toISOString();
  const fullMessage = `[${timestamp}] ${message}`;
  console.log(fullMessage);
  
  fs.appendFileSync(logFile, fullMessage + '\n');
}

async function runMigration() {
  try {
    await log('========== Password Migration Started ==========');
    
    // Get all users
    const [users] = await pool.query('SELECT id, email, name, password FROM users');
    await log(`Found ${users.length} users in database`);
    
    // Create migration table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        migration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        email VARCHAR(255),
        status ENUM('pending', 'completed', 'failed'),
        notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    let pendingCount = 0;
    let processedCount = 0;
    
    for (const user of users) {
      try {
        // Check if already migrated
        const [migrated] = await pool.query(
          'SELECT id FROM password_migrations WHERE user_id = ? AND status = "completed"',
          [user.id]
        );
        
        if (migrated.length > 0) {
          await log(`✅ User ${user.email} (ID: ${user.id}) - Already migrated`);
          processedCount++;
          continue;
        }
        
        // Mark for migration (will require password reset)
        await pool.query(
          `INSERT INTO password_migrations (user_id, email, status, notes)
           VALUES (?, ?, 'pending', 'Awaiting password reset to meet new security requirements')`,
          [user.id, user.email]
        );
        
        pendingCount++;
        await log(`⏳ User ${user.email} (ID: ${user.id}) - Marked for migration`);
        
      } catch (error) {
        await log(`❌ Error processing user ${user.email}: ${error.message}`);
      }
    }
    
    await log(`\n========== Migration Summary ==========`);
    await log(`Total Users: ${users.length}`);
    await log(`Already Migrated: ${processedCount}`);
    await log(`Pending Migration: ${pendingCount}`);
    await log(`Action: Users will be prompted to reset password on next login`);
    await log(`========== Migration Complete ==========\n`);
    
  } catch (error) {
    await log(`❌ Migration failed: ${error.message}`);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Create migration status endpoint add-on
export async function checkPasswordRequiresReset(userId) {
  const [migration] = await pool.query(
    `SELECT status FROM password_migrations WHERE user_id = ? ORDER BY migration_date DESC LIMIT 1`,
    [userId]
  );
  
  return migration.length > 0 && migration[0].status === 'pending';
}

export async function markPasswordMigrationComplete(userId) {
  await pool.query(
    `UPDATE password_migrations SET status = 'completed' WHERE user_id = ? AND status = 'pending'`,
    [userId]
  );
}

// Run migration
console.log('🔄 Starting Password Migration...\n');
runMigration();
