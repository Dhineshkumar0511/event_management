# Security Patching Deployment Guide

## Overview
This document outlines how to safely deploy security patches without breaking functionality.

---

## Phase 1: Pre-Deployment (Local Testing)

### Step 1: Verify All Patches Are Applied
```bash
# Check that these files exist:
ls -la server/middleware/securityHeaders.js
ls -la server/middleware/inputSanitizer.js
ls -la server/middleware/csrfProtection.js
ls -la server/utils/authorizationHelpers.js
ls -la server/utils/idGenerator.js
ls -la .env.example
ls -la SECURITY.md
```

### Step 2: Test Locally
```bash
# Install dependencies if needed
npm install

# Start server
npm run server

# In another terminal, test API
npm test

# Check for errors
```

### Step 3: Verify Security Headers
```bash
# Test endpoint returns security headers
curl -I http://localhost:3000/api/health

# Expected headers:
# Strict-Transport-Security: max-age=31536000
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
```

---

## Phase 2: .env Management (CRITICAL)

### Step 1: Secure .env File
```bash
# Remove from git history (irreversible - communicate with team first!)
git filter-repo --invert-paths --path .env

# Add to .gitignore
echo ".env" >> .gitignore
echo ".env.*.local" >> .gitignore
git add .gitignore
git commit -m "security: protect environment files"
```

### Step 2: Rotate Credentials
Before deploying, you MUST rotate these:
- [ ] All 6 Cerebras API keys
- [ ] Cloudinary API key/secret
- [ ] Database password
- [ ] JWT_SECRET (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

### Step 3: Create New .env
```bash
# Copy template
cp .env.example .env

# Edit with new credentials ONLY
nano .env

# Never commit this file!
```

---

## Phase 3: Database Backup (Safety First)

```bash
# Backup current database
mysqldump -u root -p eventpass > eventpass_backup_$(date +%Y%m%d).sql

# For TiDB Cloud, use their backup feature
# Or export via MySQL client
```

---

## Phase 4: Dependency Updates (Optional but Recommended)

```bash
# Update packages to get latest security patches
npm update

# Audit for vulnerabilities
npm audit

# Fix critical issues
npm audit fix
```

---

## Phase 5: Deployment to Production

### Option A: Direct Server Deployment
```bash
# 1. Stop current server
pm2 stop eventpass
# OR
systemctl stop eventpass

# 2. Pull latest code with patches
git pull origin main

# 3. Install dependencies
npm install

# 4. Create .env with NEW credentials
# (Use your secure credential management)
export JWT_SECRET="new_strong_secret_here"
export CEREBRAS_API_KEY_1="new_key_1"
# ... etc

# 5. Start server
npm run start
# OR
pm2 start server/index.js --name "eventpass"

# 6. Verify it's running
curl http://localhost:3000/api/health
```

### Option B: Docker Deployment
```bash
# 1. Build new image with patches
docker build -t eventpass:v1.1.0 .

# 2. Create .env for production
cp .env.example .env.prod
# Edit with production credentials

# 3. Run container with new image
docker run -d \
  --name eventpass \
  -p 3000:3000 \
  --env-file .env.prod \
  eventpass:v1.1.0

# 4. Verify
curl http://localhost:3000/api/health
```

### Option C: Heroku/Railway/Render
```bash
# 1. Create new .env config
heroku config:set JWT_SECRET="new_strong_secret"
heroku config:set CEREBRAS_API_KEY_1="new_key_1"
# ... etc for all keys

# 2. Deploy code
git push heroku main

# 3. Monitor logs
heroku logs -t
```

---

## Phase 6: Frontend Updates (CSRF Support)

### Update API Service
**File**: `client/src/services/api.js`

```javascript
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add CSRF token to requests
api.interceptors.request.use((config) => {
  // For state-changing requests (POST, PUT, DELETE)
  if (['POST', 'PUT', 'DELETE'].includes(config.method.toUpperCase())) {
    // Get token from CSRF header sent by server
    const token = document.querySelector('meta[name="csrf-token"]')?.content ||
                  sessionStorage.getItem('csrf-token');
    if (token) {
      config.headers['X-CSRF-Token'] = token;
    }
  }
  return config;
})

// ... rest of interceptors
export default api
```

### Update HTML
Add CSRF token retrieval in `client/index.html`:

```html
<!-- Add to <head> -->
<meta name="csrf-token" content="">

<!-- Add to end of <body> -->
<script>
  // Fetch initial CSRF token
  fetch('/api/health', { 
    credentials: 'include' 
  }).then(() => {
    // Server will set CSRF token via Set-Cookie
    console.log('CSRF protection initialized');
  });
</script>
```

### Rebuild Frontend
```bash
cd client
npm run build
# Deploy dist/ folder
```

---

## Phase 7: Testing Post-Deployment

### Test Security Fixes
```bash
# 1. Test strong password requirement
curl -X POST http://your-domain/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@test.com",
    "password":"weak",
    "name":"Test",
    "role":"student"
  }'
# Should fail with password validation error ✓

# 2. Test CSRF protection
curl -X POST http://your-domain/api/student/od-request \
  -H "Content-Type: application/json" \
  -d '{"event_name":"Test"}'
# Should fail with CSRF error ✓

# 3. Test security headers
curl -I http://your-domain/api/health
# Should show Strict-Transport-Security header ✓

# 4. Test input sanitization
curl -X POST http://your-domain/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@test.com",
    "password":"Test@1234",
    "name":"<script>alert(1)</script>",
    "role":"student"
  }'
# Should sanitize HTML and succeed ✓
```

### Test User Functionality
- [ ] Student can create OD request
- [ ] Staff can review requests
- [ ] HOD can approve requests
- [ ] Email notifications work
- [ ] File uploads work
- [ ] Real-time tracking works
- [ ] PDF downloads work

---

## Phase 8: Monitoring & Rollback Plan

### Monitor Logs
```bash
# Check for errors
tail -f /var/log/eventpass/error.log

# Watch for security issues
grep -i "csrf\|injection\|unauthorized" /var/log/eventpass/*.log

# Monitor API response times
```

### Rollback Plan (If Something Breaks)
```bash
# 1. Revert to previous version
git revert <commit-hash>

# 2. Redeploy
npm install
npm run start

# 3. Clear cache if needed
# (restart browsers, clear localStorage)

# 4. Investigate issue
# Look at error logs
# Check database integrity
# Test specific endpoints
```

### Communicate Issues
If security patch breaks functionality:
1. Check error logs first
2. Verify frontend is updated
3. Clear browser cache
4. Test login again
5. Check if CSRF token is being sent

---

## Phase 9: Post-Deployment Checklist

- [ ] All security patches applied
- [ ] Credentials rotated and .env removed from git
- [ ] HTTPS enabled (NODE_ENV=production)
- [ ] Database backup created
- [ ] Server is running without errors
- [ ] Security headers present
- [ ] Password validation working
- [ ] Users can complete full workflow
- [ ] Real-time features working
- [ ] Email notifications working
- [ ] File uploads working
- [ ] API rate limiting active
- [ ] Monitoring/logging active
- [ ] Team notified of changes

---

## Troubleshooting Common Issues

### Issue: Server won't start
```bash
# Check error logs
tail -20 error.log

# Common causes:
# 1. Missing environment variables
echo $JWT_SECRET  # Should not be empty

# 2. Port already in use
lsof -i :3000

# 3. Database connection
node -e "import pool from './server/database/connection.js'; console.log('Connected')"
```

### Issue: CSRF errors on state-changing requests
```bash
# Check if frontend is sending token
# In browser console:
console.log(document.querySelector('meta[name="csrf-token"]'))

# Solution: Update frontend API service
# See "Phase 6: Frontend Updates" above
```

### Issue: Password validation failing for existing users
```bash
# Old passwords still work, only NEW registrations require strong passwords
# Wait for users to reset passwords to enforce site-wide

# Or manually update passwords via UI reset feature
```

### Issue: Socket.IO real-time features broken
```bash
# Check if CORS is properly configured
# Verify client URL in .env matches frontend

# Try clearing browser cache and reconnecting
```

---

## Support & Questions

For deployment issues:
1. Check SECURITY.md for overview
2. Review error logs
3. Test locally first
4. Verify all steps in this guide
5. Check that credentials are properly set

---

**Last Updated**: March 20, 2026  
**Version**: v1.1.0 Security Hardening
