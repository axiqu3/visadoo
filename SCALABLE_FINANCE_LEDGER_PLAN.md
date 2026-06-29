# Visa Doo — Scalable Finance & Ledger Plan (planning only)

_Created 2026-06-25. **Planning document only — no code, database, or security changes were made.** Checkpoint `before-scalable-finance-ledger-planning` taken first. The owner is non-technical; this is written in plain English. I am not an accountant — all GST/tax specifics must be confirmed with Visa Doo's CA before the build._

---

## 0. CEO decisions captured (this session)
1. **Currency:** single **base currency = INR** for the MVP. (App today uses AED via `site_settings.active_currency`; switching the displayed currency AED→INR is a small separate task. Finance will use INR as its base, and every amount will still carry a `currency` field so multi-currency is a future switch with no data migration.)
2. **Receipts:** **generate numbered receipts now** — using a lightweight, branded, sequentially-numbered printable receipt (same simple approach as the ENQ enquiry numbers), not a heavy PDF engine.
3. **GST:** **flexible per application** — each application can treat the government/embassy fee as pass-through (GST only on Visa Doo's service charge, "pure-agent") OR apply GST to the full amount. The CGST/SGST-vs-IGST split is driven by the customer's state (already captured on `applications.state`) vs Visa Doo's home state. **Confirm the exact treatment, rate(s), and pure-agent eligibility with your CA.**
4. **Refunds:** simple **refund entries + remarks** (a negative/refund payment line against the application), fully audit-logged. No formal credit notes in MVP.

---

## 0b. 🔒 LOCKED REVISED MODEL (brainstorm, 2026-06-29) — SUPERSEDES the cost/margin details below
_This is the agreed working model after a brainstorming session. Where it conflicts with older sections (esp. the single "government fee + service charge" billing), **this section wins.** Built F1a stays; F1b/F1c get revised to match (see "Rebuild steps")._

**Per application — a basket of internal COST LINES (multiple suppliers allowed):**
- Each application holds a **list of cost lines**; each line = **category** · **supplier (optional)** · **cost (₹)**.
- Categories (fixed list + free-text on "Other"): **Visa processing, Insurance, Express delivery, Voucher, Other**.
- Cost lines are **internal only** — the customer never sees them, the suppliers, or the margin.
- The **embassy is just another supplier** (no special embassy field). Multiple suppliers per application = multiple cost lines.
- Cost lines are added by **staff during processing** (not the customer at apply-time). One applicant per application (multi-traveller out of scope for now).

**Pricing:**
- **Total cost** = sum of all cost lines.
- **Margin** = entered as a **₹ amount OR a %** (whichever staff type; the other is calculated).
- **Customer Selling Price** = total cost + margin.
- **GST** = flexible per application (**on margin / on full selling price / none**), **added on top**. CGST/SGST (intra-state) vs IGST (inter-state) by `applications.state` vs finance home state.
- **Customer Total (what they pay)** = selling price + GST. **Customer sees ONE price (+GST)** — receipt shows a single "Visa service charges" line + GST + Total (no internal breakdown). _(Receipt single-line is the working default; confirm if you want a govt-fee line.)_

**Supplier side — proper LEDGER (running balance):**
- Every cost line is a **payable** to its supplier. Supplier payments (lump-sum or against an invoice) **reduce the balance**.
- A **per-supplier Statement of Account** shows total outstanding across **all** applications = opening balance + Σ payables − Σ payments. **No per-line paid/unpaid flags** (ledger nets it).

**Customer payments:**
- Part-payments + numbered receipts + proof upload + auto status (unpaid/partial/paid/refunded) — as built in F1c, but against the new single selling price.

**Customer REFUNDS — request → finance approves workflow:**
- Any case-handling staff (Operations/Sales/Finance) can **raise a refund request** with a **reason** → status **Pending**.
- **Finance** reviews, enters the **refund payment details** (method + destination/reference), and **approves** (or **rejects** with a reason).
- **Only an APPROVED refund** affects the customer's balance/receipt/numbers; a pending request changes nothing.
- Finance gets a **pending-refunds queue/badge**; every step audit-logged (requested_by, approved_by, reason, timestamps).

**Permissions (refined):** Finance/Admin = full finance (cost lines, margin, supplier ledger, supplier payments, approve refunds, see margin). Operations/Sales = view application + **raise refund requests only**; never see cost/supplier cost/margin. Owner/Admin = delete/override.

**Deferred (not now):** customer discounts/waivers (raised, not adopted — add later if needed); per-applicant/group cost scaling; credit notes; online payments.

**Rebuild steps (revising what's built):**
- **F1a** (roles, suppliers master, finance_settings, audit log) — **keep as-is.**
- **F1b-rev** — add `application_cost_lines` table (category, supplier_id, cost); revise the Finance panel to manage **multiple cost lines** + **margin (₹ or %)** → selling + GST → customer total. (Old single government_fee/service_charge/supplier_id/supplier_cost on `application_finance` superseded; tables are empty so safe to migrate.)
- **F1c-rev** — refunds become a **request→approve** workflow (status + requested_by/approved_by/reason/refund-payment-details; recompute counts only approved refunds); add a finance pending-refunds view. Part-payments/receipts carry over.
- **F1d** — supplier payments + **per-supplier ledger / Statement of Account** (running balance from cost-line payables − payments). _(This pulls the old "F2 supplier ledger" forward, since cost lines already are the payables.)_
- **F1e** — reports: pending customer payments, supplier outstanding (per supplier), application/supplier/visa-type margin; CSV.

---

## 1. Guiding principles
- **Don't overbuild.** A practical MVP that grows into a ledger system — not a full accounting suite.
- **Separation of concerns (mandatory):** application/operational status, customer-payment status, supplier-payment status, and ledger status are **separate** and never overload each other (especially never overload `applications.status`).
- **Privacy:** customers must **never** see supplier cost, supplier name, supplier payments, or profit/margin. Operations/Sales staff must **not** see profit/margin.
- **Auditability:** every financial change is recorded (who, when, old → new, remarks). Posted ledger entries are **not silently editable** — corrections are reversing entries.
- **Additive & safe:** all new finance tables are brand-new with their own Row-Level Security; nothing existing is modified or put at risk. (A couple of tiny additive, nullable columns on `applications` are the only touch to an existing table — planned, not done.)
- **Build over the existing stack:** Supabase (Postgres + RLS + private storage) + the static app + edge functions. No new platform needed.

---

## 2. Answers to your 11 questions

**Q1. Should B2C walk-in customers remain application-wise only?**
**Yes.** Most customers are one-off walk-ins; a full customer ledger is unnecessary overhead. Track money **per application**: amount requested, part-payments/paid/unpaid, payment method, proof upload, receipt, and a payment history. The customer record we already built links a person's applications together, so you still get a per-person view without running a ledger for each.

**Q2. Should the supplier ledger be built from the beginning?**
**Capture supplier data from the beginning; present the formal ledger slightly later.** Build the **supplier master profile + per-application supplier cost + supplier payments + opening balance** in **Phase 1** (so payables are tracked from day one). The **formal Statement of Account / running ledger view + aging** is **Phase 2** — but it's just a *report computed over the Phase-1 data plus the opening balance*, so nothing is wasted. This honours "supplier ledger is important from the beginning" without overbuilding the presentation up front.

**Q3. Should the B2B client ledger be planned now but built later?**
**Yes.** Design the schema now so it's ready (an optional `client_id` concept; statements computed the same way as suppliers), but **build it in Phase 3**, when you actually take on agency clients. No B2B UI in the MVP.

**Q4. MVP finance build order (within Phase 1):**
1. Finance **settings** (GST config, home state, receipt prefix/number) + the new **roles** (Finance, Sales) and permissions.
2. **Supplier master** (create/edit suppliers) + **audit log** table.
3. **Application finance panel**: customer amount (government fee + service charge + GST flexible), supplier assignment + supplier cost, computed customer total & margin.
4. **Customer payments**: record part-payments/refunds + upload proof + **generate numbered receipt** + payment status.
5. **Supplier payments**: record payments to suppliers + upload supplier receipt + supplier payment status.
6. **First reports**: pending customer payments, pending supplier payments, application/supplier/visa-type margin (finance-only), with CSV export.

**Q5. Database tables required NOW (Phase 1):**
- `finance_settings` — singleton: base currency (INR), home state (for CGST/SGST vs IGST), default GST rate, GST mode default, GSTIN, receipt number prefix.
- `suppliers` — supplier master (see §4).
- `application_finance` — one row per application: the billing summary (fees, GST, supplier cost, statuses, margin inputs).
- `customer_payments` — payment/refund history per application (+ receipt number + proof file).
- `supplier_payments` — payments made to suppliers (+ supplier receipt file).
- `finance_audit_log` — append-only record of every financial change.
- Plus: a **receipt-number sequence** (DB identity, like the ENQ series) and a small **role-enum extension** (add `finance`, `sales`).
- Plus (additive, nullable, on the existing `applications` table): `supplier_id` (which supplier is processing — operational) and optionally `client_id` (null for B2C; for future B2B).

**Q6. Database tables planned for LATER:**
- `b2b_clients` — client master (Phase 3).
- `client_invoices` + `client_payments` (receipts) — B2B billing (Phase 3).
- `credit_notes` — formal tax-correct credit notes (Phase 3/B2B).
- `ledger_entries` — *optional* generic double-entry table, **only if** computed statements prove insufficient (Phase 2/3). Default plan is **computed statements** (opening balance + source records), which is simpler and scales fine at your volume.
- `payment_gateway_*` / reconciliation tables — Phase 4 (online payments).

**Q7. Screens to build first (Phase 1):**
- A new **"Finance" group in the left sidebar** (Suppliers, Payments/Receipts, Reports) — visible only to Owner/Admin/Finance.
- An **Application Finance panel** on the existing application view (Operations sees supplier *assignment* only; Finance sees the full money view).
- **Suppliers** list + add/edit.
- **Customer payment** capture + **receipt** view (printable).
- **Supplier payment** capture.

**Q8. Reports to build first (Phase 1):**
1. **Pending customer payments** (who owes what).
2. **Pending supplier payments** (what we owe suppliers).
3. **Application-wise profit/margin** (Finance/Admin/Owner only).
4. **Supplier-wise summary** (totals billed/paid/outstanding + margin).
5. **Visa-type-wise margin** (which visa types are most profitable).
- All with **CSV export** (text-only, finance-role only). Branded Excel/PDF later.

**Q9. Rights/permissions per staff category — see the matrix in §6.**

**Q10. Audit logs required — see §7.** Every financial create/edit/delete/override/refund: user, role, timestamp, entity, field, old value, new value, remarks.

**Q11. What to AVOID now (prevent overcomplication):**
- ❌ Online payment gateway and any gateway secrets.
- ❌ Full double-entry accounting / chart of accounts / journal.
- ❌ Multi-currency with live FX (keep INR base; just store the currency field).
- ❌ Formal credit notes / automated tax reversal (simple refund lines only).
- ❌ Automated bank reconciliation / bank feeds.
- ❌ B2B client ledger build (plan only).
- ❌ Heavy PDF/invoice-template engine, HSN/SAC catalogs, GST return filing.
- ❌ Overloading `applications.status` with payment states — keep finance statuses separate.

---

## 3. MVP finance architecture (Phase 1) — recommended

**One finance row per application** (`application_finance`) holds the billing picture; **payment history** lives in separate line-item tables so part-payments, refunds, and multiple supplier payments are all supported. **Statements are computed** from these source records + opening balances rather than a heavy ledger engine.

```
applications ──1:1── application_finance ──*── customer_payments  (+ receipt no, proof file)
                         │
                         └── supplier_id ──> suppliers ──*── supplier_payments (+ receipt file)
finance_settings (singleton)        finance_audit_log (append-only, every change)
```

**How an amount is built (GST-flexible):**
- `government_fee` (pass-through) + `service_charge` (Visa Doo's fee) = taxable/parts.
- `gst_mode` per application: `none` | `service_only` (GST on service charge only — pure agent) | `full` (GST on the whole amount).
- `gst_rate` (e.g. 18). CGST+SGST if customer's state = home state, else IGST (driven by `applications.state`).
- `customer_total` = government_fee + service_charge + gst_amount (computed; **snapshotted onto the receipt** when issued so the receipt is an immutable record).
- **Margin** (Finance-only, computed) = (government_fee + service_charge) − supplier_cost. GST is excluded (it's remitted to government, not income).

**Payment statuses (separate fields, derived from the payment lines):**
- `customer_payment_status`: unpaid / partial / paid / refunded.
- `supplier_payment_status`: unpaid / partial / paid.
- These are **independent** of `applications.status` (operational) and of any future ledger status.

---

## 4. Future scalable ledger architecture (Phases 2–3)

- **Supplier Statement of Account (Phase 2):** computed running balance = `opening_balance` + Σ supplier costs (payables, as applications are assigned) − Σ supplier_payments. Add date-range statement view + **aging buckets** (0–30 / 31–60 / 61–90 / 90+). Posted entries become read-only; corrections are reversing entries (no silent edits).
- **B2B Client Ledger (Phase 3):** `b2b_clients` master (credit terms, credit limit, opening balance). Applications for a client carry `client_id`. Generate **numbered invoices** (bulk billing of multiple applications), record **client_payments/receipts**, compute **client statement + outstanding receivables + aging**, enforce **credit limit** warnings.
- **Optional `ledger_entries` (only if needed):** a generic table (`party_type`, `party_id`, `date`, `debit`, `credit`, `ref`, `memo`) for true double-entry. Recommended **only** if computed statements become limiting — not now.
- **Phase 4:** online payment gateway (secrets server-side only), automated payment capture, and advanced finance dashboards/exports (branded PDF/Excel, P&L-style summaries).

---

## 5. Build phases (summary)

| Phase | Scope | Key tables |
|---|---|---|
| **Phase 1 (MVP)** | Application-wise billing (GST-flexible) + customer payments & **numbered receipts** + refunds + **supplier master** + supplier cost + supplier payments + first reports + audit log + Finance/Sales roles | finance_settings, suppliers, application_finance, customer_payments, supplier_payments, finance_audit_log |
| **Phase 2** | **Supplier ledger & Statement of Account** (opening balances, running balance, aging), read-only posting + reversing corrections | (reuses Phase-1 data; maybe ledger_entries) |
| **Phase 3** | **B2B client ledger & client Statement of Account** (client master, invoices, receipts, receivables, credit limit, aging) | b2b_clients, client_invoices, client_payments, credit_notes |
| **Phase 4** | **Online payment gateway** + advanced finance reports/exports | payment_gateway_*, reconciliation |

---

## 6. Permissions matrix (recommended)

**Role mapping onto the existing system** (today: customer/admin/agent/content/viewer):
- **Super Admin / Owner** → `admin` (the CEO's account; the very top — only one allowed to delete/override). _(Optionally add an `is_owner` flag later to separate Owner from Admin.)_
- **Admin** → `admin`.
- **Finance Staff** → **new role `finance`**.
- **Operations Staff** → existing `agent`.
- **Sales / Customer Support** → **new role `sales`**.
- (`content`, `viewer`, `customer` unchanged.)

| Capability | Owner | Admin | Finance | Operations (agent) | Sales/Support |
|---|:--:|:--:|:--:|:--:|:--:|
| View **customer** payment status | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create payment request / set customer amount | ✅ | ✅ | ✅ | ➖ | ✅ |
| Mark **customer** payment as paid (+ receipt) | ✅ | ✅ | ✅ | ➖ | ➖¹ |
| Edit customer amount (after set) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Assign **which** supplier (operational) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Add **supplier cost** (the money) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Mark **supplier** payment as paid | ✅ | ✅ | ✅ | ❌ | ❌ |
| View supplier ledger | ✅ | ✅ | ✅ | ❌ | ❌ |
| View **profit/margin** | ✅ | ✅ | ✅ | ❌ | ❌ |
| Export finance reports | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create/edit supplier | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create/edit B2B client (Phase 3) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Override paid records | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete/cancel financial records | ✅ | ➖² | ❌ | ❌ | ❌ |

¹ Sales can **record a payment as pending / upload proof**; Finance/Admin confirm it as paid (keeps cash control). Configurable if you want Sales to mark paid directly.
² Recommend **Owner-only** hard delete. Admin can **void/cancel with a reason** (a reversing entry), never a silent delete.
➖ = not by default, can be enabled.

**Key privacy enforcement:** Operations/Sales never see supplier **cost** or **margin** — achieved by keeping the money in finance-only tables/views (Operations only sets *which* supplier, never the cost). Customers see only **their own** amount + paid status (optional, on their tracker) — never supplier/cost/margin.

---

## 7. Audit logging (required)

`finance_audit_log` (append-only; readable by Owner/Admin/Finance; **no update/delete**):
- `entity_type` (application_finance | customer_payment | supplier | supplier_payment | finance_settings | b2b_client…), `entity_id`
- `action` (create | update | delete | void | refund | override | status_change)
- `field`, `old_value`, `new_value` (for edits)
- `actor` (user id) + `actor_role`, `created_at` (timestamp), `remarks`

**What must be logged:** setting/editing customer amount; creating/editing/voiding a payment; issuing/refunding a receipt; assigning supplier; adding/editing supplier cost; recording/voiding supplier payments; any override; any delete/cancel; opening-balance changes. Posted supplier-ledger entries are immutable — corrections via reversing entries (also logged).

---

## 8. Security & storage rules (carried into the build)
- Every new finance table gets **RLS ON** from creation; finance tables are **staff-role-gated** (Owner/Admin/Finance; Operations limited to supplier *assignment*).
- **Payment proofs and supplier receipts** are stored in the existing **private** `visa-documents` bucket (or a dedicated private `finance-files` bucket), readable only by finance roles + the owning customer for their **own** proof. Never public.
- **No online payment gateway and no gateway secrets** in this work. No secrets in code/DB/chat.
- Finance is **independent** of WhatsApp, the notification engine, birthdays, reviews, events, and analytics — none are touched.
- After the eventual build, run the Supabase **security advisor** and resolve any new ERROR-level lints.

---

## 9. What this plan deliberately does NOT do
No code, no migrations, no RLS, no edge functions, no storage changes, no deploy were performed. This document + a roadmap note are the only outputs. Implementation begins only after the CEO approves, one phase at a time, each with before/after checkpoints.
