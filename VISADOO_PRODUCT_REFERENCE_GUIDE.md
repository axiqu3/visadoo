# Visa Doo — Product Reference Guide

_Plain-English reference for the Visa Doo web app, written for a non-technical owner._
_Last updated: 30 June 2026. Reflects the actual, current state of the project (files, database, integrations, and recent work)._

> **Purpose:** help with future development, staff training, product planning, and developer handover.
> **Note:** This is a documentation file only. It does not change any app behaviour, data, or settings. It deliberately contains **no passwords, API keys, or secrets.**

---

## 1. What Visa Doo is and who it is for

**Visa Doo is an online visa-application platform.** A customer chooses a destination country and visa type, fills in an application, uploads their documents, and then tracks the progress of that application through clear stages until the visa is issued. Behind the scenes, the Visa Doo team manages every application, money, suppliers, and customer communication from a private admin console.

**Who it's for:**
- **Customers** — travellers who want a tourist or business visa without the usual back-and-forth. They apply, upload, and track everything online.
- **The Visa Doo team** — owner/admin, operations, sales, finance, and content staff who process applications, handle payments and suppliers, and keep customers informed.

**The business it supports:** a visa-processing agency that sells visas (priced in Indian Rupees, ₹), works with external suppliers (embassies, processing partners like VFS), and wants to communicate with customers automatically by email and WhatsApp.

---

## 2. Current tech setup (the building blocks)

Think of Visa Doo as four services working together. You don't need to operate them daily — this is just so everyone knows what sits where.

| Piece | What it is | What it does for Visa Doo |
|---|---|---|
| **Netlify** | Website hosting | Serves the public website and the application area to the world. Live at **visadoo-uae.netlify.app**. Also runs small "edge" programs that build SEO-friendly pages for Google. |
| **Supabase** | The database + login + file storage + small server programs | Stores all data (applications, customers, money, etc.), handles sign-in, keeps uploaded documents safe, and runs the automation that sends emails/WhatsApp. Project reference: `rfueqawvadcvhpmleeoi` (region: Mumbai, India). |
| **GitHub** | Code backup & history | A **private** repository (`visadoo/visadoo`) that stores every version of the website code. You back up changes by clicking "Push origin" in **GitHub Desktop**. |
| **Brevo** | Email sending service | Sends sign-in emails and customer notification emails. Sends from **hello@visadoo.com** (a verified, domain-authenticated address so emails don't land in spam). |
| **Telinfy (WhatsApp)** | WhatsApp Business messaging (via the provider GreenAds/Telinfy) | Sends WhatsApp messages to customers (status updates, confirmations, etc.). Already connected and live for notifications. |

**How the website is built:** plain web pages (HTML/CSS/JavaScript) with **no complicated build step** — simple, fast, and easy to maintain. The main files are `index.html` + `home.js` (public website), `app.html` + `application.js` (the customer application area **and** the staff admin console), plus shared styling and branding files.

---

## 3. Features actually built so far

Everything below is **live and working today** unless marked otherwise.

**Customer side**
- Browse destinations and visa types; see prices in ₹ and an estimated processing time ("Get your visa in about X days").
- Apply online: passport details, searchable country/Indian-state pickers, document upload (passport + photo), and any extra per-visa questions.
- **Mobile number field with a country picker** (defaults to +91 India) — newly added.
- A **6-stage progress tracker** so customers always know where their application stands.
- Download the issued visa file when it's ready.
- A two-way **"Action Needed" conversation**: if staff need something, the customer sees the request and can reply and upload right from their tracker.
- Contact/enquiry form on the website.

**Team / business side** (see Sections 4 and below for detail)
- Full admin console to manage applications, customers, enquiries, suppliers, finance, content, and settings.
- **Finance module** (cost lines, margin, GST, customer payments with numbered receipts, refunds, supplier ledgers, finance reports).
- **Automated customer communication** by email and WhatsApp.

**Built but switched OFF (waiting on one approval)**
- **Mobile number verification by WhatsApp OTP** (one-time code). The field and country picker are live; the actual code-verification is fully built but turned off until WhatsApp approves the required message template. See Sections 9 and 15.

---

## 4. Admin / backend features

Staff sign in and use a private console (a left-hand sidebar groups everything). Current sections:

- **Customers group**
  - **Applications** — the heart of operations. A clean, searchable list; click any application to open its full page (documents, answers, conversation, finance, and the controls to change status, request documents, and attach the issued visa). Filters by status, payment, supplier, new reply, pending refund, and more. **Admins can Edit** the applicant's details (name, mobile with country picker, email, passport, dates, country, visa type, notes) with a field-by-field **Edit history** (status is changed via its own control, which notifies the customer).
  - **Customers** — one clean record per person (auto-gathered from applications and enquiries), with marketing on/off and CSV export. Admins can **Edit** any field (name, mobile with country picker, email, date of birth, country, state, notes, status), and an **Edit history** tab logs every change (old → new, who, when).
- **CRM group** (Admin/Agent/Sales full; Viewer read-only) — the internal sales pipeline for turning interest into applications.
  - **Enquiries** — every contact-form enquiry, logged with a reference (ENQ-000001 series). Staff can mark status (New/Contacted/Closed) and press **Convert to lead** to start a pipeline record (the person is matched or created automatically).
  - **Leads** — potential customers you are following up. Each lead has a number (LEAD-000001), a **stage** (New → Contacted → Qualified → Quoted → Converted / Lost), an **owner** (defaults to whoever created it), a **next follow-up date**, an optional **expected value (₹)**, notes, and an **activity trail** (log notes/calls; every stage/owner change is recorded). Compact searchable list with filters (stage, owner, source, due/overdue) and CSV export, plus an open-pipeline value total. **Add lead** captures walk-in/phone/referral leads. **Convert to application** (Admin/Agent) turns a qualified lead into a real application — pre-filled from the lead, collecting passport/nationality — and links the two so no data is re-typed.
  - **Follow-ups** — a focused list of leads **due today or overdue**, filterable by owner, so nothing slips.
- **Messaging group** (three separate screens, so each can grow without clutter)
  - **Automations** — turn the review-request automation on/off and set the Google review link. (Other automatic messages — status, application/payment confirmations, birthday — run automatically.)
  - **Message templates** — view and edit the wording of every automatic email/WhatsApp.
  - **Message history** — the full log of everything sent, with filters (channel, status, type, date, recipient search) and CSV export.
- **Finance group** (finance/admin only)
  - **Suppliers** — your visa suppliers, each showing an Outstanding/Settled balance, with a Statement of Account page and the ability to record payments to them.
  - **Refund requests** — a queue where operations/sales raise refund requests and finance approves or rejects them.
  - **Finance reports** — receivables, supplier payables, profit margins, and a **Supplier-wise detailed report** (row per supplier cost line: date, applicant, passport, visa, country, supplier, invoice no., cost, status, reference), each exportable to CSV. Filters include date range, supplier, visa, application status, and customer payment. (Each supplier cost line now also has an **invoice no.** field in the per-application finance panel.)
- **Catalogue group** — **Destinations** (countries/groups), **Visa Types** (add/edit visas, prices, processing time, per-visa questions, SEO), and **Events** (add/edit international events that promote a country's visas — name, country, category, dates, image, on/off).
- **Content group** — **Articles**, **Content** (pages/FAQs/reviews), and **Site SEO**.
- **Settings group** — **Brand & Settings**, **Email**, and **Team** (invite staff, set roles).
- **Audit group** — **Audit Centre** (Admin/Owner only): one searchable, filterable timeline of important changes across the whole platform (who · when · module · record · action · old → new · risk level), merging the existing edit histories (Applications, Customers), the Finance audit, and Messaging events with a new central audit log. Read-only and append-only; staff role changes are now recorded here.

**Per-application finance panel (finance/admin only):** internal cost lines (e.g. visa processing, insurance, delivery, voucher) each optionally tied to a supplier, a margin (₹ or %), flexible GST, an automatically calculated customer price, customer payments with **numbered printable receipts**, and refunds. Customers and non-finance staff never see supplier costs or your margin.

---

## 5. Customer-facing features

- **Public website** (visadoo-uae.netlify.app): homepage with destination search, reviews, FAQs, and the brand message; individual country and visa pages built to be Google-friendly.
- **Events** (`/events`, linked in the menu): an Atlys-style page of international events grouped by month with category tabs; each event has its own page that promotes that country's visas ("Get [Country] visa", with a recommended lead-time before the event).
- **Sign-in:** customers use an emailed "magic link" (or Google); staff can use email + password. There's also a "set/forgot password" flow for staff.
- **Apply flow:** choose visa → fill details → upload documents → answer any extra questions → submit → get a reference code.
- **Mobile number with country picker** and (once switched on) WhatsApp code verification.
- **Tracker:** the 6 stages — Submitted → Documents Verified → Under Review → Payment Confirmed → Approved → Visa Issued — plus the "Action Needed" conversation and the final visa download.
- **Automatic updates:** customers receive email and WhatsApp messages at key moments (see Section 9).

---

## 6. User roles and permissions

Visa Doo uses role-based access so people only see what they should. The system supports these roles:

| Role | Who | What they can do |
|---|---|---|
| **admin** (Owner) | You / top management | Everything, including finance, team management, and overrides. |
| **agent** (Operations) | Processing staff | View and process applications; raise refund requests. **Cannot** see supplier cost or profit margin. |
| **sales** | Sales/support | Similar operational access; raise refund requests. **Cannot** see supplier cost or margin. |
| **finance** | Finance staff | Full finance: cost lines, margins, supplier ledgers, record payments, approve refunds, finance reports. |
| **content** | Content team | Manage catalogue and content (visas, pages, articles, SEO). |
| **viewer** | Read-only staff | View applications without editing. |
| **customer** | The public | Can only see and manage **their own** applications and data. |

**Key safety rules built in:**
- Customers can only ever access **their own** records.
- Money details (supplier cost, margin) are visible **only** to finance/admin.
- Nobody can change their own role; role changes go through a guarded admin-only function.
- _Currently assigned in the system: admin and customer accounts. The other roles are ready to assign as the team grows._

---

## 7. Database and data structure summary

All data lives in the Supabase database. **There are 31 data tables, and every single one has Row-Level Security turned ON** (meaning each request is checked against the rules above). In plain English, the main groups are:

- **People & access:** `profiles` (staff/customer accounts + role), `customers` (one clean record per person), `team_invites` (staff invitations), `consent` (per-channel marketing/service permission with an audit trail).
- **Applications & documents:** `applications` (each visa application), `documents` (uploaded files — stored privately), `app_messages` (the "Action Needed" conversation), `enquiries` (contact-form enquiries).
- **CRM:** `leads` (sales pipeline records — stage, owner, follow-up date, value, links to the customer/enquiry/application), `lead_activities` (append-only notes/calls and stage/owner history for each lead).
- **Catalogue:** `countries`, `visa_groups`, `visa_types` (the visas + prices), `visa_questions` (extra per-visa questions).
- **Content & site:** `articles`, `pages`, `faqs`, `reviews`, `site_settings`.
- **Finance:** `finance_settings`, `suppliers`, `application_finance` (per-application pricing), `application_cost_lines` (internal costs), `customer_payments` (payments/refunds + receipts), `supplier_payments` (money paid to suppliers), `finance_audit_log` (a permanent record of every financial change).
- **Messaging & automation:** `message_templates`, `automation_rules`, `messages` (a log of every email/WhatsApp sent), `email_settings`.
- **Mobile verification:** `phone_verifications` (short-lived one-time codes; only the server can touch it).

**File storage** uses three buckets: **visa-documents** (private — customer documents and issued visas), **finance-files** (private — payment proofs and receipts), and **public-media** (public — logos and images).

Uploaded customer documents and financial proofs are **never public** — they're only reachable through secure, time-limited links generated for authorised staff.

---

## 8. Security and privacy setup

- **No secrets in the code or on GitHub.** The only key present in the website files is the Supabase **publishable/anon key**, which is public by design and protected by the database security rules. All real secrets (email key, WhatsApp key, etc.) live only in the Supabase/Netlify dashboards.
- **Row-Level Security on every table** — customers see only their own data; staff access is gated by role.
- **Private document storage** — passports, photos, visas, and payment proofs are in private buckets, opened only via short-lived secure links.
- **Privacy-safe exports** — the Customers CSV is text-only and admin-only (no passport numbers or dates of birth).
- **Audit trails** — every financial change is recorded in an append-only finance log; every message sent is logged.
- **Consent first** — no marketing message is ever sent without recorded consent, and opt-outs are always honoured.
- **Email deliverability** — emails send from a verified, domain-authenticated visadoo.com address to avoid spam folders.
- **Fresh files** — the site is configured so browsers always load the latest version (no stale cached code).
- A full security review was completed earlier (see `SECURITY_AND_LAUNCH_READINESS_AUDIT.md`): no exposed secrets, repository private, all tables protected.

---

## 9. Active integrations and their status

| Integration | Purpose | Status |
|---|---|---|
| **Netlify** | Hosting + SEO pages | ✅ Live |
| **Supabase** | Database, login, storage, automation | ✅ Live |
| **GitHub** | Private code backup | ✅ Live (you push via GitHub Desktop) |
| **Brevo — sign-in emails** | "Email me a sign-in link" | ✅ Live |
| **Brevo — notification emails** | Status updates, application & payment confirmations, review request | ✅ Live |
| **WhatsApp via Telinfy — notifications** | Status updates, application received, payment received, review request | ✅ Live |
| **WhatsApp via Telinfy — mobile OTP verification** | Verify the customer's mobile before they apply | ⏳ Built but OFF — waiting for the WhatsApp **OTP message template** to be approved (see Section 15) |

**What goes out automatically today** (within ~2 minutes, via a background job that runs every 2 minutes):

| Moment | Email | WhatsApp |
|---|---|---|
| Status → Approved / Action Needed / Visa Issued | ✅ (sent instantly) | ✅ |
| New application submitted | ✅ | ✅ |
| Customer payment recorded | ✅ | ✅ |
| 3 days after Visa Issued (review request) | ✅ | ✅ (only to customers who opted in to marketing) |
| Customer's birthday (daily, 9 AM IST) | — | ✅ birthday greeting + 10% offer (only marketing opt-ins) |

Status-update emails are also classed as "service" messages, so they reach everyone; the review request is "marketing," so it only goes to people who opted in.

---

## 10. Current development workflow (GitHub + Claude Code)

Visa Doo is built one feature at a time, carefully, with the owner approving each step.

1. **Plan & approve** — the change is explained in plain English; the owner approves before anything is built.
2. **Checkpoint (before)** — a labelled save-point is created so we can roll back instantly if needed.
3. **Build** — the change is made in the code and/or database.
4. **Self-verify** — the change is tested (including on a phone-width screen) before going live; the owner isn't asked to test what can be checked automatically.
5. **Checkpoint (after)** + **commit** — another save-point is created.
6. **Deploy** — the website is published to Netlify manually (a deliberate choice, so nothing goes live by accident).
7. **Back up** — the owner clicks **"Push origin"** in GitHub Desktop to back up to GitHub.

**Database and server changes** (Supabase) are applied directly to Supabase and are **not** part of the GitHub backup — they live in Supabase itself. **Website file changes** (the pages and scripts) **are** backed up to GitHub.

Standing rules (full list in `CLAUDE.md`): no secrets in code or chat; security stays on; confirm before anything outward-facing or destructive; explain everything in plain English.

---

## 11. Current roadmap / pipeline

The owner's #1 priority is **automated customer communication** (email + WhatsApp), most of which is now built. The forward plan (full reasoning in `FUTURE_MODULE_ROADMAP.md`):

- **In progress / waiting:**
  - **Mobile OTP verification** — finish once the WhatsApp OTP template is approved by Telinfy/Meta.
- **Phase 2 (engagement):** birthday messages, communication history per customer, staff assignment + follow-ups, simple pipeline/notes, CRM views, more automations and campaigns.
- **Finance track:** F2 supplier statement aging, F3 B2B/agent client ledgers (bulk invoices, credit terms), F4 online payment gateway + branded PDF/Excel reports.
- **Phase 3 (growth):** events/lead-gen module, reports & analytics, advanced workflows, richer exports.

---

## 12. Recommended next build order

1. **Finish Mobile OTP verification** — the moment the WhatsApp OTP template is approved: plug in the template name, switch it on, test to the owner's number, and go live. (Smallest remaining step; everything else is built.)
2. **Communication history per customer (enhanced)** + **staff assignment & follow-ups** — high day-to-day value for a small team; builds on what exists.
3. **Birthday module** — quick win once consent + engine are in place.
4. **Finance F2 (supplier statements/aging)** — extends the finance module you already use.
5. **Finance F3 (B2B/agent ledgers)** — when you start serving agents/partners at volume.
6. **Online payments (Finance F4)** — only when you decide to collect payments online.
7. **Reports/analytics & events module** — later, once more data has accumulated.

_Rule of thumb: build one item per focused session, with before/after checkpoints, and switch outward-facing things on only after a real test._

---

## 13. Staff training notes

- **Signing in:** staff use email + password (set it via the "Set password" link in the header). Customers use an emailed sign-in link.
- **Daily work happens in Applications:** open an application to see everything and to change its status. Changing status to **Approved / Action Needed / Visa Issued** automatically notifies the customer (email + WhatsApp).
- **"Action Needed" is a conversation:** write a message and list the documents you need; the customer replies and uploads from their tracker, and the app moves to "Under Review" automatically. A "New reply" badge appears for staff.
- **Issuing a visa:** you must attach the visa file before you can mark an application "Visa Issued" — this is enforced.
- **Finance (finance/admin):** add internal **cost lines** and a **margin** to set the customer price; record customer **payments** (each generates a numbered receipt); record **supplier payments** on each supplier's Statement page; handle **refunds** through the Refund requests queue. Operations/Sales can **request** a refund but only finance approves it.
- **Customers screen:** one record per person; you can toggle their marketing consent and export a text-only CSV for outreach.
- **Privacy:** never share documents outside the system; supplier costs and margins are finance-only — don't quote them to customers.
- **Patience with timing:** automatic WhatsApp/emails go out within about two minutes (status-update emails are instant).

---

## 14. Developer handover notes

- **Architecture:** static front end (no framework/build) + Supabase (Postgres, Auth, Storage, Edge Functions) + Netlify (hosting + Deno edge functions for SEO) + Brevo (email) + Telinfy (WhatsApp).
- **Key files:** `index.html`/`home.js` (public site), `app.html`/`application.js` (the large SPA for both the customer app area and the admin console), `branding.js`, `config.js`, `styles.css`, `app.css`, `netlify.toml` (routing + cache headers), `netlify/edge-functions/*` (SEO pages: visa, country, articles, page, home, sitemap).
- **Database:** 29 tables, all RLS-enabled; managed via Supabase migrations (47 applied to date, names prefixed `visadoo_…` / feature names like `finance_f1*`, `whatsapp_integration`, `mobile_otp_foundation`). Access controlled by `has_role(...)`, `is_admin()`, and the finance-only checks; role changes only via the guarded `set_user_role`.
- **Edge functions (Supabase, deployed via MCP, not in git):** active = `send-status-email`, `send-contact`, `process-due-messages` (the email/WhatsApp sender, run every 2 min by pg_cron), `notify-staff-reply`, `send-mobile-otp`, `verify-mobile-otp`. Several older/diagnostic functions exist and are inert (e.g. `send-otp`, `brevo-*`, `otp-test`) — safe to ignore.
- **Messaging engine:** templates (`message_templates`) + rules (`automation_rules`) + a delivery log (`messages`); database triggers enqueue messages on the right events; the sender re-checks consent, renders the message, sends via Brevo (email) or Telinfy (WhatsApp), and logs the result. WhatsApp template names + languages are stored on the template rows; the customer's number is normalised to international format.
- **Secrets** live only in Supabase/Netlify (e.g. the email key, the WhatsApp key, the mobile-OTP settings) — never in the repo. Do not print or commit them.
- **Deploy:** manual via the Netlify MCP deploy flow (portable Node + a full proxy token); database/edge changes are applied directly to Supabase.
- **Read these first:** `START_HERE_FOR_NEW_CLAUDE_CHAT.md`, `CLAUDE.md`, `FUTURE_MODULE_ROADMAP.md`, `SCALABLE_FINANCE_LEDGER_PLAN.md`, `PRODUCT_ARCHITECTURE_AUDIT.md`, `DATABASE_SCALING_REVIEW.md`, `SECURITY_AND_LAUNCH_READINESS_AUDIT.md`, `CLAUDE_CODE_WORKFLOW_GUIDE.md`, and this guide.
- **Must not change casually:** RLS policies; auth/role functions; the cache headers in `netlify.toml`; domain authentication; live customer/finance data.

---

## 15. Pending decisions / open items

- **WhatsApp OTP template (the one active blocker):** Telinfy's account currently offers only **Utility** and **Marketing** template categories (no **Authentication** category). Telinfy advised creating the OTP as a **Utility** template, which Meta approves. Wording chosen (variable can't start/end the message): _"Your Visa Doo verification code is {{1}}. It is valid for 10 minutes. For your security, please do not share this code with anyone."_ **Next:** once approved, the owner sends the template name + language; we plug it in, switch verification on, test, and go live.
- **Visa prices:** the system is INR-only; the owner is re-entering the full set of visa prices in **Visa Types** (any visa without a price shows "Price on request").
- **Finance setup:** confirm GSTIN, home state, and GST rate in **Finance settings**; assign the **finance** role to the relevant staff member.
- **Email housekeeping:** revoke the old (pre-migration) Brevo account's keys — only after confirming nothing else uses them.
- **Status updates on WhatsApp:** currently sent on **both** email and WhatsApp; the owner may later choose WhatsApp-only.
- **Backend navigation:** decision recorded to keep **Messaging** as its own area (not folded into Settings), to grow with future messaging features.

---

## 16. Starter prompt for future Claude Code chats

Paste this into a fresh Claude Code session to bring it up to speed:

> "You are continuing the **Visa Doo** project. First read **`VISADOO_PRODUCT_REFERENCE_GUIDE.md`** for the full current picture, then `START_HERE_FOR_NEW_CLAUDE_CHAT.md`, `CLAUDE.md`, `FUTURE_MODULE_ROADMAP.md`, `SCALABLE_FINANCE_LEDGER_PLAN.md`, and the saved project memory. I'm the **non-technical owner** — explain everything in plain English, no jargon. Before building anything: confirm a clean git status, create a `before-<feature>` checkpoint, and tell me in plain English what files/tables you'll touch and why. Ask me any business questions one at a time (use clickable options where possible) and wait for my go. Follow all `CLAUDE.md` rules: no secrets in code or chat; keep Row-Level Security on; never let a user change their own role; confirm before anything outward-facing or destructive; one feature at a time with before/after checkpoints; self-verify (including on a phone-width screen) before deploying."

---

## Revision history

_This guide is kept current: it is updated whenever a major feature or new module is added._

- **02 Jul 2026** — **CRM (Phase 1) LIVE**: new **CRM** sidebar group containing **Enquiries** (moved here, now with **Convert to lead**), **Leads** (pipeline — stage New→Contacted→Qualified→Quoted→Converted/Lost, owner, next follow-up, expected ₹ value, activity trail, Add lead, Convert to application), and **Follow-ups** (due-today/overdue list). Access: Admin/Agent/Sales full, Viewer read-only. New append-only tables `leads` + `lead_activities`; Enquiries & Customers table access widened to the CRM roles so Sales can match/create the linked person. CRM actions are recorded in the Audit Centre.
- **01 Jul 2026** — Finance reports: added a **Supplier-wise detailed report** (row per supplier cost line, sample-style columns, CSV export) + an **Application status** filter; each cost line now has a **supplier invoice no.** field.
- **01 Jul 2026** — Audit Centre (Phase 2 wiring): more actions now recorded to the central log — application status changes, catalogue & pricing (visa types, destinations, groups, events), content & settings (articles, pages, FAQs, reviews, brand, email, site SEO), CSV exports, and marketing-consent changes.
- **01 Jul 2026** — Audit Centre (Phase 1) added: admin/owner-only backend screen unifying existing edit histories + Finance audit + Messaging into one filterable log, plus a new append-only central `audit_logs` table; staff role changes now recorded. (Future modules will log to the central table.)
- **01 Jul 2026** — Applications are now editable by admins (all applicant fields, mobile with country picker) with a field-by-field Edit history; status stays in its notifying control.
- **01 Jul 2026** — Customer records are now editable by admins (all fields, mobile with country picker) with a field-by-field **Edit history** (who/what/when). Also: WhatsApp sender now prefers the application's number, and failed messages have a Resend-with-guidance option.
- **30 Jun 2026** — Events module LIVE: public `/events` page (month timeline + category tabs) + dedicated per-event pages promoting each country's visas + "Events" menu link; backend Events manager under Catalogue. (events table; edge functions events.js + event.js.)
- **30 Jun 2026** — Messaging split into three screens (Automations · Message templates · Message history) under the Messaging group; message history gained filters (channel/status/type/date/search) + CSV export.
- **30 Jun 2026** — Birthday module **LIVE**: WhatsApp auto-greeting + 10% offer (code HAPPYBDAY10, 15 days) to opted-in customers, daily 9 AM IST. Template `birthday_offer` approved by Meta; tested and switched on.
- **30 Jun 2026** — Initial Product Reference Guide created. Reflects: finance module (cost lines, margin, GST, customer payments + numbered receipts, refunds, supplier ledgers, finance reports); automated email + WhatsApp notifications (status, application received, payment received, review request); backend console redesign (compact lists → detail pages for Applications, Customers, Suppliers); INR-only pricing; mobile-number field with country picker; mobile WhatsApp-OTP verification built but switched off pending the WhatsApp template.

---

_End of guide. For the latest feature-by-feature history, see `START_HERE_FOR_NEW_CLAUDE_CHAT.md`; for standing rules, see `CLAUDE.md`._
