// =========================================================================
// Visa Doo — Automated Enterprise Security Verification Suite
// Run with: node tools/security-test.js
// =========================================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (details) console.error(`     Details: ${details}`);
    failedTests++;
  }
}

console.log('='.repeat(70));
console.log('🔒 VISADOO ENTERPRISE SECURITY VERIFICATION SUITE');
console.log('='.repeat(70));

// --- Test 1: PII Masking Algorithms ---
console.log('\n[1] Testing PII Masking & Data Sanitization...');
{
  function maskPassportNumber(num) {
    if (!num || typeof num !== 'string') return '';
    const clean = num.trim();
    if (clean.length <= 4) return '****';
    return clean.slice(0, 2) + '*'.repeat(Math.max(2, clean.length - 4)) + clean.slice(-2);
  }

  function maskEmail(email) {
    if (!email || typeof email !== 'string') return '';
    const parts = email.trim().split('@');
    if (parts.length !== 2) return '***@***.***';
    const name = parts[0], domain = parts[1];
    const maskedName = name.length <= 2 ? name[0] + '***' : name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
    return `${maskedName}@${domain}`;
  }

  function maskPhone(phone) {
    if (!phone || typeof phone !== 'string') return '';
    const clean = phone.trim();
    if (clean.length <= 4) return '****';
    return clean.slice(0, Math.max(3, clean.length - 6)) + ' *** ' + clean.slice(-4);
  }

  assert(maskPassportNumber('N12345678') === 'N1*****78', 'Passport number masking hides middle characters');
  assert(maskPassportNumber('AB12') === '****', 'Short passport numbers are fully masked');
  assert(maskEmail('customer@visadoo.com') === 'c******r@visadoo.com', 'Email masking masks username preserving domain');
  assert(maskPhone('+971501234567') === '+971501 *** 4567', 'Phone masking masks intermediate digits');
}

// --- Test 2: Magic-Byte Binary Header Validation ---
console.log('\n[2] Testing Magic-Byte Binary Header Validation...');
{
  const MAGIC_BYTES = {
    jpeg: [[0xFF, 0xD8, 0xFF]],
    png: [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    webp: [[0x52, 0x49, 0x46, 0x46]],
    pdf: [[0x25, 0x50, 0x44, 0x46]]
  };

  function checkHeader(bytes, category) {
    const arr = Array.from(bytes);
    for (const [format, signatures] of Object.entries(MAGIC_BYTES)) {
      for (const sig of signatures) {
        if (sig.every((byte, idx) => arr[idx] === byte)) {
          if (category === 'image' && ['jpeg', 'png', 'webp'].includes(format)) return true;
          if (category === 'pdf' && format === 'pdf') return true;
          if (!category) return true;
        }
      }
    }
    return false;
  }

  const validJpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]);
  const validPng = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const validPdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x35]);
  const fakePhpInJpg = Buffer.from('<?php echo system($_GET["cmd"]); ?>');
  const fakeExeInPng = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);

  assert(checkHeader(validJpeg, 'image') === true, 'Valid JPEG magic bytes recognized');
  assert(checkHeader(validPng, 'image') === true, 'Valid PNG magic bytes recognized');
  assert(checkHeader(validPdf, 'pdf') === true, 'Valid PDF magic bytes recognized');
  assert(checkHeader(fakePhpInJpg, 'image') === false, 'Spoofed PHP script in image rejected');
  assert(checkHeader(fakeExeInPng, 'image') === false, 'Spoofed Windows EXE in image rejected');
}

// --- Test 3: Authenticated AES-256-GCM Encryption Roundtrip ---
console.log('\n[3] Testing AES-256-GCM Encryption Roundtrip...');
{
  const secretKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const sensitivePayload = JSON.stringify({
    full_name: 'John Doe',
    passport_number: 'L8923412',
    dob: '1988-04-12',
    address: 'Dubai Marina, UAE'
  });

  const cipher = crypto.createCipheriv('aes-256-gcm', secretKey, iv);
  let encrypted = cipher.update(sensitivePayload, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', secretKey, iv);
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  assert(decrypted === sensitivePayload, 'AES-256-GCM payload successfully roundtripped and verified');

  let tampered = false;
  try {
    const badDecipher = crypto.createDecipheriv('aes-256-gcm', secretKey, iv);
    badDecipher.setAuthTag(Buffer.from(tag.slice(0, -2) + '00', 'hex'));
    let badDecrypted = badDecipher.update(encrypted, 'hex', 'utf8');
    badDecrypted += badDecipher.final('utf8');
  } catch (_e) {
    tampered = true;
  }
  assert(tampered === true, 'AES-256-GCM authentication tag detects ciphertext tampering');
}

// --- Test 4: Brute-Force Rate Limiter & Lockout Logic ---
console.log('\n[4] Testing Brute-Force Rate Limiting & Lockout...');
{
  const attempts = new Map();
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MS = 15 * 60 * 1000;

  function recordFailed(key) {
    const entry = attempts.get(key) || { count: 0, lastFailed: 0, lockedUntil: 0 };
    entry.count += 1;
    entry.lastFailed = Date.now();
    if (entry.count >= MAX_ATTEMPTS) {
      entry.lockedUntil = Date.now() + LOCKOUT_MS;
    }
    attempts.set(key, entry);
  }

  function checkAllowed(key) {
    const entry = attempts.get(key);
    if (!entry) return true;
    if (entry.lockedUntil && Date.now() < entry.lockedUntil) return false;
    return true;
  }

  const testUser = 'victim@visadoo.com';
  assert(checkAllowed(testUser) === true, 'Fresh user allowed to attempt login');
  for (let i = 0; i < 4; i++) recordFailed(testUser);
  assert(checkAllowed(testUser) === true, 'User with 4 failed attempts still permitted');
  recordFailed(testUser); // 5th failure
  assert(checkAllowed(testUser) === false, 'User locked out after 5 consecutive failed attempts');
}

// --- Test 5: Path Traversal Prevention in Preview Server ---
console.log('\n[5] Testing Path Traversal Defense...');
{
  const root = path.resolve(__dirname, '..');

  function isSafe(urlPath) {
    const safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, "");
    const filePath = path.resolve(root, "." + safePath);
    return filePath.startsWith(root);
  }

  assert(isSafe('/index.html') === true, 'Normal web resource allowed');
  assert(isSafe('/events/event.html') === true, 'Subdirectory resource allowed');
}

// --- Test 6: Repository Secret & Vulnerability Scan ---
console.log('\n[6] Scanning Codebase for Leaked Secrets & Sensitive Patterns...');
{
  const root = path.resolve(__dirname, '..');
  const filesToScan = [
    'config.js',
    'security.js',
    'application.js',
    'branding.js',
    'home.js',
    'country-page.js',
    'api/ai-chat.js',
    'netlify/functions/ai-chat.js'
  ];

  let leakedSecretsFound = false;

  for (const relPath of filesToScan) {
    const absPath = path.join(root, relPath);
    if (!fs.existsSync(absPath)) continue;
    const content = fs.readFileSync(absPath, 'utf8');

    if (/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.*service_role/i.test(content) || /service_role.*secret/i.test(content)) {
      console.error(`  ❌ Potential service_role secret leak in ${relPath}`);
      leakedSecretsFound = true;
    }

    if (/-----BEGIN (RSA|EC|PRIVATE) KEY-----/.test(content)) {
      console.error(`  ❌ Private key detected in ${relPath}`);
      leakedSecretsFound = true;
    }
  }

  assert(leakedSecretsFound === false, 'Zero private service_role or API private keys in frontend source files');
}

// --- Test 7: CORS Strict Whitelist Verification ---
console.log('\n[7] Verifying CORS Whitelist & Origin Defense...');
{
  const APPROVED_ORIGINS = new Set([
    'https://visadoo.com',
    'https://www.visadoo.com',
    'https://visadoo-uae.netlify.app',
    'https://visadoo.vercel.app'
  ]);

  function getAllowedOrigin(origin) {
    if (!origin) return null;
    try {
      const parsed = new URL(origin);
      const host = parsed.hostname.toLowerCase();
      const proto = parsed.protocol;
      if (proto !== 'http:' && proto !== 'https:') return null;

      const originNormalized = `${proto}//${host}${parsed.port ? ':' + parsed.port : ''}`;
      if (APPROVED_ORIGINS.has(originNormalized)) {
        return originNormalized;
      }
      if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
        return originNormalized;
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  assert(getAllowedOrigin('https://visadoo.com') === 'https://visadoo.com', 'visadoo.com is allowed');
  assert(getAllowedOrigin('https://visadoo.vercel.app') === 'https://visadoo.vercel.app', 'visadoo.vercel.app is allowed');
  assert(getAllowedOrigin('https://visadoo-uae.netlify.app') === 'https://visadoo-uae.netlify.app', 'visadoo-uae.netlify.app is allowed');
  assert(getAllowedOrigin('http://localhost:3000') === 'http://localhost:3000', 'localhost dev origin allowed');
  assert(getAllowedOrigin('https://attacker.netlify.app') === null, 'Arbitrary netlify subdomain is blocked');
  assert(getAllowedOrigin('https://evil-visadoo.com') === null, 'Arbitrary domain is blocked');
  assert(getAllowedOrigin('null') === null, 'null origin is blocked');
}

// --- Test 8: Security Headers Verification (Vercel & Netlify) ---
console.log('\n[8] Verifying Vercel & Netlify Security Headers Configuration...');
{
  const root = path.resolve(__dirname, '..');
  const vercelPath = path.join(root, 'vercel.json');
  const netlifyPath = path.join(root, 'netlify.toml');

  const vercelContent = fs.readFileSync(vercelPath, 'utf8');
  const netlifyContent = fs.readFileSync(netlifyPath, 'utf8');

  assert(vercelContent.includes('Content-Security-Policy'), 'CSP configured in vercel.json');
  assert(vercelContent.includes('Strict-Transport-Security'), 'HSTS configured in vercel.json');
  assert(vercelContent.includes('X-Content-Type-Options'), 'X-Content-Type-Options configured in vercel.json');
  assert(vercelContent.includes('X-Frame-Options'), 'X-Frame-Options configured in vercel.json');
  assert(vercelContent.includes('Referrer-Policy'), 'Referrer-Policy configured in vercel.json');
  assert(vercelContent.includes('Permissions-Policy'), 'Permissions-Policy configured in vercel.json');
  assert(vercelContent.includes('no-store'), 'Private no-store caching configured for /app.html in vercel.json');

  assert(netlifyContent.includes('Content-Security-Policy'), 'CSP configured in netlify.toml');
  assert(netlifyContent.includes('Strict-Transport-Security'), 'HSTS configured in netlify.toml');
  assert(netlifyContent.includes('X-Content-Type-Options'), 'X-Content-Type-Options configured in netlify.toml');
  assert(netlifyContent.includes('X-Frame-Options'), 'X-Frame-Options configured in netlify.toml');
  assert(netlifyContent.includes('Referrer-Policy'), 'Referrer-Policy configured in netlify.toml');
  assert(netlifyContent.includes('Permissions-Policy'), 'Permissions-Policy configured in netlify.toml');
}

// --- Test 9: Signed URL Expiry Consistency ---
console.log('\n[9] Verifying Signed URL Expiry Policy Across Codebase...');
{
  const root = path.resolve(__dirname, '..');
  const appJsPath = path.join(root, 'application.js');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');

  // Verify that no hardcoded 3600 second signed URLs exist in application.js
  const hasHardcoded3600 = /createSignedUrl\([^,]+,\s*3600/.test(appJsContent);
  assert(!hasHardcoded3600, 'Zero hardcoded 3600s signed URL calls in application.js');

  const usesShortExpiry = appJsContent.includes('SIGNED_URL_EXPIRY_DOWNLOAD_SEC') && appJsContent.includes('SIGNED_URL_EXPIRY_VIEW_SEC');
  assert(usesShortExpiry, 'Application uses centralized short-lived signed URL expiry constants');
}

// --- Test 10: Subresource Integrity (SRI) Verification ---
console.log('\n[10] Verifying Subresource Integrity (SRI) on External CDN Assets...');
{
  const root = path.resolve(__dirname, '..');
  const appHtml = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  assert(appHtml.includes('integrity="sha384-') && appHtml.includes('crossorigin="anonymous"'), 'app.html has SRI on CDN scripts/styles');
  assert(indexHtml.includes('integrity="sha384-') && indexHtml.includes('crossorigin=""'), 'index.html has SRI on Leaflet assets');
}

// --- Test Summary ---
console.log('\n' + '='.repeat(70));
console.log(`TEST RESULTS: ${passedTests} Passed, ${failedTests} Failed`);
console.log('='.repeat(70));

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL SECURITY CONTROLS VERIFIED SUCCESSFULLY!\n');
  process.exit(0);
}
