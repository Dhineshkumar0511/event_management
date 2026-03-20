/**
 * Secure Request ID Generator
 * Replaces predictable timestamp-based IDs
 */
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate secure OD request ID
 * Format: OD-{uuid} for easy recognition but impossible to guess
 */
export const generateSecureRequestId = () => {
  const uuid = uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
  return `OD-${uuid}`;
};

/**
 * Generate secure tracking ID for check-ins
 */
export const generateSecureCheckInId = () => {
  return `CHK-${uuidv4().substring(0, 8).toUpperCase()}`;
};

/**
 * Generate secure result submission ID
 */
export const generateSecureResultId = () => {
  return `RES-${uuidv4().substring(0, 8).toUpperCase()}`;
};

/**
 * Validate request ID format (prevents injection)
 */
export const isValidRequestId = (id) => {
  return /^OD-[A-Z0-9]{12}$/.test(id);
};

/**
 * Validate check-in ID format
 */
export const isValidCheckInId = (id) => {
  return /^CHK-[A-Z0-9]{8}$/.test(id);
};

/**
 * Validate result ID format
 */
export const isValidResultId = (id) => {
  return /^RES-[A-Z0-9]{8}$/.test(id);
};
