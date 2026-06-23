# Product Architecture Audit (plain English)

_Reviewed 2026-06-23. Verdict: the architecture is sound for the next stage. A few additive foundations are needed before the communication modules._

## What you have
- **Frontend:** static site (HTML/CSS/JS), served by **Netlify** (+ Netlify edge functions for SEO pages).
- **Backend:** **Supabase** — database (PostgreSQL), customer login, file storage (private), and server functions.
- **Email:** **Brevo**, sending from your **authenticated visadoo.com** domain. Email key stored as a locked-down Supabase secret.
- **Version control:** private **GitHub** repo; manual deploys to Netlify.
- **Data:** 15 database tables, **every one with Row-Level Security ON** (customers only see their own data; staff access is role-gated).

## Is it strong enough to scale? — Yes
- Supabase/Postgres comfortably handles a CRM, communication logs, and reporting at your scale.
- Netlify + server functions handle the app and outbound messaging.
- No re-platforming needed. Growth = plan upgrades (paid tiers), not rebuilds.

## What to add before the big communication modules (additive, low risk)
1. **Customer record** — one profile per person, linking their applications, enquiries, and message history. (Today customer identity is spread across applications/enquiries.)
2. **Consent** — per-channel opt-in/opt-out, captured at apply/enquiry time. Required before any marketing/WhatsApp/birthday message.
3. **Notification engine tables** — message templates, a delivery/communication log (channel, status, retries), and automation rules (triggers/schedules).
4. **Scheduler** — Supabase scheduled jobs for delayed/birthday/review messages.
5. **Minor:** a "staff assigned" field on applications (for assignment/follow-ups).

## Security posture (already good — keep it)
- All secrets server-side only (never in code, browser, or GitHub).
- RLS on every table; customers isolated; staff gated by role.
- Document files stay private; exports are text-only and admin-only.
- **New rule for comms:** never message a customer without recorded consent; always honour opt-out; WhatsApp/API keys live only in server secrets.
