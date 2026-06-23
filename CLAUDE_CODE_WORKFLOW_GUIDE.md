# Claude Code Workflow Guide (for the CEO)

_How we build safely from here on. Plain English._

## The rhythm for every new feature
1. **Fresh chat per module.** Start a **new Claude Code chat** for each major feature. This chat carries context automatically through the saved memory + the roadmap/CLAUDE.md files — so a fresh chat still "knows" the project. (Tiny tweaks can continue in an existing chat.)
2. **Checkpoint before.** I create a Git checkpoint (e.g. `before-<feature>`).
3. **Build one feature at a time**, test it (including on phone width), and show you proof.
4. **Checkpoint after** (`after-<feature>`).
5. **You back it up:** open **GitHub Desktop → Push origin**.

## What you do vs what I do
- **You:** approve direction, make business decisions, paste secrets **only into dashboards** (never into chat), do dashboard steps I guide you through, and click **Push origin** to back up.
- **I:** design, build, test, deploy, and keep the docs/memory updated. I never put secrets in code, chat, or GitHub.

## Golden rules (don't break these)
- **Secrets** (API keys, passwords, WhatsApp/Brevo keys) live **only** in Supabase/Netlify dashboard secrets — never in code, the app screen, GitHub, or chat.
- **Consent before messaging:** never send marketing/WhatsApp/birthday messages without recorded opt-in; always honour opt-out.
- **One change at a time**, always with a before/after checkpoint, so we can roll back instantly.
- **Private repo** stays private; document files and sensitive data are never exposed publicly.

## The documents and what they're for
- **CLAUDE.md** — the standing rules every chat must follow (secrets, email, security, deployment). Update when a new rule is agreed.
- **FUTURE_MODULE_ROADMAP.md** — the living plan (phases, priorities, next action).
- **PRODUCT_ARCHITECTURE_AUDIT.md / DATABASE_SCALING_REVIEW.md** — the "is the foundation strong?" references; update only when the architecture/data design changes.
- **This guide** — how we work together.

## Starting the next module (copy-paste into a fresh chat)
> "Read the project memory, CLAUDE.md, and FUTURE_MODULE_ROADMAP.md. We're starting Phase 1: the customer record + consent + notification engine foundation. Don't build yet — confirm the plan and checkpoints first."
