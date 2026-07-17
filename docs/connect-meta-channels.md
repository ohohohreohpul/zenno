# Connecting Instagram DMs & Facebook Messenger to Zenno

How the Meta channels work today, how to connect them step by step, and the plan
for the one-click "Login with Facebook" flow we actually want.

---

## How it works (current architecture)

Zenno uses **one Meta app for the whole platform**. Each workspace connects its
own Facebook Page (and the Instagram Professional account linked to that Page).
Inbound messages arrive on two app-level webhooks and are routed to the right
workspace by **page id**:

| Channel | Webhook endpoint | Verify token |
|---|---|---|
| Messenger | `https://<your-app>/api/webhooks/messenger` | `MESSENGER_VERIFY_TOKEN` env var (one global value) |
| Instagram | `https://<your-app>/api/webhooks/instagram` | Generated per workspace — shown in Settings after connecting |

Outbound replies are sent with the **Page access token** stored on each
workspace's connection. Inbound events are authenticated with the **app
secret** (HMAC signature check — required since commit `54230d5`).

---

## Part 1 — One-time platform setup (you, the operator)

Do this once. Your customers never see any of it.

### 1. Create the Meta app

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Create App**.
2. Use case: **Other** → type: **Business**.
3. Note two values from **App Settings → Basic**:
   - **App ID**
   - **App Secret** (this is the `app_secret` pasted when connecting a channel)

### 2. Add the products

In the app dashboard, add:

- **Messenger** (for Facebook Page DMs)
- **Instagram** → "Messenger API for Instagram" (for IG DMs)

### 3. Configure the webhooks

**Messenger** — in *Messenger → Settings → Webhooks*:

- Callback URL: `https://<your-app>/api/webhooks/messenger`
- Verify token: the value of your `MESSENGER_VERIFY_TOKEN` env var
  ⚠️ **Set this env var in Vercel first** — without it the app falls back to a
  guessable default.
- Subscribe to the **`messages`** field.

**Instagram** — in *Instagram → Configuration → Webhooks*:

- Callback URL: `https://<your-app>/api/webhooks/instagram`
- Verify token: shown in Zenno **Settings → Channels → Instagram** *after* a
  workspace connects (it's generated per workspace). Connect the first
  workspace, then complete this step.
- Subscribe to the **`messages`** field.

### 4. Business verification + App Review (the unavoidable part)

While the app is in **Development mode**, everything works — but **only** for
people with a role on the app (admins, developers, testers). To serve real
customers you need:

1. **Business verification** (Meta Business Manager → Security Centre) —
   company documents, usually 1–3 days.
2. **App Review** for these permissions:
   - `pages_messaging` (Messenger)
   - `instagram_basic` + `instagram_manage_messages` (Instagram DMs)
   - `pages_show_list`, `pages_manage_metadata` (page listing + webhook subscription)

   You'll record a short screencast showing the flow: user message → Zenno
   inbox → AI reply. Review typically takes a few days to two weeks.

> **Launch tip:** you can pilot with real businesses *before* review passes by
> adding their Facebook/Instagram account as a **Tester** on your Meta app.
> Limit: a handful of accounts, but perfect for the first pilots.

---

## Part 2 — Connecting a workspace (today's manual flow)

Prerequisites for the business:

- A **Facebook Page** they admin.
- For Instagram: an **Instagram Professional account** (Business or Creator)
  **linked to that Page** (Instagram app → Settings → Business tools → connect Page).

### Get the Page access token

1. Open [Graph API Explorer](https://developers.facebook.com/tools/explorer/).
2. Select **your Meta app** in the top-right dropdown.
3. **User or Page** → *Get Page Access Token* → pick the business's Page.
   Grant the requested permissions when the dialog appears.
4. Copy the token that appears in the token field.

*(Tokens from the Explorer are short-lived. For a long-lived token, exchange it:
`GET /oauth/access_token?grant_type=fb_exchange_token&client_id=<APP_ID>&client_secret=<APP_SECRET>&fb_exchange_token=<TOKEN>` —
page tokens fetched with a long-lived user token don't expire.)*

### Connect in Zenno

**Messenger** — Settings → Channels → Facebook Messenger:

1. Paste the **Page access token**.
2. Paste the **App secret** (App Settings → Basic).
3. Click **Connect**. Zenno validates the token, stores the page id, and shows
   the webhook URL + verify token (already configured in Part 1, step 3).

**Instagram** — Settings → Channels → Instagram DM:

1. Paste the same **Page access token** (the Page linked to the IG account).
2. Paste the **App secret**.
3. Click **Connect**. Copy the **verify token** shown and complete Part 1,
   step 3 for Instagram if you haven't yet.

### Test it

Send a DM to the Page / IG account from an account that has a role on the Meta
app (while in dev mode). It should appear in Zenno **Chats** and get an AI
reply. If not, check the webhook delivery log in the Meta app dashboard
(*Webhooks → Recent errors*).

---

## Part 3 — One-click "Connect with Facebook" ✅ BUILT

This is now implemented. When `META_APP_ID` + `META_APP_SECRET` are set, the
Messenger and Instagram cards in Settings → Channels show a **Connect with
Facebook** button (the manual token flow stays available under "Connect
manually instead"). The user clicks, approves in the Meta popup, picks a Page
if they admin several, and the page is connected **with webhooks
auto-subscribed** — no tokens pasted, no webhook setup per customer.

**To activate it:**

1. Set `META_APP_ID` and `META_APP_SECRET` in Vercel env.
2. In the Meta app dashboard, add the **Facebook Login for Business** product.
3. Add `https://<your-app>/api/channels/meta/oauth/callback` under
   *Facebook Login → Settings → Valid OAuth Redirect URIs*.

Routes: `/api/channels/meta/oauth/start` (dialog),
`/api/channels/meta/oauth/callback` (token exchange + auto-connect),
`/api/channels/meta/pages` (page picker). CSRF-protected with signed expiring
state; inbound webhook signatures for OAuth-connected pages verify against the
platform app secret automatically.

### What the flow looks like

```
[Connect Facebook] click
   → redirect to facebook.com OAuth dialog
       (scopes: pages_show_list, pages_messaging, pages_manage_metadata,
        instagram_basic, instagram_manage_messages)
   → user picks their Page, approves
   → Meta redirects to /api/channels/meta/oauth/callback?code=…
   → server exchanges code → user token → long-lived token
   → GET /me/accounts  → list of Pages + PAGE ACCESS TOKENS (no pasting!)
   → GET /{page-id}?fields=instagram_business_account → linked IG account
   → POST /{page-id}/subscribed_apps  → auto-subscribes the page to our
     webhooks (no manual webhook setup per customer!)
   → store connection(s), show "Connected as <Page name>" ✅
```

### What it needs

| Piece | Effort |
|---|---|
| `META_APP_ID` + `META_APP_SECRET` env vars | config only |
| `GET /api/channels/meta/oauth/start` — builds the dialog URL, CSRF `state` | ~30 lines |
| `GET /api/channels/meta/oauth/callback` — code→token exchange, page list, IG lookup, `subscribed_apps`, store connection | ~150 lines |
| Page-picker UI (if the user admins several Pages) | 1 small component |
| Replace both credential cards with a single **Connect with Facebook** button | small edit |
| Meta app: add **Facebook Login for Business** product, set the callback as a Valid OAuth Redirect URI | dashboard config |

Roughly **one working session**. No schema changes — it fills the same
`credentials: { pageAccessToken, pageId, appSecret, verifyToken }` the manual
flow uses today, so both paths can coexist (keep manual as the fallback for
power users).

### What it does NOT remove

Business verification + App Review (Part 1, step 4) is still required — that's
a Meta policy gate, not a technical one. The OAuth flow actually *helps*
review: reviewers strongly prefer seeing the standard login dialog over
token-pasting instructions.

---

## Quick reference — env vars

| Var | Used for | Status |
|---|---|---|
| `MESSENGER_VERIFY_TOKEN` | Messenger webhook subscription handshake | ⚠️ set in Vercel before subscribing |
| `META_APP_ID` / `META_APP_SECRET` | One-click OAuth flow (Part 3) | needed when we build it |
| `META_PAGE_ACCESS_TOKEN` | Legacy single-tenant fallback for IG sends | optional, per-workspace tokens win |
