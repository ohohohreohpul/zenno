# Launch checklist

## Current release status

- Live application: [zen-agent.vercel.app](https://zen-agent.vercel.app)
- Verified live: authentication, protected APIs, dashboard data, web-chat enablement, inbound message storage, AI reply, and message polling
- Production data: Supabase with `MOCK_MODE=false`

## Required configuration

- `MOCK_MODE=false`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never use a publishable/anon key here)
- `AUTH_SECRET` (at least 48 random bytes)
- `PUBLIC_APP_URL` (the production `https://` origin)
- `OPENROUTER_API_KEY` or `ANTHROPIC_API_KEY`

For WhatsApp via the session gateway, also set:

- `WA_GATEWAY_URL`
- `WA_GATEWAY_API_KEY`
- `WA_GATEWAY_WEBHOOK_TOKEN`

## Before accepting customers

- Apply `app/supabase/schema.sql` and run `app/scripts/seed.mjs` or create the first real workspace.
- Complete Setup with the business website and verify services, prices, policies, location, and opening hours.
- Connect one channel and test inbound reply, booking, human takeover, and hand-back to AI.
- Confirm the provider webhook signature/token is configured.
- Confirm a manual operator reply pauses the chatbot for that contact.
- Confirm refunds, complaints, medical questions, and payment disputes are flagged for a human.
- Use a unique owner password and review all workspace data before onboarding a real business.

## Deployment gate

The release is acceptable when lint, TypeScript, the production build, authenticated API smoke tests, public webchat storage/polling, task creation, contact updates, and human-takeover pause all pass.
