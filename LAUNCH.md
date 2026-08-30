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

For WhatsApp via the WAHA session gateway, also set:

- `WAHA_GATEWAY_URL`
- `WAHA_GATEWAY_API_KEY`
- `WAHA_WEBHOOK_TOKEN`

WAHA replaced the Evolution API gateway (2026-08-23) — the old
`WA_GATEWAY_*` vars and `/api/webhooks/wa-gateway` route are dead but left in
place during the transition. See `docs/waha-migration.md` for the deployment
command and rollback notes.

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
