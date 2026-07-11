/**
 * Meta webhook verification token — app-level (one Meta app serves all
 * workspaces; inbound events are routed by page id). Shown in the settings
 * UI so the operator can paste it into the Meta app dashboard.
 */
export const MESSENGER_VERIFY_TOKEN =
  process.env.MESSENGER_VERIFY_TOKEN ?? 'zenno-messenger-verify'
