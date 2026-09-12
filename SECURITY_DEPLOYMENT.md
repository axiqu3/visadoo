# ENTERPRISE SECURITY DEPLOYMENT & PRODUCTION GUIDE

This guide provides step-by-step instructions for deploying Visa Doo to a hardened production infrastructure with Cloudflare Edge, Netlify, and Supabase.

---

## 1. Cloudflare Edge & WAF Configuration

Deploying Cloudflare in front of the application provides edge DDoS mitigation, TLS 1.3 termination, Bot Fight Mode, and Web Application Firewall (WAF) filtering.

### 1.1 DNS & Proxy Settings
1. Point your domain nameserver records to Cloudflare.
2. In the **DNS** tab, ensure the **Orange Cloud (Proxied)** is enabled for:
   - Root apex domain: `visadoo.com` &rarr; CNAME to `visadoo-uae.netlify.app`
   - Subdomain: `www.visadoo.com` &rarr; CNAME to `visadoo-uae.netlify.app`

### 1.2 SSL / TLS Encryption
1. Navigate to **SSL/TLS** &rarr; **Overview**.
2. Set SSL/TLS encryption mode to **Full (Strict)**.
3. In **Edge Certificates**:
   - Enable **Always Use HTTPS** (HTTP &rarr; HTTPS 301 redirects).
   - Set **Minimum TLS Version** to **TLS 1.2** (TLS 1.3 recommended).
   - Enable **Opportunistic Encryption** and **Automatic HTTPS Rewrites**.
   - Enable **HTTP Strict Transport Security (HSTS)**:
     - Max-Age: 6 months (15768000 seconds) or 1 year (31536000 seconds).
     - Include subdomains: On.
     - Preload: On.

### 1.3 Web Application Firewall (WAF) & Bot Mitigation
1. Navigate to **Security** &rarr; **Bots**:
   - Enable **Bot Fight Mode** to challenge automated scraping and vulnerability scanners.
2. Navigate to **Security** &rarr; **WAF** &rarr; **Managed Rules**:
   - Enable **Cloudflare Managed Ruleset** (OWASP Core Ruleset sensitivity: Medium/High).
3. Under **Rate Limiting Rules**, add a rule for the AI Chat endpoint:
   - **URI Path:** equals `/.netlify/functions/ai-chat` or `/api/ai-chat`
   - **Rate:** 20 requests per 1 minute per IP
   - **Action:** Block or Managed Challenge (10 minutes)

### 1.4 Geo-Blocking & High-Risk ASN Challenges (Optional)
If your operations target specific regions (e.g. GCC/UAE, India, UK, USA, Schengen area), create a WAF custom rule:
- **Expression:** `(not ip.geoip.country in {"AE" "IN" "SA" "QA" "KW" "OM" "BH" "GB" "US" "CA" "AU" "DE" "FR" "IT" "ES" "NL"}) and (http.request.uri.path contains "/api/")`
- **Action:** Managed Challenge

---

## 2. Supabase Production Hardening

### 2.1 Apply Database Security Migration
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project: `rfueqawvadcvhpmleeoi`.
3. Go to the **SQL Editor**.
4. Open the file `supabase/migrations/20260901_enterprise_security_hardening.sql`.
5. Click **Run** to apply:
   - Creation of the immutable `public.security_audit_logs` table.
   - Profile role escalation trigger (`check_profile_role_update`).
   - Strict Row Level Security policies on `applications`, `visa_documents`, and `storage.objects`.
   - Private bucket lockdown for `visa-documents` and `finance-files`.

### 2.2 Storage Bucket Privacy Verification
1. Navigate to **Storage** &rarr; **Buckets**.
2. Verify the configuration of all buckets:
   - `visa-documents`: **Private** (Public bucket switch: OFF)
   - `finance-files`: **Private** (Public bucket switch: OFF)
   - `public-media`: **Public** (Public bucket switch: ON)

### 2.3 Supabase Auth & MFA Configuration
1. Navigate to **Authentication** &rarr; **Settings**:
   - Enable **Time-based One-time Passwords (TOTP)** under Multi-Factor Authentication.
   - Enforce MFA enrollment for team members with staff roles (`admin`, `agent`, `finance`, `sales`).
   - Set OTP expiry to 10 minutes.
   - Set password minimum length to 8 characters with required numbers and symbols.

---

## 3. Netlify Edge & Environment Secrets

### 3.1 Environment Variable Configuration
1. In your Netlify Dashboard, navigate to **Site Settings** &rarr; **Environment Variables**.
2. Add the production secrets (refer to `.env.example`):
   - `GEMINI_API_KEY`: Google Gemini API key for serverless AI chat.
   - `OPENAI_API_KEY`: OpenAI API key (optional fallback for AI chat).
   - `OPENAI_MODEL`: `gpt-4o-mini`
3. **DO NOT** add `SUPABASE_SERVICE_ROLE_KEY` to Netlify unless required by a protected serverless backend function. It must never be bundled into frontend JS.

### 3.2 Build & Asset Caching
1. `netlify.toml` is pre-configured with immutable asset hashing (`/assets/*`, `/build/*`, `.js`, `.css`) and security headers.
2. Ensure automated git deployments trigger a clean build on `main`.

---

## 4. Key Rotation & Secret Management SOP

1. **Supabase Publishable vs Service Role:**
   - `sb_publishable_...` is safe in frontend code because access is governed by Database Row Level Security (RLS).
   - `service_role` key must **never** appear in git or frontend scripts.
2. **Key Rotation Schedule:**
   - Rotate AI API keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`) every 90 days.
   - Rotate Brevo email API keys (`BREVO_API_KEY`) every 180 days.
   - If any secret is accidentally exposed, immediately revoke and re-issue in the respective provider dashboard.

---

## 5. Security Incident Response Playbook

In the event of suspected unauthorized access or compromise:
1. **Immediate Revocation:** Revoke compromised tokens/keys from the Supabase or Netlify dashboard.
2. **Session Termination:** In Supabase Auth &rarr; Users, terminate all active sessions for affected accounts.
3. **Audit Log Inspection:** Query `public.security_audit_logs` in the Supabase SQL editor:
   ```sql
   SELECT * FROM public.security_audit_logs
   WHERE created_at >= NOW() - INTERVAL '24 HOURS'
   ORDER BY created_at DESC;
   ```
4. **Edge Lockdown:** Enable Cloudflare **Under Attack Mode** if under an active volumetric or application-layer DDoS assault.
