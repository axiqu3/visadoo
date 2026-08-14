# Visa Doo — Future Module Roadmap (founder-friendly)

_Last reviewed: 2026-06-23. Priority set by CEO: **automate customer communication** (email + WhatsApp together). Payments not soon. Team: small (2–5)._

This is a living plan. It is **not** a build order to rush — it's the safe sequence so we never build something whose foundation isn't ready.

---

## The big idea
Your #1 goal is **automated customer communication**. Almost every feature you listed (WhatsApp, review requests, birthdays, campaigns, communication history) sits on top of **three shared foundations**. Build those once, and the rest become fast and safe to add.

**The 3 foundations (build first):**
1. **Customer record** — one profile per person (links their applications, enquiries, history). Today this is scattered.
2. **Consent** — opt-in/opt-out per channel (email/WhatsApp). Required by law before marketing/birthday/review messages.
3. **Notification & Automation Engine** — the shared "post office": templates, scheduled + triggered + manual messages, delivery logs, retries, and consent checks. Built for email **and** WhatsApp from day one.

---

## Phases

### Phase 1 — Foundations + 1 quick win + start WhatsApp paperwork
| Item | Why now |
|---|---|
| **Customer record** (unify customers; link applications/enquiries) | Backbone for everything in your priority. |
| **Consent capture** (opt-in/opt-out, per channel) | Legal must-have *before* any marketing message. |
| **Notification & Automation Engine** (email working; WhatsApp-ready) | The shared spine. Everything else plugs in. |
| **Visa ETA / processing-time estimate** (Feature 1) — *quick win* | Tiny, standalone, no risk; boosts trust & conversion while the engine is built. |
| **(RESOLVED 2026-06-25) WhatsApp via Telinfy (Meta BSP)** | No separate Meta verification needed — WABA already live via Telinfy; we use their API key. WhatsApp is now UNBLOCKED. |

### Phase 2 — Switch on the automations (the payoff) + light operations
| Item | Why here |
|---|---|
| **WhatsApp integration** (Feature 5) via **Telinfy** | Plugs into the engine using Telinfy's API key + pre-approved templates. No Meta-verification wait. |
| **Review-request automation** (Feature 6) | First high-value automation: post-approval, delay, no duplicates, Google link. |
| **Birthday module** (Feature 7) | Uses DOB **with consent**; plugs into engine. |
| **Communication history** (Feature 12) | Reads from the engine's logs — per customer/application. |
| **Staff assignment + follow-ups + simple pipeline/notes** (Features 9, 11) | You're a 2–5 team — keeps work from slipping. |
| **CRM views** (Feature 2) | Ties profile + history + notes + assignment together. |

### Phase 3 — Growth, reporting, advanced
| Item | Why later |
|---|---|
| **Major Events module** (Feature 8) | Lead-gen; standalone, but lower priority than comms. |
| **Reports & analytics** (Feature 3) | Needs accumulated data; revenue reports need payments (deferred). |
| **Advanced workflows / escalations** (Feature 9 adv.) | Matters more as the team grows past ~5. |
| **Enhanced CSV/Excel export** (Feature 10) | Extend today's safe export with more controls. |
| **Online payments + revenue analytics** | Only when you decide to collect payments online. |

---

## Quick answers to the key questions
- **Quick wins:** Visa ETA (Feature 1) — do it first, this week. (Basic customer CSV export already exists.)
- **Depends on other features:** WhatsApp, Reviews, Birthdays, Campaigns, Communication history → all depend on the **Notification Engine**. CRM, follow-ups, birthdays, assignment → depend on the **Customer record**. All marketing messages → depend on **Consent**.
- **Privacy/security risk (handle carefully):** WhatsApp (API secrets, approved templates), Birthdays (uses DOB + consent), Reviews/Campaigns (consent + opt-out), CSV export (PII), Communication history (PII). Rule: secrets stay server-side only; never message without consent; always honour opt-out.
- **Do NOT build yet:** Revenue/payment analytics (no payments yet); advanced escalations (premature for a small team). _(WhatsApp is no longer blocked — it goes live via **Telinfy** (Meta BSP) using their API key + approved templates; see memory `visadoo-whatsapp-telinfy`.)_
- **Build next:** the **Phase-1 foundation** (Customer record + Consent + Notification Engine), with **Visa ETA shipped first** as the quick win while the foundation is designed.

---

## Finance & Ledger track (planned 2026-06-25 — see `SCALABLE_FINANCE_LEDGER_PLAN.md`)
A separate, scalable finance module. **Planning done; not built.** CEO decisions: base currency **INR**; **numbered receipts** in MVP; **GST flexible per application** (pure-agent vs full; CGST/SGST/IGST by customer state — confirm with CA); **simple refund entries** (no credit notes yet). Staff roles to add: **finance**, **sales** (Operations = `agent`; Owner/Admin = `admin`). Customers/Operations/Sales never see supplier cost or margin; every financial change is audit-logged; posted ledger entries are not silently editable; payment proofs/receipts stay private; **no online payment gateway / no gateway secrets** yet.

| Finance phase | Scope |
|---|---|
| **F1 (MVP)** | Application-wise billing (govt fee + service charge + flexible GST) · customer part-payments/refunds + **numbered receipts** + proof upload · **supplier master** + supplier cost + supplier payments · first reports (pending customer/supplier payments, app/supplier/visa-type margin) · audit log · finance/sales roles. New tables: finance_settings, suppliers, application_finance, customer_payments, supplier_payments, finance_audit_log. |
| **F2** | Supplier **ledger & statement of account** (opening balance, running balance, aging); posted entries read-only, corrections via reversing entries. |
| **F3** | **B2B client ledger** (client master, credit terms/limit, bulk invoices, receipts, receivables, aging, statement). New: b2b_clients, client_invoices, client_payments, credit_notes. |
| **F4** | **Online payment gateway** + advanced finance reports/exports (branded PDF/Excel). Replaces the old "Online payments + revenue analytics" line below. |

---

## Architecture & setup verdict
- **Netlify + Supabase + Brevo is enough for this next stage.** No stack change needed.
- **Foundations to add before major comms modules** (additive — nothing is broken): a `customers` table, a `consent` record, a `messages`/communication-log table, message templates, and a scheduler (Supabase scheduled jobs) for delayed/birthday/review messages. Minor: a "staff assigned" field on applications.
- **Plan upgrades (not now, just budget for them):** Supabase Free→Pro and Brevo Free→paid as message/volume grows; a WhatsApp provider has its own per-message cost.

## Working method going forward
- **One module per fresh Claude Code chat** (this chat is large). Each new chat re-reads the saved memory + this roadmap + CLAUDE.md, so context carries over.
- **Checkpoint before & after each feature** (Git tags), and you **push via GitHub Desktop**.
- Keep this file updated as priorities shift.
