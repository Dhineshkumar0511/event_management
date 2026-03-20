# EventPass Security Hardening Guide

## 🔒 Security Fixes Implemented

### Critical Fixes (v1.1.0)
- ✅ **SQL Injection Prevention**: Fixed unsafe column name concatenation in OD letter signing
- ✅ **CSRF Protection**: Implemented double-submit cookie pattern for all state-changing requests
- ✅ **Security Headers**: Added HSTS, X-Frame-Options, CSP, and other protective headers
- ✅ **Input Sanitization**: XSS protection by filtering HTML tags and dangerous characters
- ✅ **Strong Password Requirements**: 
  - Minimum 12 characters (up from 6)
  - Must include: uppercase, lowercase, number, special character
  - Applied to registration and user creation
- ✅ **Secure Cookie Handling**: SameSite=Strict for CSRF tokens

---

## 🚨 IMMEDIATE ACTIONS REQUIRED

### 1. Remove .env from Git History
**The .env file with all credentials is still in git history. Remove it:**

```bash
# Install git-filter-repo if not available
pip install git-filter-repo

# Remove .env from ALL git history
git filter-repo --invert-paths --path .env

# Or for a quick local cleanup:
git rm --cached .env
echo ".env" >> .gitignore
git add .gitignore
git commit -m "security: add .env to gitignore"
git push origin branch_name --force-with-lease
```

### 2. Rotate ALL Exposed Credentials IMMEDIATELY
- [ ] Regenerate all 6 Cerebras API keys from console.cerebras.ai
- [ ] Create new Cloudinary API key/secret
- [ ] Generate new strong JWT_SECRET (>32 chars)
- [ ] Change database credentials
- [ ] Update all services with new keys

### 3. Set Up .env Properly
```bash
# Copy the safe template
cp .env.example .env

# Fill in with NEW credentials (not the old exposed ones)
# Edit .env with your preferred editor
nano .env

# Verify .gitignore includes .env
cat .gitignore | grep "^.env$"
```

### 4. Update Environment Variables in Production
```bash
# For cloud deployments (Heroku, Railway, Render, etc):
# Set each variable in your deployment settings

# For Docker:
# Use .env file or secrets management

# Never commit secrets to git
```

---

## ✅ Frontend Changes Required

### Add CSRF Token to API Calls
Your frontend needs to send the CSRF token with state-changing requests.

**In `client/src/services/api.js`:**

```javascript
// After creating axios instance
api.interceptors.request.use((config) => {
  // Get CSRF token from cookie
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf-token='))
    ?.split('=')[1];
  
  if (token && ['POST', 'PUT', 'DELETE'].includes(config.method.toUpperCase())) {
    config.headers['X-CSRF-Token'] = token;
  }
  
  return config;
});
```

### Update POST/PUT/DELETE Requests
Ensure all state-changing requests include the CSRF token:

```javascript
// Example: Update Student OD Request
updateRequest: (id, data) => {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf-token='))
    ?.split('=')[1];
  
  return api.put(`/student/od-request/${id}`, data, {
    headers: {
      'X-CSRF-Token': token
    }
  });
}
```

---

## 🛡️ Testing Security Fixes

### Test CSRF Protection
```bash
# This should fail (no token)
curl -X POST http://localhost:3000/api/student/od-request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"event_name":"Test"}'

# Should return 403: CSRF token validation failed
```

### Test Strong Passwords
```bash
# This should fail (weak password)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@test.com",
    "password":"weak123",
    "name":"Test",
    "role":"student"
  }'

# Should return 400: Password validation error
```

### Test Security Headers
```bash
curl -I http://localhost:3000/api/health

# Should see:
# Strict-Transport-Security: max-age=31536000
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Content-Security-Policy: default-src 'self'
```

---

## 📋 Remaining Security Improvements (Non-Breaking)

### Phase 2 (Recommended)
- [ ] Implement request ID UUIDs instead of timestamp-based IDs
- [ ] Add request/activity logging middleware
- [ ] Implement proper password reset flow with email verification
- [ ] Add email configuration (SMTP/Sendgrid)
- [ ] Add comprehensive security audit logging

### Phase 3 (Advanced)
- [ ] Rate limiting per user/IP for API endpoints
- [ ] Implement 2FA for staff/HOD accounts
- [ ] Add security event notifications
- [ ] Implement API key rotation schedule
- [ ] Add Web Application Firewall (WAF) rules

---

## 🔍 Configuration Checklist

Before deploying to production:

- [ ] .env file removed from git
- [ ] All credentials rotated
- [ ] Strong JWT secret generated (>32 chars)
- [ ] HTTPS enabled in production (NODE_ENV=production)
- [ ] HSTS headers active (browser enforces HTTPS)
- [ ] CORS configured to specific origins only
- [ ] Database credentials use strong passwords
- [ ] API keys stored securely
- [ ] Frontend sends CSRF tokens
- [ ] Rate limiting active
- [ ] Backup/disaster recovery plan in place

---

## 📞 Security Issues Found

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Do NOT commit the issue details
3. Contact the security team privately
4. Follow responsible disclosure practices
5. Allow 90 days for patch deployment

---

## 📚 References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Node.js Security Checklist](https://nodejs.org/en/knowledge/file-system/security/)

---

**Version**: 1.1.0 Security Hardening  
**Last Updated**: March 20, 2026  
**Status**: All critical fixes implemented ✅
