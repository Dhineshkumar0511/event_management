/**
 * Issue Detection & Verification Script
 * Scans for potential issues with security patches
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '../../');

const issues = [];


const checkFile = (filePath: string, description: string) => {
  const fullPath = path.join(projectRoot, filePath);
  if (!fs.existsSync(fullPath)) {
    issues.push({
      severity: 'high',
      file: filePath,
      message: `${description} - File not found`,
      fix: `Create ${filePath}`
    });
    return false;
  }
  return true;
};

const checkFileContent = (filePath: string, requiredContent: string, description: string) => {
  const fullPath = path.join(projectRoot, filePath);
  if (!fs.existsSync(fullPath)) return false;
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  if (!content.includes(requiredContent)) {
    issues.push({
      severity: 'high',
      file: filePath,
      message: `${description} - Required content missing`,
      fix: `Add: ${requiredContent.substring(0, 50)}...`
    });
    return false;
  }
  return true;
};

console.log('\n🔍 Issue Detection & Verification\n');
console.log('='.repeat(60));

// Check 1: Middleware Files
console.log('\n1️⃣  Checking Security Middleware Files');
console.log('-'.repeat(60));

const middlewareFiles = [
  'server/middleware/securityHeaders.js',
  'server/middleware/inputSanitizer.js',
  'server/middleware/csrfProtection.js'
];

middlewareFiles.forEach(file => {
  if (checkFile(file, `Security middleware: ${file}`)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

// Check 2: Utility Files
console.log('\n2️⃣  Checking Utility Files');
console.log('-'.repeat(60));

const utilityFiles = [
  'server/utils/authorizationHelpers.js',
  'server/utils/idGenerator.js'
];

utilityFiles.forEach(file => {
  if (checkFile(file, `Utility file: ${file}`)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

// Check 3: Configuration Files
console.log('\n3️⃣  Checking Configuration Files');
console.log('-'.repeat(60));

if (checkFile('.env.example', 'Environment template')) {
  console.log(`✅ .env.example exists (safe to commit)`);
} else {
  console.log(`❌ .env.example missing`);
}

// Check 4: Main Server File
console.log('\n4️⃣  Checking Server Configuration');
console.log('-'.repeat(60));

const serverFile = 'server/index.js';
const fullServerPath = path.join(projectRoot, serverFile);

if (fs.existsSync(fullServerPath)) {
  const content = fs.readFileSync(fullServerPath, 'utf-8');
  
  const requiredImports = [
    'securityHeaders',
    'inputSanitizer',
    'csrfProtection'
  ];
  
  requiredImports.forEach(imp => {
    if (content.includes(imp)) {
      console.log(`✅ ${imp} imported`);
    } else {
      issues.push({
        severity: 'critical',
        file: serverFile,
        message: `Missing import: ${imp}`,
        fix: `Add: import { ${imp} } from './middleware/...'`
      });
      console.log(`❌ ${imp} not imported`);
    }
  });
  
  const requiredUsage = [
    'app.use(securityHeaders)',
    'app.use(inputSanitizer)',
    'app.use(csrfProtection)'
  ];
  
  requiredUsage.forEach(usage => {
    if (content.includes(usage)) {
      console.log(`✅ ${usage} in place`);
    } else {
      issues.push({
        severity: 'critical',
        file: serverFile,
        message: `Missing middleware usage: ${usage}`,
        fix: `Add: ${usage}`
      });
      console.log(`❌ ${usage} not configured`);
    }
  });
}

// Check 5: Authentication Routes
console.log('\n5️⃣  Checking Password Requirements');
console.log('-'.repeat(60));

const authFile = 'server/routes/auth.js';
const fullAuthPath = path.join(projectRoot, authFile);

if (fs.existsSync(fullAuthPath)) {
  const content = fs.readFileSync(fullAuthPath, 'utf-8');
  
  if (content.includes('min: 12')) {
    console.log(`✅ Password minimum length updated to 12`);
  } else {
    issues.push({
      severity: 'critical',
      file: authFile,
      message: 'Password minimum length not updated to 12',
      fix: 'Change min: 6 to min: 12'
    });
    console.log(`❌ Password minimum length not updated`);
  }
  
  if (content.includes('(?=.*[A-Z])') || content.includes('matches(/^')) {
    console.log(`✅ Password complexity validation added`);
  } else {
    issues.push({
      severity: 'critical',
      file: authFile,
      message: 'Password complexity validation missing',
      fix: 'Add regex for uppercase, lowercase, number, special char'
    });
    console.log(`❌ Password complexity validation missing`);
  }
}

// Check 6: OD Letter Route
console.log('\n6️⃣  Checking SQL Injection Fix');
console.log('-'.repeat(60));

const odLetterFile = 'server/routes/odletter.js';
const fullOdPath = path.join(projectRoot, odLetterFile);

if (fs.existsSync(fullOdPath)) {
  const content = fs.readFileSync(fullOdPath, 'utf-8');
  
  if (content.includes('columnMap') || content.includes("'hod': 'hod_signature'")) {
    console.log(`✅ SQL injection vulnerability fixed`);
  } else {
    issues.push({
      severity: 'critical',
      file: odLetterFile,
      message: 'SQL injection vulnerability not fixed',
      fix: 'Implement column name whitelist instead of concatenation'
    });
    console.log(`❌ SQL injection vulnerability still present`);
  }
}

// Check 7: .gitignore
console.log('\n7️⃣  Checking .gitignore Configuration');
console.log('-'.repeat(60));

const gitignorePath = path.join(projectRoot, '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const content = fs.readFileSync(gitignorePath, 'utf-8');
  
  if (content.includes('.env')) {
    console.log(`✅ .env in .gitignore`);
  } else {
    issues.push({
      severity: 'critical',
      file: '.gitignore',
      message: '.env not in .gitignore - SECURITY RISK',
      fix: 'Add .env to .gitignore'
    });
    console.log(`❌ .env not in .gitignore - SECURITY RISK`);
  }
  
  if (content.includes('node_modules')) {
    console.log(`✅ node_modules in .gitignore`);
  }
  if (content.includes('dist')) {
    console.log(`✅ dist in .gitignore`);
  }
} else {
  issues.push({
    severity: 'medium',
    file: '.gitignore',
    message: '.gitignore file not found',
    fix: 'Create .gitignore file'
  });
}

// Check 8: Environment Variables (.env)
console.log('\n8️⃣  Checking .env File');
console.log('-'.repeat(60));

const envPath = path.join(projectRoot, '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  
  // Check if it contains actual secrets (should be masked or empty)
  if (content.includes('generate_a_strong_32_char_secret_here')) {
    console.log(`⚠️  .env has placeholder values (good - not real secrets)`);
  } else if (content.match(/[a-z0-9]{32,}/i)) {
    issues.push({
      severity: 'critical',
      file: '.env',
      message: 'Real credentials exposed in .env file',
      fix: 'Remove .env file using git filter-repo and rotate all credentials'
    });
    console.log(`❌ CRITICAL: Real credentials may be in .env`);
  }
} else {
  console.log(`✅ .env file not found in workspace (expected)`);
}

// Check 9: Package.json Dependencies
console.log('\n9️⃣  Checking JavaScript Dependencies');
console.log('-'.repeat(60));

const pkgJsonPath = path.join(projectRoot, 'package.json');
if (fs.existsSync(pkgJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
  
  const requiredDeps = [
    'express',
    'jsonwebtoken',
    'bcryptjs',
    'express-validator',
    'cors'
  ];
  
  requiredDeps.forEach(dep => {
    if (pkg.dependencies[dep]) {
      console.log(`✅ ${dep} installed`);
    } else {
      issues.push({
        severity: 'medium',
        file: 'package.json',
        message: `Missing dependency: ${dep}`,
        fix: `npm install ${dep}`
      });
      console.log(`❌ ${dep} not installed`);
    }
  });
}

// Check 10: Documentation
console.log('\n🔟 Checking Documentation Files');
console.log('-'.repeat(60));

const docs = [
  'SECURITY.md',
  'DEPLOYMENT.md'
];

docs.forEach(doc => {
  if (checkFile(doc, `Documentation: ${doc}`)) {
    console.log(`✅ ${doc} exists`);
  } else {
    console.log(`⚠️  ${doc} missing (helpful but not required)`);
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Verification Summary\n');

const bySeverity = {
  critical: issues.filter(i => i.severity === 'critical'),
  high: issues.filter(i => i.severity === 'high'),
  medium: issues.filter(i => i.severity === 'medium'),
  low: issues.filter(i => i.severity === 'low')
};

console.log(`🔴 Critical Issues: ${bySeverity.critical.length}`);
console.log(`🟠 High Priority: ${bySeverity.high.length}`);
console.log(`🟡 Medium Priority: ${bySeverity.medium.length}`);
console.log(`🟢 Low Priority: ${bySeverity.low.length}`);
console.log(`📋 Total: ${issues.length}`);

if (issues.length > 0) {
  console.log('\n⚠️  Issues Found:\n');
  
  issues.forEach((issue, idx) => {
    const icons = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' };
    console.log(`${idx + 1}. ${icons[issue.severity]} [${issue.file}]`);
    console.log(`   Message: ${issue.message}`);
    if (issue.fix) console.log(`   Fix: ${issue.fix}`);
    console.log();
  });
  
  console.log('='.repeat(60));
  console.log('\n⚠️  Please address the above issues before deployment.\n');
} else {
  console.log('\n✅ No issues detected! Everything looks good.\n');
}

console.log('='.repeat(60) + '\n');

process.exit(bySeverity.critical.length > 0 ? 1 : 0);
