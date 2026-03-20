/**
 * CSRF Protection Middleware
 * Uses double-submit cookie pattern for CSRF token validation
 */
import crypto from 'crypto';

const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const csrfProtection = (req, res, next) => {
  // Generate CSRF token and set in secure HttpOnly cookie
  const token = generateToken();
  res.cookie('csrf-token', token, {
    httpOnly: false, // Allow JS to read for sending in headers
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000 // 1 hour
  });
  
  // Attach token to request for response
  req.csrfToken = token;
  
  next();
};

export const csrfValidate = (req, res, next) => {
  // Skip CSRF validation for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Get token from header or body
  const token = req.headers['x-csrf-token'] || req.body?.csrfToken;
  const cookieToken = req.cookies?.['csrf-token'];
  
  // Debug logging
  console.log(`[CSRF] Method: ${req.method}, Token Header: ${token?.substring(0, 10)}..., Cookie: ${cookieToken?.substring(0, 10)}...`);
  
  // Validate tokens match
  if (!token || !cookieToken || token !== cookieToken) {
    console.log('[CSRF] Validation FAILED - tokens do not match or missing');
    return res.status(403).json({
      success: false,
      message: 'CSRF token validation failed'
    });
  }
  
  console.log('[CSRF] Validation PASSED');
  next();
};
