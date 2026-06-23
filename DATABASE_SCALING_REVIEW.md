# Database Scaling Review (plain English)

_Reviewed 2026-06-23. Verdict: current design is healthy and scales. The coming modules need a few NEW tables — not changes to existing ones._

## Current health
- 15 tables, all with Row-Level Security ON. Customer data is isolated; staff access is role-based.
- Sizes are tiny today (a handful of applications/enquiries). Plenty of headroom.

## New tables/fields the communication + CRM modules will need (later, when we build them)
> These are **additions**. We will not modify or risk existing tables; each gets its own security rules.

- **`customers`** — one row per person (name, email, phone, DOB, lead source, assigned staff, status). Applications & enquiries link to it.
- **`consent`** — per customer + channel (email/WhatsApp): opted-in? opted-out? when? Used as a gate before any message.
- **`messages`** (communication log) — every email/WhatsApp/note: channel, template, status (queued/sent/delivered/failed), retries, timestamps. Powers "communication history".
- **`message_templates`** — reusable email/WhatsApp templates.
- **`automation_rules`** — what triggers a message (e.g. "visa approved → wait 3 days → review request") and schedules.
- **`events`** — major events (FIFA, expos) for the future Events module.
- **Fields to add later:** visa processing-time/ETA fields on `visa_types`; `assigned_to` on `applications`.

## Practical notes
- **Indexes & keys:** add as each table is built (e.g. index messages by customer + date). Not needed yet.
- **Backups:** Supabase keeps automatic backups on paid tiers — worth enabling before real volume.
- **Plan tiers:** Supabase Free is fine now; move to Pro before heavy use (more storage, backups, no pausing). Brevo Free works now; paid tier as email volume grows.
- **No data migration risk now:** when we introduce `customers`, we'll backfill it from existing applications/enquiries safely, keeping old data intact.
