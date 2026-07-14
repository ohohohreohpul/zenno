# Zenno WhatsApp QR gateway

This is the persistent WhatsApp Web session service behind Zenno's primary
**Connect WhatsApp** QR flow. Users can connect a personal or business number;
an official WhatsApp Business API account is not required. The stack runs
Evolution API with PostgreSQL, Redis, durable session storage, and automatic
HTTPS through Caddy.

It must run on an always-on Linux server with a public IP. Do not deploy this
stack to Vercel or another scale-to-zero/serverless runtime: the linked-device
socket and session must stay alive.

## Server requirements

- Ubuntu 24.04 or another supported Docker host
- 2 GB RAM minimum (4 GB recommended for multiple active numbers)
- Docker Engine with the Compose plugin
- A DNS record such as `wa.example.com` pointing to the server
- Inbound TCP 80 and 443, plus UDP 443, allowed by the firewall

## Deploy

```bash
cd infra/whatsapp-gateway
cp .env.example .env
# Replace every placeholder in .env with the real domain and random secrets.
docker compose pull
docker compose up -d
docker compose ps
curl -H 'Origin: https://zen-agent.vercel.app' https://wa.example.com/
```

The stack intentionally pins Evolution API to `v2.3.6`. Do not switch to
`latest`: Evolution 2.4 introduces mandatory license activation and should be
evaluated separately before an upgrade.

The Evolution Manager UI is intentionally not deployed. Zenno drives the API
server-to-server, and Caddy blocks the built-in `/manager` route so no gateway
administration surface is public.

## Connect Zenno production

Set these server-only variables in the Vercel production environment:

```text
WA_GATEWAY_URL=https://wa.example.com
WA_GATEWAY_API_KEY=<same value as EVOLUTION_API_KEY>
WA_GATEWAY_WEBHOOK_TOKEN=<a third independent random secret>
PUBLIC_APP_URL=https://zen-agent.vercel.app
```

Redeploy Zenno after setting them. In Zenno, open **Settings → Channels →
WhatsApp**, select **Connect WhatsApp**, and scan the QR from WhatsApp under
**Settings → Linked devices → Link a device**.

The app registers this webhook automatically for each workspace:

```text
https://zen-agent.vercel.app/api/webhooks/wa-gateway
```

The webhook token is delivered in the private `x-zenno-webhook-token` header.
It must never be added manually to the public URL.

## Verify end to end

1. Confirm all four containers report healthy with `docker compose ps`.
2. Scan the QR and wait for Zenno to show **Connected** and the phone number.
3. From a different WhatsApp number, send a new inbound message.
4. Confirm the contact and message appear in the Zenno inbox.
5. Confirm the AI response is delivered back to WhatsApp.
6. Restart the stack with `docker compose restart` and verify the connection
   returns without scanning another QR.

## Backups and updates

Back up both the `postgres_data` and `evolution_instances` Docker volumes. A
database-only backup is not enough to guarantee recovery of linked sessions.
Test updates on a second gateway before changing the pinned production image.

WhatsApp Web automation is an unofficial connection method and carries account
restriction risk. Zenno discloses this during connection and applies warm-up
limits to campaigns and broadcasts. Inbound AI replies and human replies are
not blocked by those limits. The official WhatsApp Business Platform can remain
an optional path for customers who need approved templates or production-scale
outbound messaging.
