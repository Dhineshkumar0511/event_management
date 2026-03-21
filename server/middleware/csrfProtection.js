/**
 * CSRF Protection Middleware
 * Uses double-submit cookie pattern for CSRF token validation
 */
import crypto from 'crypto';

const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const csrfProtection = (req, res, next) => {
  // Check if token already exists in cookie (reuse if present)
  let token = req.cookies?.['csrf-token'];
  
  // Only generate new token if one doesn't exist
  if (!token) {
    token = generateToken();
    res.cookie('csrf-token', token, {
      httpOnly: false, // Allow JS to read for sending in headers
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed from 'strict' to 'lax' to allow cross-site cookie sending
      maxAge: 3600000, // 1 hour
      path: '/' // Ensure cookie is sent to all paths
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log('[CSRF] Generated new token:', token.substring(0, 10) + '...');
    }
  } else if (process.env.NODE_ENV !== 'production') {
    console.log('[CSRF] Reused existing token:', token.substring(0, 10) + '...');
  }
  
  // Attach token to request for response
  req.csrfToken = token;
  
  next();
};

export const csrfValidate = (req, res, next) => {
  // Skip CSRF validation for GET, HEAD, OPTIONS requests, auth endpoints
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Get token from header or body
  const token = req.headers['x-csrf-token'] || req.body?.csrfToken;
  const cookieToken = req.cookies?.['csrf-token'];
  
  // Validate tokens match
  if (!token || !cookieToken || token !== cookieToken) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[CSRF] Validation FAILED — Method: ${req.method}, URL: ${req.path}`);
    }
    return res.status(403).json({
      success: false,
      message: 'CSRF token validation failed'
    });
  }
  
  next();
};
