/**
 * Authorization Helper Utilities
 * Prevents privilege escalation and unauthorized access
 */
import pool from '../database/connection.js';

/**
 * Verify student owns the OD request
 */
export const verifyRequestOwnership = async (requestId, studentId) => {
  const [requests] = await pool.query(
    'SELECT id FROM od_requests WHERE id = ? AND student_id = ?',
    [requestId, studentId]
  );
  return requests.length > 0;
};

/**
 * Verify staff can approve request (department match)
 */
export const verifyStaffDepartment = async (userId, departmentId) => {
  const [staff] = await pool.query(
    'SELECT id FROM users WHERE id = ? AND role = "staff" AND department = ?',
    [userId, departmentId]
  );
  return staff.length > 0;
};

/**
 * Verify HOD is from correct department
 */
export const verifyHODDepartment = async (userId, departmentId) => {
  const [hod] = await pool.query(
    'SELECT id FROM users WHERE id = ? AND role = "hod" AND department = ?',
    [userId, departmentId]
  );
  return hod.length > 0;
};

/**
 * Verify team member belongs to request
 */
export const verifyTeamMemberAccess = async (requestId, studentId) => {
  const [members] = await pool.query(
    `SELECT id FROM team_members 
     WHERE od_request_id = ? AND (student_id = ? OR is_team_lead = TRUE)`,
    [requestId, studentId]
  );
  return members.length > 0;
};

/**
 * Generic access check - prevents IDOR
 */
export const ensureResourceAccess = async (resourceId, userId, resourceTable, userColumn = 'student_id') => {
  const [resources] = await pool.query(
    `SELECT id FROM ${resourceTable} WHERE id = ? AND ${userColumn} = ?`,
    [resourceId, userId]
  );
  return resources.length > 0;
};
