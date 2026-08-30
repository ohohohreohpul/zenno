# WhatsApp gateway: Evolution API → WAHA

Completed on the droplet 2026-08-23. WAHA replaces the Evolution API stack as
the WhatsApp session gateway.

## Why

The old linked-device session was hijacking WhatsApp push notifications on the
owner's phone, so the device was deliberately unlinked (the gateway logs show
`stream:error 401 conflict type="device_removed"` → `LOGOUT` on 2026-08-15,
which was that intentional disconnect, not a failure). WAHA was chosen because
it exposes `WAHA_PRESENCE_AUTO_ONLINE`, the one setting that stops the linked
device from continuously marking itself online — which is what suppresses the
phone's own notifications.

Note this is still a linked-device connection, same as before. The presence flag
is the real lever we now control; it is not a guarantee, so verify notification
behaviour on the phone after reconnecting.

## What runs on the droplet

`139.59.210.225` (`wa.zennohq.studio`), DigitalOcean, 2 vCPU / 4 GB.

- `/opt/zenno-waha/` — the live stack: `docker-compose.yml`, `Caddyfile`, `.env`
  - `zenno-waha-waha-1` — `devlikeapro/waha:latest` (v2026.8.1, CORE tier)
  - `zenno-waha-caddy-1` — TLS termination for `wa.zennohq.studio` → `waha:3000`
- `/opt/zenno-whatsapp/` — the old Evolution stack, **stopped** (`docker compose down`).
  Its volumes still exist (see "Remaining cleanup").
- `/root/zenno-whatsapp-config-backup-20260823.tar.gz` — old `.env`, `Caddyfile`, compose.

Key settings, and why:

| Setting | Value | Why |
| --- | --- | --- |
| `WHATSAPP_DEFAULT_ENGINE` | `NOWEB` | Browserless (no Chromium) — fits comfortably in 4 GB |
| `WAHA_PRESENCE_AUTO_ONLINE` | `false` | The notification-hijacking fix |
| `WHATSAPP_RESTART_ALL_SESSIONS` | `true` | Sessions come back after a container restart |
| `WAHA_API_KEY` | `sha512:<hash>` | Only the hash is stored on the box; the plaintext lives in Vercel |

Dashboard and Swagger are password-protected. Credentials are in
`/opt/zenno-waha/.env` (`WAHA_DASHBOARD_USER` / `WAHA_DASHBOARD_PASS`);
the dashboard is at `https://wa.zennohq.studio/dashboard`.

### Verified after deploy

- `GET /api/sessions` with `X-Api-Key` → `200 []`
- `GET /api/server/version` → `{"version":"2026.8.1","engine":"NOWEB","tier":"CORE","browser":null}`
- No API key → `401`
- TLS verifies through Caddy (`ssl_verify_result=0`)
- Container reports `healthy`

### Known quirk

`WAHA_API_KEY_EXCLUDE_PATH` does not exempt `/health` in this version (tried
both `health` and `/health`; still `401`). The container healthcheck therefore
treats **either 200 or 401** as alive, since a 401 still proves the HTTP server
is serving. Any external uptime monitor must send the `X-Api-Key` header.

## App changes

- `app/src/lib/channels/waha-gateway.ts` — new gateway client
- `app/src/app/api/webhooks/waha/route.ts` — inbound webhook (`message`, `session.status`)
- `app/src/app/api/channels/whatsapp/route.ts` — imports from `waha-gateway`
- The old `wa-gateway.ts` and `webhooks/wa-gateway/route.ts` are left in place,
  unused, for rollback. Safe to delete once WAHA has run clean for a week or two.

## Vercel env (production, project `zen-agent`)

Set 2026-08-23:

- `WAHA_GATEWAY_URL` = `https://wa.zennohq.studio`
- `WAHA_GATEWAY_API_KEY` = the plaintext API key (the droplet only holds its sha512)
- `WAHA_WEBHOOK_TOKEN` = webhook shared secret; the app appends it as `?token=`
  because WAHA's webhook config can't send custom headers (Evolution used a header)

The old `WA_GATEWAY_*` vars are still present but unused — left for rollback.

## Cutover checklist

1. Deploy the app: `npx vercel deploy --prod --yes --scope onbuuk` from `app/`.
2. Settings → WhatsApp → Disconnect, then Connect, and scan the new QR.
   This creates a fresh WAHA session.
3. Send a test message from another phone. Confirm **both**: the AI replies,
   **and** the owner's phone still shows a normal WhatsApp notification.
4. Watch it: `docker logs -f zenno-waha-waha-1` on the droplet.

## Remaining cleanup

The old Evolution volumes are still on disk, intentionally, as the rollback
path until WAHA is proven through a real reconnect:

```
zenno-whatsapp_evolution_instances
zenno-whatsapp_postgres_data
zenno-whatsapp_redis_data
zenno-whatsapp_caddy_data
zenno-whatsapp_caddy_config
```

They hold almost nothing of value — the old stack ran with
`DATABASE_SAVE_DATA_NEW_MESSAGE=false` (and contacts/chats/history saving off),
so there is no real message archive in there. Once WAHA is confirmed working:

```bash
cd /opt/zenno-whatsapp && docker compose down -v && cd / && rm -rf /opt/zenno-whatsapp
```

## Rollback

The Evolution stack was only stopped, never destroyed. To go back:

```bash
cd /opt/zenno-waha && docker compose down     # free ports 80/443
cd /opt/zenno-whatsapp && docker compose up -d
```

Then revert the import in `app/src/app/api/channels/whatsapp/route.ts` from
`waha-gateway` back to `wa-gateway` and redeploy. The `WA_GATEWAY_*` env vars
are still in Vercel.

## Follow-up worth doing

Nothing alerted anyone that the session had been dead for 8 days (Aug 15 → 23).
For a product whose value is "the AI answers 24/7", a session-health check with
an alert is more important than which gateway is running.
