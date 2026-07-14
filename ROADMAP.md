# Zenno status

## Usable launch candidate

- Supabase is the single production data layer; the incomplete Mongoose runtime has been removed.
- The website setup flow stores both agent instructions and extracted business knowledge.
- Real inbound replies receive business knowledge, contact memory, guardrails, and live booking/deal tools.
- WhatsApp gateway, Telegram, LINE, Messenger, Instagram, and embeddable webchat adapters exist.
- Manual operator replies pause the chatbot for the contact.
- Internal APIs require a valid signed session; public webhook routes retain provider-specific verification.
- Mock mode remains available for a self-contained demo.
- Lint, TypeScript, production build, and local production-server smoke tests pass.

## External launch dependencies

- Apply the checked-in schema to Supabase and configure the service-role key in the deployment.
- Connect and verify at least one real messaging provider account.
- Run a real customer-message → accurate answer → booking → human takeover acceptance test.

## After the first pilot

- Replace the hardcoded single workspace UI with a session-scoped workspace selector.
- Add durable distributed rate limiting for the public webchat endpoint.
- Add Playwright tests for login, setup, inbox, booking, and channel connection.
- Add automatic knowledge refresh with owner approval when the source website changes.
