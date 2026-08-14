# Visa Doo — Project Rules & Guardrails

Visa Doo is a global tourist/business visa application platform. Static site (HTML/CSS/JS) + Supabase (database, auth, storage) + Netlify (hosting + edge functions). The owner is non-technical — explain in plain English, no jargon.

These rules are mandatory. They exist to keep customer data and credentials safe as the app goes to real users.

## Secrets & credentials — NEVER in code or Git
- **Never** hardcode API keys, SMTP passwords, service-role keys, or tokens in any file (`.js`, `.html`, `.toml`, `.json`).
- The **only** key allowed in client files is the Supabase **publishable/anon** key (it is public by design and protected by Row Level Security).
- The Supabase **service-role key** must only ever live in Supabase Edge Function secrets (server-side env) — never in the repo, browser, or chat.
- Never ask the user to paste a secret into chat. Direct them to paste it into the relevant **dashboard** (Supabase / Netlify / Brevo) themselves.
- Keep `.gitignore` excluding `.env`, `.env.*`, `.claude/`, `.netlify/`, `node_modules/`. Never commit those.
- Before any commit that touches config, scan for secrets. Before claiming "no secrets committed," scan the **full git history**, not just current files.

## Email (Brevo)
- Email sends via **Brevo**. Two channels: (1) **sign-in emails** via Supabase Auth SMTP settings; (2) **status-update emails** via the `send-status-email` edge function.
- The Brevo **API key** belongs in a **Supabase Edge Function secret** (e.g. `BREVO_API_KEY`) — not in the database, not in any app screen, not in the repo. (Migrating the existing DB-stored key to this is a known task.)
- Sender address should be a **verified visadoo.com** address with **domain authentication (SPF/DKIM)** set up in Brevo, or emails will hit spam.
- When rotating Brevo accounts/keys: switch to the new key, test, then **disable the old key**.

## Database & access (Supabase)
- Row Level Security must stay **ON** for every table in the `public` schema. Never create a table without an RLS policy.
- Customers may only read/write **their own** rows (matched on `auth.uid()`); staff access is gated by `has_role(...)` / `is_admin()`.
- **Never** allow users to update their own `role` column. Role changes go only through the admin-guarded `set_user_role` function. The `profiles` UPDATE grant must stay column-limited (no `role`).
- The `email_settings` table is **admin-only**.
- Keep the `visa-documents` storage bucket **private**; only `public-media` (logos/images) is public.
- After schema/policy changes, run the Supabase **security advisor** and resolve new ERROR-level lints.

## Deployment (Netlify)
- Live site: `visadoo-uae.netlify.app` (Netlify site id `d7241432-c022-4073-9778-f268f483d427`). Deploys are **manual** via the Netlify MCP `deploy-site` proxy token + `npx @netlify/mcp`. Always pass the FULL proxy token.
- Any runtime config that must not be public goes in **Netlify environment variables** (or Supabase secrets for edge functions) — never hardcoded.
- GitHub repo `visadoo/visadoo` must stay **Private**.

## Working method (for a non-technical owner)
- One feature at a time. Save a Git checkpoint before and after each change; the owner pushes via GitHub Desktop ("Push origin").
- Self-verify changes in preview (including mobile width) before deploying. Don't ask the owner to test manually when you can verify.
- Do not generate or paste large hardcoded data lists (country/state/etc.) into source files — load such data from a package/CDN instead.
- For destructive or outward-facing actions (dropping columns, rotating keys, going live), confirm with the owner first.
