# Zenno — AI Receptionist

Zenno is a 24/7 text chatbot for service businesses. It learns the business from its website, answers customer questions, qualifies leads, checks live availability, books appointments, remembers customer context, and hands sensitive conversations to a human.

## Live application

Open [zen-agent.vercel.app](https://zen-agent.vercel.app).

## Run locally

```bash
cd app
cp .env.example .env.local
# Add OPENROUTER_API_KEY or ANTHROPIC_API_KEY to .env.local
npm install
npm run dev
```

For isolated local development, set `MOCK_MODE=true` and configure `LOCAL_ADMIN_EMAIL` and `LOCAL_ADMIN_PASSWORD`.

## Production setup

1. Create the database by running [`app/supabase/schema.sql`](app/supabase/schema.sql) in the Supabase SQL editor.
2. Configure `NEXT_PUBLIC_SUPABASE_URL`, a supported Supabase server credential, `AUTH_SECRET`, and one AI provider key from [`app/.env.example`](app/.env.example).
3. Seed the initial workspace:

```bash
cd app
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed.mjs
```

4. Set `MOCK_MODE=false`, deploy, open **Settings → Channels**, and connect WhatsApp, Telegram, LINE, Messenger, or Web Chat.
5. Open **Setup**, enter the business website, review the extracted instructions, save them, and send a real test message.

Detailed production checks are in [`LAUNCH.md`](LAUNCH.md).

## Verification

```bash
cd app
npm run lint
npx tsc --noEmit
npm run build
```
