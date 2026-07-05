# Roadmap v2 — From Working Product to Sellable Product

**Product:** White-label AI booking + sales agent for wellness/beauty businesses.
**Positioning:** *ManyChat automates messages. DMChamp answers chats. We fill the schedule.*
**North-star metric:** bookings created by the agent per workspace per week.

---

## Where we are (July 2026)

Everything below is built, working, and deployed:

| Area | Status |
|---|---|
| Unified inbox with filter tabs, contact side panel, chat status | ✅ live |
| AI agent with real tool use — checks schedule, books appointments, escalates | ✅ live (OpenRouter → Claude Sonnet 4.5, Anthropic fallback) |
| Lifecycle autopilot (booking → `trial_booked` → auto-fires follow-up campaign) | ✅ live |
| Campaigns: auto-trigger on stage change + "Run now" | ✅ live |
| AI-personalized broadcast with segment targeting + preview | ✅ live |
| Comment-to-DM automations (UI + data model) | ✅ UI live, IG webhook not wired |
| Deals + Tasks kanbans with drag-and-drop CRUD | ✅ live |
| Appointments calendar fed by agent bookings | ✅ live |
| Setup Wizard (URL → scraped knowledge → agent prompt → test drive) | ✅ live |
| Auth (login, sessions, protected routes), MongoDB persistence, mock-mode fallback | ✅ live |
| Deployed: GitHub `tonitool/zen-agent`, Vercel `zen-agent-…-onbuuk.vercel.app` (mock mode) | ✅ live |

**The honest gap:** no real customer can message the agent yet. Everything works when *we* simulate the customer; nothing is connected to actual WhatsApp/Instagram/LINE traffic, and the cloud deployment has no database.

---

## Milestone 1 — First real conversation (the only thing that matters next)

Goal: a real person sends a WhatsApp message to a real number and the agent replies. Everything else is polish until this works.

1. **MongoDB Atlas** for the Vercel deployment (free M0 tier) — flip `MOCK_MODE=false` in the cloud, run the seed scripts against it. ~1 hour.
2. **WhatsApp channel, end-to-end.** The webhook route exists (`/api/webhooks/whatsapp`, 360dialog signature verification written) but has never processed live traffic. Wire: inbound webhook → find/create contact → agent reply → **send back out via the channel API** (today replies are only stored, never transmitted). This "outbound transport" layer is the single biggest missing piece — build it once, per-channel adapters after.
3. **One pilot business.** Put a real studio (or a test WhatsApp number acting as one) through the Setup Wizard and let it run for a week. Every bug found here outranks every feature below.
4. **Instagram DM second, LINE third.** Same transport pattern. Comment-to-DM goes real when the IG webhook subscribes to comment events (data model + AI handoff already exist).

## Milestone 2 — Trust the agent when nobody's watching

What a business owner needs before leaving the bot alone with customers:

- **Conversation review digest** — daily summary (in-app + email): conversations handled, bookings made, what was escalated, anything odd. This is DMChamp's "Daily Summaries" — for us it's the trust feature.
- **Guardrails config** — per-workspace settings: max discount the agent may mention, topics to always escalate, business-hours-only sending, per-contact reply rate limit.
- **Human takeover that sticks** — when an operator sends a manual message, auto-pause the bot for that contact (currently the operator must toggle it); "hand back to AI" button.
- **Attention Required detection in the reply path** — the agent has `flag_for_human` but calls it only when it decides to; add a cheap post-reply classifier so refunds/complaints/medical never slip through.
- **Voice note + image understanding** — customers in Asia lead with voice notes; transcribe and understand before replying. (Multimodal via the same OpenRouter layer.)

## Milestone 3 — The agent gets smarter with use

- **One-click optimization** — nightly job analyzes which conversations led to bookings vs. drop-offs, proposes concrete prompt edits, owner approves with one click. Our version of DMChamp's flagship, tuned per vertical.
- **Booking outcomes loop** — mark appointments attended/no-show; feed no-shows into re-engagement campaigns automatically; show show-up rate on the dashboard.
- **Deals autopilot** — agent creates/moves deals when it quotes a package or the customer commits (it already books; let it also track the money).
- **Knowledge freshness** — re-scrape the business website weekly, diff against the prompt, suggest updates ("your pricing page changed — update the agent?").

## Milestone 4 — Product hygiene that unlocks sales

- **Multi-workspace switcher** — `ws-1` is hardcoded across the UI; a business with two locations can't use us. Thread workspace through a context/session.
- **Real credits metering** — decrement credits per AI reply (ledger model exists), block at zero, Stripe top-up flow (UI exists, wire the webhook).
- **New Contact / New Appointment / Export actually work** — several header buttons are still decorative.
- **Notifications** — browser/email ping on Attention Required and new bookings.
- **E2E test suite** (Playwright) on the money paths: login, setup wizard, customer-message→booking, campaign fire. Protects everything above from regressions.
- **Security pass before real customer data:** rate limiting on public endpoints, API-route auth (currently only pages are protected), rotate the OpenRouter key, per-workspace data isolation checks.

## Milestone 5 — Sell it (deferred by choice)

The agency layer (white-label domains, sub-account provisioning, credit reselling, rollup dashboards) stays parked until Milestones 1–2 prove retention with direct businesses. The data model already supports it — nothing built now blocks it.

---

## How we'd improve what exists today (quick wins, roughly ordered by value/effort)

1. **Send replies out through channels** — the storage-only outbound is the illusion-breaker (part of M1 but worth naming alone).
2. **Auto-pause bot on manual reply** — one small change, removes the scariest failure mode (bot and human talking over each other).
3. **Dashboard "Bookings this week" as the hero number** — it's the north star; today the dashboard leads with message counts.
4. **Setup Wizard scrapes more than the homepage** — follow schedule/pricing links for a dramatically better auto-prompt.
5. **Broadcast quiet hours + send-rate throttle** — cheap now, mandatory before real channels.
6. **Chat filter tabs persist in the URL** — shareable "show me Attention Required" links.
7. **Empty states that teach** — new workspaces see blank pages; each should point to the Setup Wizard.

## Suggested next 3 sessions

1. **Atlas + WhatsApp transport + live webhook loop** (Milestone 1, steps 1–2)
2. **Daily digest + human takeover + guardrails** (Milestone 2 core)
3. **Credits metering + multi-workspace + E2E tests** (Milestone 4 essentials)
