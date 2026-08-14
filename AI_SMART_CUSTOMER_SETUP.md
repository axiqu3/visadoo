# VisaDoo Smart Customer Reuse + AI Assistant

Implemented in this build:

- Returning logged-in customers can reuse details from their own previous visa applications in Step 3 with **Auto-fill**.
- Admin sidebar includes **AI Visa Assistant** under Customers.
- Admin can search existing customers, add multiple travellers/family members, ask for saved details or missing fields, and generate a Japan visa working-copy form.
- The original sample Japan application PDF is included at `assets/form-templates/japan-visa-reference.pdf`.
- AI chat uses the existing `/.netlify/functions/ai-chat` endpoint. If `GEMINI_API_KEY` or `OPENAI_API_KEY` is configured, selected customer context can be used for a natural-language answer. Without an AI key, deterministic fallback answers still work for core commands.
- Print / Save PDF is available from the generated working copy.

## Optional Supabase migration

Run `supabase/migrations/20260811_smart_customer_ai.sql` in the Supabase SQL Editor to add persistent family and form-template tables. The current UI already works with existing customer/application history; the migration provides the database foundation for a later saved-family manager.

## Privacy

The customer-facing auto-fill query only asks for applications belonging to the logged-in user. The back-office AI Assistant is admin-only. Always review generated form data before official submission.
