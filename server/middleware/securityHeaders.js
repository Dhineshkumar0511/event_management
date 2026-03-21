/**
 * Security Headers Middleware
 * Adds essential security headers to all responses
 */
export const securityHeaders = (req, res, next) => {
  // Prevent clickjacking attacks
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection in older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // HSTS - Force HTTPS for 1 year (production only)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Referrer Policy - Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissive CSP allowing same-origin and data URIs (won't break existing functionality)
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https: wss: ws:; frame-ancestors 'none'");
  
  // Permissions Policy (formerly Feature Policy) — allow geolocation for check-in feature
  res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');
  
  next();
};
