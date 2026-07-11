# Zenno — Website Brief (USPs · Features · Process)

For the web designer. Everything in here describes the product as it actually works today — no vaporware. Numbers marked *(example)* are placeholder metrics for layout; final proof numbers come after the first pilot.

---

## 1. What is Zenno

**One-liner:** An AI receptionist that answers customer chats and books appointments 24/7 — on the business's own WhatsApp, Telegram, LINE, Messenger, or website.

**Audience:** Wellness & beauty businesses (yoga studios, salons, spas, clinics) — owners who lose bookings because nobody answers the phone/chat at 11pm.

**Positioning:**
> ManyChat automates messages. DMChamp answers chats. **Zenno fills the schedule.**

**North-star metric the whole site should sell:** bookings created by the agent per week. Not "messages sent". Not "AI-powered". **Bookings.**

---

## 2. USPs (ranked — lead with #1)

### USP 1 — It books. It doesn't just chat.
The agent has real tools: it checks the live class schedule, offers actual open slots with real availability ("8 spots left"), books the appointment into the calendar, and fires the follow-up campaign. A chatbot ends with "someone will get back to you". Zenno ends with a confirmed booking.
- **Visual:** the chat auto-play component (customer asks → agent offers real slot → "● Booked · Sat 10:00").

### USP 2 — Their own number. Connected in minutes.
No Meta business verification, no BSP contracts, no rented phone numbers. The business scans a QR code with their own WhatsApp — same as WhatsApp Web — or pastes a bot token for Telegram (60 seconds). Web chat is one script tag.
- **Visual:** QR scan → green "Connected" morph; the three connect-method cards.

### USP 3 — Safe sending, built in.
Fresh numbers get automatic warm-up protection: daily send caps start small (20/day) and double weekly up to a ceiling (200/day), with enforced gaps between bulk sends. Replies to customers who message first always go through. This is the anti-ban answer — address it openly, it's the #1 objection.
- **Visual:** warm-up gauge component; FAQ item "Will WhatsApp ban my number?" open by default.

### USP 4 — The human stays in charge.
The moment the owner types a reply themselves, the AI pauses for that contact — no bot talking over a human. Refunds, complaints, medical questions auto-escalate with an "Attention required" flag. One button hands the thread back to the AI.
- **Visual:** AI active / paused toggle component.

### USP 5 — It gets smarter about the business, instantly.
Setup wizard: paste the business website URL → Zenno scrapes it → generates the agent's knowledge and personality → test-drive the agent before going live.
- **Visual:** 3-step process strip.

---

## 3. Features (grouped for the site)

### Capture & convert
| Feature | What to say |
|---|---|
| AI booking agent | Answers every inquiry in seconds, offers real slots, books trials/appointments/consults |
| Multi-channel | WhatsApp · Telegram · LINE · Messenger · Web chat widget (Instagram coming) |
| Web chat widget | One `<script>` tag on any website; AI answers visitors and books them |
| Setup wizard | Website URL → scraped knowledge → ready-to-test agent |

### Operate
| Feature | What to say |
|---|---|
| Unified inbox | All channels in one thread view; filters: Open, Unread, AI Paused, Attention Required |
| Human takeover | Type to pause the bot per-contact; hand back anytime |
| Appointments calendar | Every agent booking lands here automatically |
| Deals & tasks boards | Drag-and-drop kanban for pipeline and to-dos |
| Daily summary | What the agent handled, booked, and escalated — trust at a glance |

### Grow
| Feature | What to say |
|---|---|
| Lifecycle autopilot | Booking moves the contact's stage; stage changes auto-fire follow-up campaigns |
| AI broadcast | Segment-targeted campaigns, personalized per contact, with preview before send |
| Analytics | Bookings (hero number), conversations, channel performance |

### Safety & control
| Feature | What to say |
|---|---|
| Warm-up quotas | 20 → 200 msgs/day, grows weekly with number age; configurable |
| Guardrails | Max discount the agent may mention, always-escalate topics, business-hours sending |
| Escalation | `flag_for_human` for refunds/complaints/medical — never guesses on risky topics |
| Credits metering | Transparent per-reply usage, visible in the app |

---

## 4. Process (how the site should explain it)

### Short version (hero / 3-step strip)
1. **Connect a channel** — scan a QR or paste a token. Minutes, not weeks.
2. **AI learns your business** — point it at your website; test-drive it.
3. **Bookings roll in** — your calendar fills while you teach, treat, or sleep.

### Full version (for a "How it works" section)
1. **Connect** — WhatsApp via QR (their own number), Telegram via bot token, LINE/Messenger via keys, web chat via one script tag.
2. **Teach** — setup wizard scrapes the business site; owner reviews the agent's knowledge & tone; guardrails set the boundaries.
3. **Test drive** — chat with the agent privately before customers do.
4. **Go live** — the agent answers, qualifies, books, and escalates 24/7; owner watches the inbox and daily summary.
5. **Grow** — lifecycle campaigns re-engage no-shows and past customers automatically.

---

## 5. Results components *(example values — replace after pilot)*

- **38** bookings created this week *(hero stat, dark tile)*
- **9 sec** median first reply
- **71%** of conversations handled end-to-end
- **0** missed messages
- Before/after split: *11pm inquiry → silence* vs *answered in 9 sec, booked for Saturday*
- ROI teaser: chats/week × booking value → *≈ €2,340 recovered/month (example)*

---

## 6. Voice & copy anchors (already used in wireframes)

- "Your chats, answered. Your calendar, filled."
- "Bookings while you sleep"
- "Chatbots chat. Zenno books."
- "Their own WhatsApp. Not a rented number."
- "AI answers. You stay in charge."
- "Your next customer is typing right now." *(closing CTA)*
- CTA labels: **Get started free** (primary) · **See it book a class** (secondary/demo)
- Tone: direct, concrete, zero AI-hype words ("revolutionary", "supercharge" are banned). Every claim ties to a booking.

---

## 7. Pricing (current placeholder tiers)

| Starter €99/mo | Growth €249/mo ★ | Agency €499/mo |
|---|---|---|
| 1 channel · 500 replies | All channels · 2,500 replies | Multi-location · white-label |

---

## 8. Design resources

- **Wireframe kit (16 sections, low/mid-fi):** https://www.figma.com/design/w0Ofy4K0ZZikVFBeiHIuO1 — all auto-layout, built on the product tokens
- **Motion kit (live, copy-paste animations):** https://zen-agent.vercel.app/motion-kit.html — 8 patterns, reduced-motion safe
- **Product to screenshot / demo:** https://zen-agent.vercel.app — login `demo@studio.com` / `demo1234`
- **Design tokens** (from the product — the site must feel like the same family):
  - Background `#FDFCFA` · Card `#FFFFFF` · Sidebar `#F9F7F4`
  - Border `#EEEBE6` / strong `#D8D3CB`
  - Text `#1A1714` / secondary `#6B6560` / tertiary `#A09990`
  - Accent (CTAs) `#1A1714` · Accent subtle `#F0EDE8`
  - Success/booked `#059669` · Danger `#DC2626`
  - Channels: WhatsApp `#25D366` · Telegram `#26A5E4` · LINE `#00B900` · Messenger `#0084FF` · Web chat `#6366F1` · Instagram `#E1306C`
  - Radii 6/10/14/20 · Font **Geist** (fallback: system sans)
- **Suggested page order:** Hero (chat auto-play) → logo strip → stat tiles → "How it works" 3-step → feature grid → channels + connect cards → USP splits (own number / books not chats / human in charge) → before/after + ROI → testimonials → pricing → comparison → FAQ (ban question first, open) → closing CTA.

---

## 9. Honest constraints (don't oversell)

- Instagram DM is on the roadmap, not live — show it "coming soon" if at all.
- The example metrics in §5 are placeholders until the first pilot business runs.
- WhatsApp connection uses the linked-device method (like WhatsApp Web); the warm-up system exists precisely to keep that safe — that's why we talk about it openly instead of hiding it.
