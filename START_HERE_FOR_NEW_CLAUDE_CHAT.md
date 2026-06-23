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
Visa catalogue (countries, groups, visa types; **multi-currency** chosen in backend with a per-visa price per currency; **visa ETA / expected processing time** estimate). Customer **apply form** (passport-issuing-country + India-state searchable dropdowns via country-state-city CDN, document upload, custom per-visa questions) and **6-stage tracker**. **Magic-link sign-in** (+Google option). **RBAC** roles (customer/admin/agent/content/viewer). **Admin console:** Applications (search/filter/sort), **Enquiries** log (ENQ-000001 series), **Customers** (deduped, CSV export, text-only), Destinations, Visa Types, Articles, Content (pages/FAQ/reviews), Site SEO, Brand & Settings, **Email**, Team. Homepage (destinations search, reviews, FAQ, "Effortless Visa Solutions" tagline + welcome). **Contact form** → saves an enquiry + emails via Brevo. **Status-update emails** (Approved / Visa Issued / Action Needed) via Brevo.

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
