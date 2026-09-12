# ENTERPRISE SECURITY HARDENING CHECKLIST

This checklist tracks the security controls across the Visa Doo application and infrastructure.

---

## 1. IMPLEMENTED IN CODEBASE (Ready & Tested)

- [x] **Client-Side AES-256-GCM Draft Encryption:** Form drafts in `localStorage` are encrypted using authenticated AES-256-GCM (`security.js`, `application.js`).
- [x] **Magic-Byte Binary Signature Validation:** Inspects real file headers (`FF D8 FF` for JPEG, `89 50 4E 47` for PNG, `RIFF...WEBP` for WEBP, `%PDF` for PDF) rejecting spoofed/polyglot files (`security.js`, `application.js`).
- [x] **Strict Filename & Path Sanitization:** Eliminates path traversal characters and generates cryptographically randomized upload storage paths (`security.js`, `application.js`).
- [x] **Short-Lived Storage Signed URLs:** Reduced signed URL lifetimes to 15m (viewing) / 5m (downloads) with zero persistent public exposure of passport scans (`application.js`).
- [x] **Authentication Brute-Force & Rate Limiting:** Progressive exponential delays and temporary 15-minute lockouts for repeated failed logins or reset attempts (`security.js`, `application.js`).
- [x] **Idle Session Inactivity Auto-Logout:** Automatic session timeout monitor (20 min staff / 60 min customer) with cross-tab logout synchronization via `storage` events (`security.js`, `application.js`).
- [x] **Multi-Factor Authentication (MFA / TOTP) UI:** Authenticator enrollment, secret key challenge, verification, and unenrollment interface in Profile settings (`application.js`).
- [x] **Security Audit Logging System:** Dedicated event dispatcher logging sensitive document views, auth events, and status changes without storing plaintext PII (`security.js`, `application.js`).
- [x] **PII Masking Utilities:** Helper functions for masking passport numbers (`XX***XX`), emails (`u***r@domain.com`), and phone numbers (`+971 50 *** 1234`) (`security.js`).
- [x] **Serverless AI Chat Hardening:** In-memory IP rate limiting, origin check, message length constraints, and safe generic error masking (`api/ai-chat.js`, `netlify/functions/ai-chat.js`).
- [x] **Preview Server Path Traversal Defense:** Resolved boundary validation in `tools/codex-preview-server.cjs`.
- [x] **Production Security Headers in Netlify:** Configured strict CSP, HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy` (`netlify.toml`).
- [x] **Database Security Migration:** Scripted immutable `public.security_audit_logs` table, role escalation prevention trigger, and IDOR-proof RLS policies (`supabase/migrations/20260901_enterprise_security_hardening.sql`).
- [x] **Environment Template:** Created `.env.example` with zero hardcoded credentials.

---

## 2. REQUIRES HOSTING / DASHBOARD CONFIGURATION (Supabase & Netlify)

- [ ] **Run Supabase Database Migration:** Execute `supabase/migrations/20260901_enterprise_security_hardening.sql` in the Supabase SQL Editor.
- [ ] **Verify Storage Bucket Privacy:** Ensure `visa-documents` and `finance-files` buckets in Supabase Storage have public access turned **OFF**.
- [ ] **Configure Netlify Environment Variables:** Set `GEMINI_API_KEY`, `OPENAI_API_KEY`, and `OPENAI_MODEL` in Netlify Site Settings &rarr; Environment Variables.
- [ ] **Enforce Staff MFA in Supabase:** Enable TOTP in Supabase Auth Settings and require staff members to configure an authenticator app.
- [ ] **Configure Supabase Auth Redirect URLs:** Ensure allowed redirect URLs only include production domains (`https://visadoo-uae.netlify.app`, `https://visadoo.com`, `https://www.visadoo.com`) and remove temporary domains.

---

## 3. REQUIRES EXTERNAL SERVICE CONFIGURATION (Cloudflare & Email)

- [ ] **Cloudflare Proxy & DNS:** Proxy apex domain and `www` CNAME through Cloudflare (Orange Cloud enabled).
- [ ] **Cloudflare SSL/TLS Full (Strict):** Set SSL mode to Full (Strict) with Minimum TLS Version 1.2 / 1.3.
- [ ] **Enable Cloudflare Bot Fight Mode:** Mitigate automated scanners and malicious web scrapers.
- [ ] **Cloudflare AI Chat Rate Limiting Rule:** Apply 20 req/min rate limit rule on `/.netlify/functions/ai-chat` and `/api/ai-chat`.
- [ ] **Brevo / Email Domain Authentication:** Ensure SPF, DKIM, and DMARC DNS records are verified for transactional email sending.

---

## 4. RECOMMENDED FUTURE IMPROVEMENTS

- [ ] **Automated ClamAV / Virus Scanning for Uploads:** Introduce an asynchronous Supabase Edge Function or AWS Lambda to scan newly uploaded passport images against malware signatures.
- [ ] **Cloudflare Turnstile CAPTCHA Integration:** Wire the pre-built hook in `VisaDooSecurity.verifyCaptcha()` to a live Cloudflare Turnstile site key on the public sign-in form.
- [ ] **SIEM / Centralized Log Export:** Stream `security_audit_logs` to Datadog, AWS CloudWatch, or a SIEM tool for automated alert triage.
- [ ] **Quarterly Penetration Testing:** Schedule regular external penetration tests before each major application milestone.
