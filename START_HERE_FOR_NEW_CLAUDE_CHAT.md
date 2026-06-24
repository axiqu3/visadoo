# START HERE — context for a new Claude Code chat (Visa Doo)

_If you are a fresh Claude Code chat, read this first, then the documents listed at the bottom. Do not rely on old chat history — everything you need is in the project files + this doc + the saved memory._

---

## 1. What the app is & who it's for
**Visa Doo** is a global tourist/business **visa application platform**. Customers browse destinations, apply for a visa online, upload documents, and track progress through 6 stages. Staff/admin manage applications in a backend console. The owner is the **CEO (non-technical)** — always explain in plain English, no jargon, and decide technical details yourself.

## 2. Tech stack
- **Frontend:** plain **HTML/CSS/JS** (no framework, no build step). Files: `index.html`, `home.js`, `app.html`, `application.js` (the big admin/app SPA), `branding.js`, `config.js`, `styles.css`, `app.css`.
- **Hosting:** **Netlify** — live `https://visadoo-uae.netlify.app`, site id `d7241432-c022-4073-9778-f268f483d427`. SEO pages are Netlify **edge functions** (Deno) in `netlify/edge-functions/` (visa, country, articles, page, home, sitemap), routed in `netlify.toml`.
- **Backend:** **Supabase**, project ref `rfueqawvadcvhpmleeoi` — Postgres DB, Auth (magic-link + Google), private Storage (`visa-documents`), and **Supabase Edge Functions** (deployed via MCP, NOT in the git repo).
- **Email:** **Brevo** (new Visa Doo account, `hello@visadoo.com`, visadoo.com domain authenticated).
- **Version control:** private GitHub repo **`visadoo/visadoo`**; CEO pushes via **GitHub Desktop**.
- **Deploy:** manual — Netlify MCP `deploy-site` → `npx @netlify/mcp@latest --site-id <id> --proxy-path "<FULL token>"` with portable Node `C:\nodejs-portable\node-v20.18.1-win-x64` on PATH. Pass the FULL token (it sometimes gets mangled — re-fetch if a 500 occurs).

## 3. Completed MVP features
_Latest (2026-06-24): **Backend nav redesigned — grouped LEFT SIDEBAR** (replaces the crowded horizontal tab row). Same `data-section` keys + routing (nothing broke). Built in application.js `adminNavModel()` (groups → items, each role-gated) + `adminSections()`/`wireAdminSections()` + `ADMIN_VIEWS`; styled in app.css (`.admin-side`, `.side-group`, `.side-item`, etc.). Groups: **Customers** (Applications/Enquiries/Customers), **Messaging** (Communications), **Catalogue** (Destinations/Visa Types), **Content** (Articles/Content/Site SEO), **Settings** (Brand & Settings/Email/Team). Collapsible groups (current auto-opens), inline-SVG icons in brand colour, role-aware (empty groups hide). Desktop: fixed sidebar (top:73px, 236px) + content shifted via `body.has-admin-side`. Phone (≤900px): ☰ toggle opens a slide-out drawer + backdrop. Top bar (logo/role/sign out) unchanged; customer & public pages untouched. **To add a future admin feature: add it to a group in `adminNavModel()` + the router — no horizontal-space worries.** Verified desktop + mobile via preview. Checkpoints `before-admin-sidebar`, `after-admin-sidebar`. NOTE: committed, deploy separately._

_Earlier (2026-06-24): **Phase 1 COMPLETE — Step 1c Notification & Automation engine DONE.** New tables `message_templates`, `messages` (delivery log), `automation_rules` (all RLS). First automation: a **review-request email 3 days after "Visa Issued"** (to everyone who got their visa, opt-outs honoured). DB enqueue trigger schedules it; edge fn `process-due-messages` (run every 15 min by **pg_cron**) re-checks consent, renders the template, sends via Brevo, and logs to `messages`. Existing status emails (`send-status-email` v9) now log to `messages` too. New admin **"Communications"** tab: automation on/off, Google review link field, template editor, and searchable message history. Engine is LIVE in Supabase (safe: review emails skip until the CEO pastes a Google review link in Communications). Extensions pg_net + pg_cron enabled; cron→fn verified (HTTP 200). WhatsApp-ready (sender currently email-only; WhatsApp channel skips until Meta approves). Checkpoints `before-notification-engine`, `after-notification-engine`. **CEO to-dos: (a) set the Google review link in Communications; (b) deploy 1a+1b+1c static files (application.js, home.js, index.html) to Netlify when ready.**_

_Earlier (2026-06-24): **Phase 1 Step 1b — Consent DONE.** New `consent` table (RLS staff-only; one row per customer per channel email/WhatsApp) holding marketing opt-in + a wording/timestamp **audit snapshot** and a service opt-out flag. Safe gate `consent_allows(customer,channel,purpose)` → defaults marketing OFF / service ON when no row. Capture: apply form has a **pre-ticked** marketing box → signed-in customer records it via SECURITY DEFINER `record_my_marketing_consent` (own record only); contact form has the same box → recorded server-side by the `send-contact` edge fn (v3). Admin Customers screen shows a **Marketing: On/Off** pill + a per-customer toggle, and the CSV gained a Marketing Consent column. Backfilled 16 rows (8 customers, marketing OFF / service ON per CEO rule). Verified: gate defaults, self-service RPC writes only the caller's record (admin 8 / others 0 still holds), edge-fn opt-out capture end-to-end, advisor clean (only the intentional self-service fn warning). Files: application.js, home.js, index.html. Checkpoints `before-consent`, `after-consent`. **NEXT = Step 1c Notification & Automation engine (templates, delivery log, automation rules, scheduler) — uses `consent_allows` as the send gate.**_

_Earlier (2026-06-24): **Phase 1 Step 1a — Customer record DONE + LIVE.** New `customers` table (RLS-on, staff-only; one row per lowercased email), additive `customer_id` link columns on `applications`+`enquiries`, and BEFORE-INSERT auto-link triggers (find-or-create a customer on every new application/enquiry, fill-gaps-never-clobber). Backfilled 8 customers from existing data; all rows linked. Admin **Customers** tab now reads the real table (with per-person app count + lead source + "Enquiry only" tag; CSV gained Source/First Seen/Last Seen). Verified: RLS (admin 8 / customer 0 / anon 0), trigger create+link with no duplicates, security advisor clean (no new ERRORs). Checkpoints `before-comms-foundation`, `after-customer-record`. CEO consent decisions for the next steps are recorded in project memory `visadoo-comms-foundation`. **NEXT = Step 1b Consent, then 1c Notification engine.**_

_Earlier (2026-06-23): **Visa ETA feature COMPLETE** — admin sets a per-visa processing time (days/hours, columns visa_types.processing_time_value/unit); shown on the apply form, the visa detail page, as a brand-coloured "⚡ Get your visa in about X days/hours" badge on each visa card on the **country pages** (country.js etaBadge), AND as a "⚡ Get your visa in as little as X" badge on the **homepage destination & group cards** (home.js fastestEta/etaPill — fastest across each country's visas, compares hours vs days). All hidden when ETA blank. All branding flash issues fixed. **A fresh chat for the next modules should start only AFTER this work is pushed to GitHub (GitHub Desktop → Push origin).**_

Visa catalogue (countries, groups, visa types; **multi-currency** chosen in backend with a per-visa price per currency; **visa ETA / expected processing time** with a "Get your visa in X" badge on country-page visa cards). Customer **apply form** (passport-issuing-country + India-state searchable dropdowns via country-state-city CDN, document upload, custom per-visa questions) and **6-stage tracker**. **Sign-in:** email **password** sign-in for staff/admins (Supabase signInWithPassword) shown first, with **magic-link** ("email me a sign-in link") below for customers, **Google** option, and **Forgot password** (resetPasswordForEmail → PASSWORD_RECOVERY → set-password screen). Staff set their own password in-app via the header **"Set password"** link (view `setpw`, renderSetPassword, updateUser) — staff-only entry point. Passwords live in Supabase Auth (no app table/DB change). **RBAC** roles (customer/admin/agent/content/viewer). **Admin console:** Applications (search/filter/sort), **Enquiries** log (ENQ-000001 series), **Customers** (deduped, CSV export, text-only), Destinations, Visa Types, Articles, Content (pages/FAQ/reviews), Site SEO, Brand & Settings, **Email**, Team. Homepage (destinations search, reviews, FAQ, "Effortless Visa Solutions" tagline + welcome). **Contact form** → saves an enquiry + emails via Brevo. **Status-update emails** (Approved / Visa Issued / Action Needed) via Brevo.

## 4. Security summary
- **All secrets live only in dashboards** (Supabase/Netlify) — never in code, the browser, GitHub, or chat. Only the Supabase **publishable/anon** key is in client files (public by design, protected by RLS).
- Brevo API key is a **Supabase Edge Function secret** `BREVO_API_KEY`.
- Document files are in a **private** Storage bucket; CSV exports are text-only + admin-only (no passport number/DOB).
- JS/CSS/HTML served with **must-revalidate** (no stale cached files).

## 5. Database / RLS summary
**15 tables, every one with Row-Level Security ON:** profiles, applications, documents, visa_types, visa_questions, visa_groups, countries, articles, pages, faqs, reviews, site_settings, email_settings, team_invites, enquiries. Customers can read/write only their **own** rows (matched on `auth.uid()`); staff access is gated by `has_role(...)` / `is_admin()`. Role changes only via admin-guarded `set_user_role`. `email_settings` and `enquiries` are admin-only.

## 6. Email / Brevo migration summary
Migrated from an old (skybookdigital) Brevo account to the **new Visa Doo Brevo account**. Status emails send via the **API key** stored in Supabase secret `BREVO_API_KEY`. Sign-in emails send via **Supabase Auth Custom SMTP** using a Brevo **SMTP key** (`xsmtpsib-`). Sender = **hello@visadoo.com** (the only verified sender; visadoo.com is domain-authenticated). **Pending:** CEO to revoke the OLD account's keys (only after confirming nothing else uses them). Note: API key (`xkeysib-`) ≠ SMTP key (`xsmtpsib-`) — don't mix them.

## 7. Roadmap & phase logic
CEO priority = **automate customer communication** (email + WhatsApp together). Payments not soon. Team 2–5.
- **Phase 1 (now):** foundations — **Customer record + Consent + Notification & Automation Engine** (email + WhatsApp-ready). Quick win **Visa ETA = DONE**. CEO to start **Meta WhatsApp business verification** (slow).
- **Phase 2:** WhatsApp live, review-request automation, birthday module, communication history, staff assignment + follow-ups, CRM views.
- **Phase 3:** major-events module, reports/analytics, advanced workflows, richer exports, online payments + revenue analytics.
See `FUTURE_MODULE_ROADMAP.md` for the full reasoning.

## 8. Important rules (from CLAUDE.md)
- Never hardcode secrets; only the anon key is allowed client-side; service-role key only in Supabase edge secrets.
- RLS stays ON for every public table; never let users change their own `role`.
- Brevo API key lives in a Supabase secret. Sender must be a verified visadoo.com address.
- Keep the GitHub repo private; never commit `.env`, `.claude/`, `.netlify/`.
- One feature at a time; checkpoint before & after; self-verify (incl. mobile width) before deploying; don't ask the non-technical owner to test what you can verify.
- **New rule (comms):** never message a customer without recorded **consent**; always honour opt-out.

## 9. What must NOT be changed casually
RLS policies; auth/role functions (`set_user_role`, `handle_new_user`, `is_admin`, `has_role`); the `BREVO_API_KEY` secret + Supabase Auth SMTP config; the `netlify.toml` cache headers; domain authentication; live customer data (applications, enquiries, customers). Do **not** disable the OLD Brevo account's keys without confirming nothing uses them.

## 10. Next recommended build sequence
1. (CEO) Start **Meta WhatsApp Business verification** now (runs for weeks).
2. (Fresh chat) Build **Phase-1 foundation**: unified **Customer record** → **Consent** capture → **Notification & Automation Engine** (email first, WhatsApp-ready). Then review-request automation, birthdays, etc. (Phase 2).

## 11. Starter prompt to paste into a fresh Claude Code chat
> "You are continuing the Visa Doo project. First read `START_HERE_FOR_NEW_CLAUDE_CHAT.md`, then `CLAUDE.md`, `FUTURE_MODULE_ROADMAP.md`, `PRODUCT_ARCHITECTURE_AUDIT.md`, `DATABASE_SCALING_REVIEW.md`, `SECURITY_AND_LAUNCH_READINESS_AUDIT.md`, and `CLAUDE_CODE_WORKFLOW_GUIDE.md`, plus the saved project memory. I'm the non-technical CEO — explain in plain English. We're starting **Phase 1: the Customer record + Consent + Notification & Automation Engine foundation**. Do NOT build yet — confirm a clean git status, create a `before-<feature>` checkpoint, tell me in plain English what tables/files you'll touch and why, ask me any business-priority questions one at a time, and wait for my go. Follow all CLAUDE.md rules; no secrets in code/chat; one feature at a time with before/after checkpoints."

## 12. Documents a fresh chat must read before making changes
1. `START_HERE_FOR_NEW_CLAUDE_CHAT.md` (this file)
2. `CLAUDE.md` (standing rules)
3. `FUTURE_MODULE_ROADMAP.md` (phases, priorities)
4. `PRODUCT_ARCHITECTURE_AUDIT.md`
5. `DATABASE_SCALING_REVIEW.md`
6. `SECURITY_AND_LAUNCH_READINESS_AUDIT.md`
7. `CLAUDE_CODE_WORKFLOW_GUIDE.md`
8. The saved Claude "memory" for this project (loaded automatically).

_Before starting any new module: confirm clean git status and create a `before-<feature>` checkpoint._
