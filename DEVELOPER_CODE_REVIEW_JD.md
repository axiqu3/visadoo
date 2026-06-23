# Developer Code-Review — Job Description (Visa Doo)

Use this to hire a developer to **review the existing Visa Doo codebase** before scaling up.
Two versions below: a **full job post** and a **short version** for quick job boards.
At the bottom: **tips for the (non-technical) owner** on how to evaluate and hire safely.

---

## FULL JOB POST

### Job Title
**Freelance Web Developer / Code Reviewer — Security & Quality Audit (Supabase + Netlify web app)**

### About the role
We're a visa-application web platform (live MVP, real users coming soon) and we want an
experienced developer to **review our existing codebase and backend setup** before we scale up.
This starts as a **paid review/audit engagement** (1–2 weeks, part-time), with the option to
continue into **ongoing development** if it's a good fit.

You will **not** be starting from scratch — the app is built and working. Your first job is to
read it, stress-test it, and tell us in clear writing what's solid, what's risky, and what to
fix before growth.

### Our tech stack (please only apply if you're comfortable with most of this)
- **Frontend:** plain **HTML, CSS, and vanilla JavaScript** — *no* React/Vue/Angular and *no*
  build step. You must be comfortable reading and maintaining hand-written JS, not just frameworks.
- **Backend / database:** **Supabase** (PostgreSQL, Auth, Row Level Security, Storage, and
  Edge Functions written in TypeScript/Deno).
- **Hosting:** **Netlify** (static hosting + Netlify Edge Functions in Deno; manual deploys).
- **Email:** **Brevo** (transactional API + SMTP).
- **Version control:** **Git / GitHub** (private repo).

### What you'll do (scope of the review)
1. **Security audit** — check for exposed API keys, passwords, tokens, or secrets in the code and
   Git history; confirm secrets are stored as environment variables, not hardcoded.
2. **Supabase Row Level Security (RLS) review** — verify each customer can only ever see their own
   data, and that staff/admin access is correctly restricted.
3. **Authentication & roles** — review sign-in, user roles (customer/admin/agent), and permissions.
4. **Database & file-upload safety** — review access rules and the security of uploaded documents
   (passports, photos).
5. **Code quality & scalability** — flag fragile areas, duplication, and anything that will cause
   problems as traffic grows.
6. **Deployment & config review** — Netlify settings, environment variables, email-sending security.
7. **Deliverable:** a **written report in plain English**, with findings grouped into
   **Critical / Important / Optional**, each with a recommended fix and rough effort estimate.

### Must-have skills
- Solid experience with **Supabase (especially Row Level Security and Edge Functions)**.
- Strong **JavaScript** fundamentals and ability to read non-framework code.
- Practical **web security** experience (secrets management, auth, access control, OWASP basics).
- Comfortable with **Git/GitHub** and reviewing commit history.
- Clear written communication for a **non-technical owner** (this matters as much as the coding).

### Nice to have
- Netlify (or similar) and Deno experience.
- Experience taking an MVP to a production, multi-user product.
- Familiarity with email deliverability (SPF/DKIM, Brevo or similar).

### How to apply
Please share:
1. A short note on your Supabase + security experience.
2. One example where you found and fixed a real security or data-access issue.
3. Your availability and your rate for a fixed-scope review.

---

## SHORT VERSION (for a quick job-board post)

**Freelance Dev — Code & Security Review (Supabase + Netlify)**

Live MVP web app (visa applications) needs an experienced developer to **review the existing code
and backend before we scale**. Paid 1–2 week audit, remote, possible ongoing work after.

Stack: **vanilla HTML/CSS/JS (no framework), Supabase (Postgres, Auth, Row Level Security, Edge
Functions/Deno), Netlify, Brevo email, GitHub.**

You'll review: exposed secrets, Supabase Row Level Security, auth & user roles, database access
rules, file-upload security, and overall code quality/scalability — and deliver a plain-English
report with issues ranked Critical / Important / Optional.

Must have: real **Supabase + web-security** experience, strong **JavaScript**, clear written
communication. To apply, share your Supabase/security experience, one real issue you fixed, your
availability and rate.

---

## TIPS FOR THE OWNER (non-technical)

### Screening questions (good answers are specific; vague = red flag)
- *"How would you check whether a customer can accidentally see another customer's data in
  Supabase?"* → should mention **testing Row Level Security policies**.
- *"How do you check if a secret key was ever committed to a Git repository?"* → should mention
  **scanning the full Git history**, not just current files.
- *"Where should API keys and passwords live in this kind of app?"* → **environment variables /
  secrets**, never in the code.

### Protect yourself when hiring
- Give **read-only** access to the GitHub repo first (add them as a read-only collaborator). They
  don't need write access just to review.
- **Never** share your Supabase service-role key, Brevo keys, or dashboard passwords with a
  candidate. A reviewer can audit with read access and a screen-share; full credentials come only
  if/when you formally engage them.
- Consider a **small paid trial** (e.g., "review our login security and write up what you find")
  before a larger contract — it tells you more than any interview.
- Keep the GitHub repo **private** and the Supabase/Netlify dashboards under **your** account; add
  the developer with limited access rather than handing over logins.
