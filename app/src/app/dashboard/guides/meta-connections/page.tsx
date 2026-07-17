import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, CheckCircle2, ExternalLink, KeyRound, MessageCircle, ShieldCheck, Webhook } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Connect Facebook & Instagram | Zenno',
  description: 'Connect Facebook Messenger and Instagram DMs to your Zenno AI agent.',
}

const metaLink = 'https://developers.facebook.com/apps/'
const messengerDocs = 'https://developers.facebook.com/docs/messenger-platform/webhooks'
const instagramDocs = 'https://developers.facebook.com/docs/messenger-platform/instagram/get-started'

const card = {
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: 22,
} as const

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section style={card}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 30, height: 30, borderRadius: 99, background: 'var(--accent)', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
          {number}
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: '2px 0 8px', fontSize: 16, letterSpacing: '-0.01em' }}>{title}</h2>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.7 }}>{children}</div>
        </div>
      </div>
    </section>
  )
}

function ChecklistItem({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
      <CheckCircle2 size={15} style={{ color: 'var(--stage-attended)', flexShrink: 0, marginTop: 3 }} />
      <span>{children}</span>
    </li>
  )
}

function ExternalDoc({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--accent)', fontWeight: 600 }}>
      {children} <ExternalLink size={12} />
    </a>
  )
}

export default function MetaConnectionsGuidePage() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 20, overflowY: 'auto', background: 'var(--bg)' }}>
      <header style={{ height: 'var(--topbar-height)', display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'var(--card)', position: 'sticky', top: 0, zIndex: 2 }}>
        <Link href="/dashboard/settings?tab=channels" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 13 }}>
          <ArrowLeft size={15} /> Back to channels
        </Link>
      </header>

      <main style={{ width: '100%', maxWidth: 820, margin: '0 auto', padding: '40px 24px 64px' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 10px', borderRadius: 99, background: 'var(--accent-subtle)', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
            <MessageCircle size={13} /> Channel setup
          </div>
          <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.15, letterSpacing: '-0.035em' }}>Connect Facebook Messenger and Instagram DMs</h1>
          <p style={{ margin: '12px 0 0', maxWidth: 650, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>
            This is the customer-managed setup. You keep control of your Meta app, Page, Instagram account, access token, and permissions. Zenno only uses the credentials you provide to receive and answer messages.
          </p>
        </div>

        <div style={{ ...card, background: '#F4FAF7', borderColor: '#CFE9DC', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 700, marginBottom: 10 }}><ShieldCheck size={17} style={{ color: 'var(--stage-attended)' }} /> Before you start</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
            <ChecklistItem>A Facebook Page that you manage with full control.</ChecklistItem>
            <ChecklistItem>For Instagram: an Instagram <strong>Professional</strong> account connected to that Facebook Page.</ChecklistItem>
            <ChecklistItem>A Meta Developer account and a Meta app owned by your business.</ChecklistItem>
            <ChecklistItem>Permission to manage the Page, its messages, and the connected Instagram account.</ChecklistItem>
          </ul>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Step number={1} title="Create or open your Meta app">
            Go to <ExternalDoc href={metaLink}>Meta for Developers</ExternalDoc>, create an app for your business, and add the Messenger messaging capability. Meta changes the dashboard wording occasionally, so choose the use case related to managing business messages if prompted.
          </Step>

          <Step number={2} title="Connect your Facebook Page">
            In your app&apos;s Messenger settings, add the Facebook Page you want the AI to answer for. Generate a <strong>Page access token</strong> for that Page. The token must allow messaging; Instagram also requires <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>instagram_manage_messages</code>, <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>instagram_basic</code>, and <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>pages_manage_metadata</code>.
          </Step>

          <Step number={3} title="Copy the two credentials into Zenno">
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 9 }}><KeyRound size={15} style={{ marginTop: 3, flexShrink: 0 }} /><span><strong>Page access token:</strong> copy it from the Messenger or Instagram setup area for the correct Page.</span></div>
              <div style={{ display: 'flex', gap: 9 }}><KeyRound size={15} style={{ marginTop: 3, flexShrink: 0 }} /><span><strong>Meta app secret:</strong> open App settings → Basic → App secret → Show.</span></div>
              <div>In Zenno, return to <Link href="/dashboard/settings?tab=channels" style={{ color: 'var(--accent)', fontWeight: 600 }}>Settings → Channels</Link>, paste both values into the Facebook Messenger or Instagram DM card, and click <strong>Connect</strong>.</div>
            </div>
          </Step>

          <Step number={4} title="Configure the webhook in Meta">
            After Zenno accepts the credentials, the channel card displays a <strong>Webhook URL</strong> and <strong>Verify token</strong>. In the matching Meta app webhook settings:
            <ol style={{ margin: '10px 0 0', paddingLeft: 20, display: 'grid', gap: 6 }}>
              <li>Click Edit callback URL or Add callback URL.</li>
              <li>Paste the Webhook URL and Verify token exactly as Zenno shows them.</li>
              <li>Verify and save the callback.</li>
              <li>Subscribe the Page to the <strong>messages</strong> event. Add message delivery, read, and postback events only if you need them.</li>
            </ol>
          </Step>

          <Step number={5} title="Finish Instagram-specific settings">
            Confirm the Instagram Professional account is linked to the same Facebook Page used for the token. In Instagram, enable access for connected tools under the account&apos;s message-control settings. Subscribe the Instagram messaging webhook in the Meta dashboard. See Meta&apos;s <ExternalDoc href={instagramDocs}>Instagram messaging guide</ExternalDoc> for the current dashboard flow.
          </Step>

          <Step number={6} title="Test the connection">
            Send a new message to the Facebook Page or Instagram account from a different personal account. Keep Zenno&apos;s AI agent enabled, then confirm the conversation appears and receives a reply. Test text first; test attachments and follow-ups afterward.
          </Step>
        </div>

        <section style={{ ...card, marginTop: 16 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>If it does not work</h2>
          <div style={{ display: 'grid', gap: 12, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <div><strong style={{ color: 'var(--text-primary)' }}>Token rejected:</strong> regenerate a Page token for the correct Page and confirm your Facebook user still has full Page access.</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Webhook verification fails:</strong> copy both values again without spaces and make sure you are configuring the matching Facebook or Instagram webhook URL.</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Instagram messages do not arrive:</strong> confirm the account is Professional, linked to the Page, connected-tools access is enabled, and the app has <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>instagram_manage_messages</code>.</div>
            <div><strong style={{ color: 'var(--text-primary)' }}>Only app admins can test:</strong> while the Meta app is in Development mode, access is limited to app roles and test assets. Serving other customers generally requires Live mode, Business Verification, and App Review for the requested permissions.</div>
          </div>
        </section>

        <div style={{ ...card, marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 10, background: '#FFF9ED', borderColor: '#F1DFC0' }}>
          <AlertTriangle size={17} style={{ color: 'var(--stage-reviewed)', flexShrink: 0, marginTop: 2 }} />
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.65 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Messaging policy:</strong> automated replies must follow Meta&apos;s platform rules and messaging window. Do not use this connection for unsolicited bulk outreach. Keep access tokens and the app secret private, and disconnect the channel immediately if either credential is exposed.
          </div>
        </div>

        <footer style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 22, fontSize: 12 }}>
          <ExternalDoc href={messengerDocs}>Official Messenger webhook documentation</ExternalDoc>
          <ExternalDoc href={instagramDocs}>Official Instagram messaging documentation</ExternalDoc>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--text-tertiary)' }}><Webhook size={12} /> Meta may rename dashboard sections over time</span>
        </footer>
      </main>
    </div>
  )
}
