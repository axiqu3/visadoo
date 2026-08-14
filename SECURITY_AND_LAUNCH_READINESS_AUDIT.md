# Visa Doo — Security & Launch-Readiness Audit

**Date:** 2026-06-23
**Reviewed by:** CTO (automated audit)
**Audience:** CEO (plain English — no code needed)
**Scope:** Secrets/credentials, GitHub, Supabase database & security, file storage, email, Netlify hosting, user/role separation.

> This is a point-in-time review of the live MVP before opening to real users. No settings were changed during the audit. A safety checkpoint (`before-security-audit`) was created first.

---

## 1. Headline result

**No exposed passwords, secret keys, or broken access rules were found.** Your foundation is in good shape. The items below are mostly *hardening* and *email migration* steps to be properly market-ready — not emergency holes.

- ✅ No secret keys or passwords are hidden in your code.
- ✅ Nothing sensitive was ever uploaded to GitHub (full history scanned).
- ✅ Your GitHub repository is **Private**.
- ✅ Every database table is protected so people only see their own data.
- ✅ Customers **cannot** make themselves admins.
- ✅ Uploaded documents (passports, photos) sit in a **private** storage area.

---

## 2. What is SAFE today (verified)

**Secrets & code**
- The only "key" in your website files is your Supabase **publishable key**, which is *designed* to be public (it's already visible in every website's code and is protected by your database rules). Safe.
- A full scan of **every past version on GitHub** found no leaked keys or passwords.
- Local-only settings folders (`.claude`, `.netlify`) and any `.env` secret files are correctly excluded from GitHub.
- Netlify has **no stored secrets** today — nothing to leak there.

**Database (Supabase) access rules**
- All **14 data tables** have row-level protection switched on.
- **Applications & documents:** a customer can only see and edit **their own**. Only staff (admin/agent) can change an application's status. Viewers are read-only.
- **The email-settings table (where the email key lives) is admin-only.**
- **Profiles/roles:** a signed-in user can only change their own **name** — they **cannot** change their own role. Promoting someone to admin only happens through a protected, admin-only action. (This is the most important check — it passed.)

**File uploads**
- Passport copies, photos, and issued visas are stored in a **private** bucket; only the owning customer and staff can open them. A separate **public** area exists only for logos/site images (intended).

**Hosting & repo**
- GitHub repo is **Private**.
- The website is static files + small server functions; nothing private is exposed to the visitor's browser.

---

## 3. Findings by priority

### 🔴 CRITICAL — do before real users arrive
*(None are "leaks." These are launch-blockers because they affect whether real emails actually reach people.)*

1. **Finish the move to the new Visa Doo Brevo account, then disable the old one.**
   Today the system still uses the **old** Brevo account (emails send from `info@skybookdigital.com`). For a Visa Doo–branded, controlled setup, switch to the new account's credentials and then **turn off the old key** so it can never be used. (Steps in Section 5.)

2. **Set up email "domain authentication" (SPF/DKIM) for visadoo.com in the new Brevo account.**
   Without this, sign-in emails and status updates are likely to land in customers' **spam** — which effectively means real users can't sign in. This needs a few DNS records added at wherever your visadoo.com domain is managed. This is the single biggest deliverability item for launch.

### 🟠 IMPORTANT — should do soon after / around launch
3. **Move the email key out of the database into a locked-down hosting secret** (your chosen approach). Right now the status-email key is stored in the database and shown in the backend "Email" screen to admins. Moving it to a Supabase environment secret means it never lives in the database or any screen. *(This is a small code change I'll do with your go-ahead — not done in this audit.)*
4. **Lock down internal helper functions.** Three behind-the-scenes database helpers can technically be "pinged" directly. They don't leak data (one is already admin-guarded; the others only tell you about yourself), but for tidiness we can block direct outside calls.
5. **Use your own domain for the website** (e.g. `app.visadoo.com` or `visadoo.com`) instead of the `visadoo-uae.netlify.app` address — more trustworthy for customers and better for email/branding alignment.
6. **Add a privacy policy & terms page** before collecting real customer passport data (you already have a Pages feature to publish these).

### 🟢 OPTIONAL — nice hardening
7. Add standard security headers to the site (defense-in-depth in the browser).
8. Turn on Supabase's "leaked password protection" (low impact for you, since sign-in uses email links, not passwords).
9. Set up a regular database backup/export routine and basic uptime monitoring.
10. Review the status-email function so only signed-in staff can trigger it (it already checks staff role internally; this is extra belt-and-braces).

---

## 4. Email setup — how it works today

You actually have **two** email channels, and the migration touches both:

- **A. Sign-in emails** (the link/code people use to log in) — sent via **Supabase's** email settings using the old Brevo SMTP details.
- **B. Status-update emails** (Approved / Visa Issued / Action Needed) — sent by a small server function using the old Brevo **API key** stored in the database.

Both currently send from `info@skybookdigital.com` (old account). The migration points both at the **new Visa Doo Brevo account** and a **visadoo.com** sender.

---

## 5. Safe migration plan for the new Brevo credentials

**Golden rule:** the new keys are pasted **only** into your secure dashboards — never into chat, code, or GitHub. I'll give you the exact screens; you do the pasting.

**Step 1 — In the new Brevo account**
- Add and verify your sender/domain: **Senders, Domains & Dedicated IPs → Domains → add `visadoo.com`** and add the DNS records it shows (SPF/DKIM). This is the deliverability fix (Critical #2).
- Generate an **API key** under **SMTP & API → API Keys** (starts with `xkeysib-`). Note your **SMTP** details too (server, port, login, SMTP key) under the **SMTP** tab.

**Step 2 — Sign-in emails (Supabase)**
- Supabase dashboard → **Authentication → Emails / SMTP settings** → enter the new Brevo SMTP server, port, login and key, and set the sender to a `visadoo.com` address. Save and send a test.

**Step 3 — Status-update emails**
- *Preferred (your choice):* I add a locked-down secret in Supabase (e.g. `BREVO_API_KEY`) and update the email function to read it from there. You paste the new key into that secret in the Supabase dashboard. *(Small code change — pending your go-ahead.)*
- *Interim option:* until that change, you can paste the new key into the backend **Email** screen as today.

**Step 4 — Disable the old account's key**
- Once tests pass, delete/disable the **old** Brevo API key and SMTP key so they stop working.

I will never need to see any of these values.

---

## 6. What I did NOT change
- No code, database, storage, Netlify, or Brevo settings were modified during this audit.
- The two new files added are this report and `CLAUDE.md` (project rules). A checkpoint `before-security-audit` was taken first.

---

## 7. One-line verdict
**No security emergencies. Safe to keep building.** Before real customers: complete the Brevo migration (Critical #1), set up email domain authentication (Critical #2), then work through the Important list.
