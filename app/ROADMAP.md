# Roadmap — Beating DMChamp + ManyChat

**Product:** White-label AI booking + sales agent for wellness/beauty businesses (yoga, spa, clinics).
**Model:** B2B2B — agencies buy, rebrand, and resell to their clients.
**Today's state:** Working mock-mode app with Dashboard, Chats (AI agent live via Claude), Contacts, Deals, Tasks, Campaigns, Appointments, Analytics, Billing, Settings, Sub Accounts.

---

## Where the incumbents are weak

| | DMChamp | ManyChat | Our wedge |
|---|---|---|---|
| **AI depth** | Good agent, generic prompts | Flow-builder first, AI bolted on | Vertical AI: knows wellness (class packs, trials, no-shows, rebooking) out of the box |
| **Vertical focus** | Horizontal ("closers") | Horizontal (creators/e-com) | 100% wellness/beauty — templates, lifecycle, and language that fit the industry |
| **Lifecycle** | Generic pipeline | None (broadcast lists) | Built-in wellness lifecycle: inquiry → trial → attended → reviewed → rebooked → VIP |
| **Booking** | Books calls | Links out | Books *classes/treatments* natively, synced to the studio's schedule |
| **Pricing** | Credit-heavy, tier matrix confusion | Per-contact pricing punishes growth | Simple credits, agency resells at their own margin |
| **Setup** | Setup wizard, still manual | Template marketplace, complex flows | "Paste your website URL → agent is live" in under 5 minutes |
| **Region** | US/EU-centric | US-centric | LINE + Thai/JP/KR language quality — Asia-Pacific wellness is underserved |

**Positioning in one line:** *ManyChat automates messages. DMChamp answers chats. We fill the studio's schedule.*

---

## Phase 1 — Parity Core (weeks 1–3) ✅ mostly done

The minimum where an agency demoing us next to DMChamp sees no gaps.

- [x] Multi-tenant model (Agency → Workspace → Contact/Message)
- [x] Unified inbox with filter tabs, AI agent chat (Claude), Test-AI mode
- [x] Contacts with tags, Bot Active / DND toggles
- [x] Deals + Tasks kanbans, Appointments calendar, Sub Accounts
- [x] Dashboard KPIs, Analytics, credit billing UI
- [x] Editable system prompt driving the live agent
- [ ] Chat filter tabs actually filter (AI Active / Unread / Attention Required)
- [ ] Contact detail side panel in chat (tags, stage, notes, bot toggle inline)
- [ ] Chat status (Open/Closed) + assignment
- [ ] Working Deals/Tasks CRUD with drag-and-drop

## Phase 2 — The 5-Minute Setup Wizard (weeks 3–5) · *biggest conversion lever*

Both competitors lose customers at onboarding. Win here.

1. **URL → Knowledge Base**: paste the studio's website; we scrape schedule, pricing, services, tone and auto-write the system prompt. Show a diff-style preview the owner can edit in plain language.
2. **Channel connect flow**: guided WhatsApp (360dialog), Instagram, LINE connection with live status checks — not a settings form.
3. **Test drive step**: wizard ends inside Test-AI mode chatting with their own agent. "Wow" before they pay.
4. **Vertical templates**: pick "Yoga studio / Spa / Beauty clinic / Pilates / Muay Thai gym" — pre-tuned prompt, lifecycle labels, campaign pack.

## Phase 3 — AI That Sells, Not Just Answers (weeks 5–8) · *the moat*

- **Tool-use agent**: the AI calls real functions mid-conversation — `check_schedule`, `book_trial`, `hold_spot`, `apply_promo`, `escalate_to_human`. This is genuine booking, not a calendar link. (Claude tool use; DMChamp's "Custom Functions" is Pro-tier only — we make it default.)
- **Lifecycle autopilot**: agent moves contacts through stages automatically (booked trial → trial_booked; mentions attending → attended) and triggers the right follow-up campaign.
- **Attention Required detection**: model flags conversations needing a human (refund requests, complaints, medical questions) → the filter tab becomes real.
- **Voice note / image understanding**: customers send voice notes and screenshots constantly in LINE/WhatsApp; transcribe + understand them (competitor parity, table stakes in Asia).
- **One-click optimization**: nightly job analyzes which replies led to bookings, proposes prompt improvements the owner approves with one click (matches DMChamp's flagship, but per-vertical).

## Phase 4 — Comment-to-DM + Outbound (weeks 8–11) · *ManyChat's turf*

- **Instagram comment-to-DM**: keyword-triggered ("comment CLASS for the schedule") but the DM is handled by the AI agent, not a canned flow — instantly better than ManyChat.
- **Campaign engine v2**: visual flow builder (already scaffolded) with AI-handled replies at every step, quiet hours, and per-channel rate limiting.
- **Re-engagement autopilot**: hasn't visited in 30 days → agent reaches out with a personal message referencing their history ("How's the shoulder? We added a restorative class…").
- **Broadcast with brains**: segment by lifecycle stage + tags; AI personalizes each message rather than mail-merge.

## Phase 5 — Agency Money Machine (weeks 11–14) · *why agencies pick us*

- **Full white-label**: custom domain per agency, their logo/colors, zero mention of us. (Subdomain middleware scaffolding exists.)
- **Credit reselling**: agency buys credits wholesale, sets retail price per sub-account, Stripe Connect payouts. Margin dashboard.
- **Sub-account provisioning API**: agencies script client onboarding.
- **Agency rollup dashboard**: all clients' bookings/replies/revenue in one view + white-labeled weekly PDF report emailed to each client (retention weapon — nobody does this well).
- **BYOK**: agencies bring their own Anthropic key to control AI costs.

## Phase 6 — Production Hardening (parallel track)

- Auth (agency users, roles, sub-account logins)
- MongoDB Atlas + Upstash Redis, BullMQ worker process
- Real channel webhooks end-to-end (WhatsApp/IG/LINE signature verification exists)
- Rate limiting, audit logs, CSP, GDPR/PDPA data export + delete
- E2E tests (Playwright) on the critical flows: setup wizard, test-AI chat, booking, campaign send

---

## What we deliberately do NOT build

- Horizontal "any business" positioning — verticality is the moat
- Complex node-graph flow builders as the primary UX (ManyChat's tax on users) — AI-first, flows as escape hatch
- Email marketing suite — integrate, don't rebuild
- Per-contact pricing — credits only

## North-star metric

**Bookings created by the agent per workspace per week.** Every phase must move it. Show it on every dashboard — it's the number the studio owner renews for and the number the agency screenshots to sell.

## Suggested order of attack (next 3 sessions)

1. Finish Phase 1 leftovers (filters, contact panel, chat status, deals/tasks CRUD)
2. Setup Wizard with URL scraping → auto prompt (Phase 2, highest demo value)
3. Tool-use booking agent (`check_schedule` / `book_trial`) — the "better than DMChamp" proof
