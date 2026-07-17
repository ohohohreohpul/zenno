/* eslint-disable @typescript-eslint/no-explicit-any */
export const IS_MOCK = process.env.MOCK_MODE === 'true'

type ID = string

interface MockContact {
  _id: ID
  workspaceId: ID
  externalId: string
  channel: string
  name: string | null
  phone: string | null
  lifecycleStage: string
  tags: string[]
  botActive: boolean
  dnd: boolean
  chatStatus: 'open' | 'closed'
  attentionRequired: boolean
  unread: number
  notes: string
  memorySummary: string
  memoryUpdatedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface MockDeal {
  _id: ID
  workspaceId: ID
  contactId: ID | null
  name: string
  contactName: string
  value: number
  currency: string
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
  channel: string
  createdAt: Date
  updatedAt: Date
}

export interface MockTask {
  _id: ID
  workspaceId: ID
  contactId: ID | null
  title: string
  contactName: string | null
  priority: 'high' | 'medium' | 'low'
  status: 'todo' | 'in_progress' | 'waiting' | 'done'
  dueDate: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface MockScheduleSlot {
  _id: ID
  workspaceId: ID
  className: string
  dayOfWeek: number
  time: string
  durationMin: number
  capacity: number
  booked: number
  instructor: string
}

export interface MockAppointment {
  _id: ID
  workspaceId: ID
  contactId: ID | null
  contactName: string
  className: string
  startsAt: Date
  durationMin: number
  channel: string
  kind: 'trial' | 'regular' | 'consult'
  createdAt: Date
}

export interface MockCommentAutomation {
  _id: ID
  workspaceId: ID
  keyword: string
  postLabel: string
  openingDm: string
  status: 'active' | 'paused'
  stats: { commentsCaptured: number; dmsSent: number; booked: number }
  createdAt: Date
}

interface MockMessage {
  _id: ID
  workspaceId: ID
  contactId: ID
  channel: string
  direction: 'inbound' | 'outbound'
  content: string
  aiGenerated: boolean
  createdAt: Date
}

interface MockCampaign {
  _id: ID
  workspaceId: ID
  name: string
  status: 'draft' | 'active' | 'paused' | 'archived'
  triggerStage: string
  goal: string
  flow: object[]
  createdAt: Date
  updatedAt: Date
}

interface MockAgency {
  _id: ID
  name: string
  slug: string
  ownerId: string
  brandColor: string
  credits: number
  plan: string
  createdAt: Date
}

interface MockWorkspace {
  _id: ID
  name: string
  slug: string
  agencyId: ID
  createdAt: Date
}

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000)

// ── Agency & Workspace ─────────────────────────────────────────────────────────

export const mockAgencies: MockAgency[] = [
  {
    _id: 'agency-1',
    name: 'Zenno Studio',
    slug: 'zenno-studio',
    ownerId: 'user-1',
    brandColor: '#1A1714',
    credits: 850,
    plan: 'pro',
    createdAt: ago(20160),
  },
]

export const mockWorkspaces: MockWorkspace[] = [
  { _id: 'ws-1', name: 'Zenno Studio Berlin', slug: 'zenno-berlin', agencyId: 'agency-1', createdAt: ago(10080) },
]

// ── 12 Contacts ───────────────────────────────────────────────────────────────

export const mockContacts: MockContact[] = [
  // 1. Anna Müller — full sales cycle, WhatsApp, German, trial_booked
  { _id: 'c-1', workspaceId: 'ws-1', externalId: '491701234567', channel: 'whatsapp', name: 'Anna Müller', phone: '+491701234567', lifecycleStage: 'trial_booked', tags: ['yoga', 'trial', 'neukunde'], botActive: true, dnd: false, chatStatus: 'open', attentionRequired: false, unread: 0, notes: '', memorySummary: 'Neukunde via Instagram. Interessiert an Morning Flow. Hat zuerst Preis als zu teuer empfunden, nach Reframing Probestunde gebucht. Deal: 10er-Karte erstellt.', memoryUpdatedAt: ago(8), createdAt: ago(320), updatedAt: ago(8) },

  // 2. Stefan Weber — English, qualified, massage interest
  { _id: 'c-2', workspaceId: 'ws-1', externalId: '491709876543', channel: 'whatsapp', name: 'Stefan Weber', phone: '+491709876543', lifecycleStage: 'qualified', tags: ['massage', 'consultation'], botActive: true, dnd: false, chatStatus: 'open', attentionRequired: false, unread: 1, notes: '', memorySummary: 'International client, English speaker. Interested in deep tissue massage. Offered a consultation. Deal: Massage package created.', memoryUpdatedAt: ago(25), createdAt: ago(180), updatedAt: ago(25) },

  // 3. Clara Schmidt — German, attended, returning customer with memory
  { _id: 'c-3', workspaceId: 'ws-1', externalId: '491512345678', channel: 'whatsapp', name: 'Clara Schmidt', phone: '+491512345678', lifecycleStage: 'attended', tags: ['yoga', 'vip', 'returning'], botActive: true, dnd: false, chatStatus: 'open', attentionRequired: false, unread: 0, notes: 'Stammkunde seit 6 Monaten. Bevorzugt Yin Yoga bei Mara.', memorySummary: 'Stammkunde seit 6 Monaten. Liebt Yin Yoga bei Mara. Hat schon 2 Retreats besucht. Bietet Jahrestarif an.', memoryUpdatedAt: ago(60), createdAt: ago(720), updatedAt: ago(60) },

  // 4. Marco Bianchi — English, Messenger, inquiry
  { _id: 'c-4', workspaceId: 'ws-1', externalId: 'm_marco_b', channel: 'messenger', name: 'Marco Bianchi', phone: null, lifecycleStage: 'inquiry', tags: ['facial', 'new'], botActive: true, dnd: false, chatStatus: 'open', attentionRequired: false, unread: 2, notes: '', memorySummary: 'New inquiry via Messenger. Interested in facial treatments. AI is qualifying.', memoryUpdatedAt: ago(12), createdAt: ago(45), updatedAt: ago(12) },

  // 5. Lena Fischer — German, WhatsApp, negotiation (comparing with competitor)
  { _id: 'c-5', workspaceId: 'ws-1', externalId: '491611223344', channel: 'whatsapp', name: 'Lena Fischer', phone: '+491611223344', lifecycleStage: 'negotiation', tags: ['membership', 'objection'], botActive: true, dnd: false, chatStatus: 'open', attentionRequired: false, unread: 1, notes: 'Vergleicht mit Konkurrent in Mitte. Hat 15% Rabatt gefordert.', memorySummary: 'Vergleicht mit Studio in Mitte (Monatstarif 159€). Hat 15% Rabatt gefordert. AI erklärt den Mehrwert. Deal in Verhandlung.', memoryUpdatedAt: ago(18), createdAt: ago(160), updatedAt: ago(18) },

  // 6. Yuki Tanaka — English, WhatsApp, VIP, deal WON
  { _id: 'c-6', workspaceId: 'ws-1', externalId: '491762345678', channel: 'whatsapp', name: 'Yuki Tanaka', phone: '+491762345678', lifecycleStage: 'vip', tags: ['vip', 'spa', 'premium'], botActive: true, dnd: false, chatStatus: 'open', attentionRequired: false, unread: 0, notes: 'VIP Kunde. Nimmt Premium-Pakete. Kommt alle 2 Wochen.', memorySummary: 'VIP-Kunde seit 8 Monaten. Bucht Premium Spa Package alle 2 Wochen. Bevorzugt Lukas als Therapeuten. Deal geschlossen: Premium Spa Package 450€.', memoryUpdatedAt: ago(120), createdAt: ago(2880), updatedAt: ago(120) },

  // 7. Hannah Wagner — German, Instagram, inquiry → went quiet (stalled, for one-click optimize demo)
  { _id: 'c-7', workspaceId: 'ws-1', externalId: 'ig_hannah_w', channel: 'instagram', name: 'Hannah Wagner', phone: null, lifecycleStage: 'inquiry', tags: ['yoga', 'stalled'], botActive: true, dnd: false, chatStatus: 'open', attentionRequired: false, unread: 0, notes: 'Hat vor 48h angefragt, nicht geantwortet.', memorySummary: 'Erste Anfrage vor 48h. Keine Antwort seitdem. Re-Engagement nötig.', memoryUpdatedAt: ago(2880), createdAt: ago(2900), updatedAt: ago(2880) },

  // 8. Tom Becker — German, WhatsApp, qualified but stalled 48h
  { _id: 'c-8', workspaceId: 'ws-1', externalId: '491774455667', channel: 'whatsapp', name: 'Tom Becker', phone: '+491774455667', lifecycleStage: 'qualified', tags: ['massage', 'stalled'], botActive: true, dnd: false, chatStatus: 'open', attentionRequired: false, unread: 0, notes: 'Qualifiziert, aber 48h keine Antwort.', memorySummary: 'Interessiert an Massage. Qualifiziert vor 2 Tagen. Seitdem keine Antwort. Follow-up nötig.', memoryUpdatedAt: ago(2880), createdAt: ago(600), updatedAt: ago(2880) },

  // 9. Sophie Klein — German, Messenger, complaint → escalated (attention required)
  { _id: 'c-9', workspaceId: 'ws-1', externalId: 'm_sophie_k', channel: 'messenger', name: 'Sophie Klein', phone: null, lifecycleStage: 'qualified', tags: ['complaint', 'escalated'], botActive: false, dnd: false, chatStatus: 'open', attentionRequired: true, unread: 3, notes: 'Beschwerde über Massage-Behandlung. AI hat an Mensch eskaliert.', memorySummary: 'Beschwerde: Massage war zu kurz. AI hat sofort an Team eskaliert. Bot pausiert — Mensch übernimmt.', memoryUpdatedAt: ago(20), createdAt: ago(200), updatedAt: ago(20) },

  // 10. David Chen — English, WhatsApp, trial_booked for tomorrow
  { _id: 'c-10', workspaceId: 'ws-1', externalId: '491761122334', channel: 'whatsapp', name: 'David Chen', phone: '+491761122334', lifecycleStage: 'trial_booked', tags: ['facial', 'trial'], botActive: true, dnd: false, chatStatus: 'open', attentionRequired: false, unread: 0, notes: '', memorySummary: 'Booked facial trial for tomorrow 10am. Confirmed via WhatsApp.', memoryUpdatedAt: ago(35), createdAt: ago(90), updatedAt: ago(35) },

  // 11. Nadia Petrov — German, WhatsApp, rebooked (campaign re-engaged her)
  { _id: 'c-11', workspaceId: 'ws-1', externalId: '491512987654', channel: 'whatsapp', name: 'Nadia Petrov', phone: '+491512987654', lifecycleStage: 'rebooked', tags: ['yoga', 'returning', 'campaign'], botActive: true, dnd: false, chatStatus: 'closed', attentionRequired: false, unread: 0, notes: 'Wiedergewonnen durch Re-Engagement Kampagne.', memorySummary: 'Altkunde, war 3 Monate inaktiv. Re-Engagement Kampagne hat sie zurückgeholt. Bucht wieder Morning Flow.', memoryUpdatedAt: ago(180), createdAt: ago(4320), updatedAt: ago(180) },

  // 12. Felix Roth — German, Instagram, reviewed (happy customer, 5 stars, chat closed)
  { _id: 'c-12', workspaceId: 'ws-1', externalId: 'ig_felix_r', channel: 'instagram', name: 'Felix Roth', phone: null, lifecycleStage: 'reviewed', tags: ['review', 'satisfied'], botActive: true, dnd: false, chatStatus: 'closed', attentionRequired: false, unread: 0, notes: '5-Sterne Google Review hinterlassen.', memorySummary: 'Zufriedener Kunde. Hat 5-Sterne Google Review hinterlassen. AI hat sich bedankt. Chat geschlossen.', memoryUpdatedAt: ago(500), createdAt: ago(1500), updatedAt: ago(500) },
]

// ── 7 Deals ───────────────────────────────────────────────────────────────────

export const mockDeals: MockDeal[] = [
  { _id: 'd-1', workspaceId: 'ws-1', contactId: 'c-1', name: '10er-Karte Yoga', contactName: 'Anna Müller', value: 380, currency: 'EUR', stage: 'negotiation', channel: 'whatsapp', createdAt: ago(280), updatedAt: ago(8) },
  { _id: 'd-2', workspaceId: 'ws-1', contactId: 'c-5', name: 'Monatstarif', contactName: 'Lena Fischer', value: 199, currency: 'EUR', stage: 'negotiation', channel: 'whatsapp', createdAt: ago(140), updatedAt: ago(18) },
  { _id: 'd-3', workspaceId: 'ws-1', contactId: 'c-6', name: 'Premium Spa Package', contactName: 'Yuki Tanaka', value: 450, currency: 'EUR', stage: 'won', channel: 'whatsapp', createdAt: ago(2800), updatedAt: ago(120) },
  { _id: 'd-4', workspaceId: 'ws-1', contactId: 'c-3', name: 'Jahrestarif', contactName: 'Clara Schmidt', value: 1990, currency: 'EUR', stage: 'proposal', channel: 'whatsapp', createdAt: ago(500), updatedAt: ago(60) },
  { _id: 'd-5', workspaceId: 'ws-1', contactId: 'c-4', name: 'Facial Treatment', contactName: 'Marco Bianchi', value: 120, currency: 'EUR', stage: 'lead', channel: 'messenger', createdAt: ago(40), updatedAt: ago(12) },
  { _id: 'd-6', workspaceId: 'ws-1', contactId: 'c-2', name: 'Massage Package 6x', contactName: 'Stefan Weber', value: 360, currency: 'EUR', stage: 'qualified', channel: 'whatsapp', createdAt: ago(150), updatedAt: ago(25) },
  { _id: 'd-7', workspaceId: 'ws-1', contactId: 'c-7', name: 'Monatstarif', contactName: 'Hannah Wagner', value: 199, currency: 'EUR', stage: 'lost', channel: 'instagram', createdAt: ago(2800), updatedAt: ago(2880) },
]

// ── 4 Tasks ───────────────────────────────────────────────────────────────────

const upcoming = (daysAhead: number, hour: number, minute = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  d.setHours(hour, minute, 0, 0)
  return d
}

export const mockTasks: MockTask[] = [
  { _id: 't-1', workspaceId: 'ws-1', contactId: 'c-7', title: 'Follow-up an Hannah Wagner (keine Antwort seit 48h)', contactName: 'Hannah Wagner', priority: 'high', status: 'todo', dueDate: upcoming(0, 17), createdAt: ago(120), updatedAt: ago(120) },
  { _id: 't-2', workspaceId: 'ws-1', contactId: 'c-9', title: 'Beschwerde von Sophie Klein klären', contactName: 'Sophie Klein', priority: 'high', status: 'todo', dueDate: upcoming(0, 12), createdAt: ago(20), updatedAt: ago(20) },
  { _id: 't-3', workspaceId: 'ws-1', contactId: 'c-6', title: 'Premium Spa Package für Yuki vorbereiten', contactName: 'Yuki Tanaka', priority: 'medium', status: 'in_progress', dueDate: upcoming(1, 15), createdAt: ago(60), updatedAt: ago(30) },
  { _id: 't-4', workspaceId: 'ws-1', contactId: 'c-12', title: 'Retreat-Info an Felix schicken', contactName: 'Felix Roth', priority: 'low', status: 'in_progress', dueDate: upcoming(3, 10), createdAt: ago(500), updatedAt: ago(400) },
]

// ── Messages (12 conversations, ~45 messages) ────────────────────────────────

export const mockMessages: MockMessage[] = [
  // c-1 Anna Müller — full sales cycle (6 messages, German)
  { _id: 'm-1', workspaceId: 'ws-1', contactId: 'c-1', channel: 'whatsapp', direction: 'inbound', content: 'Hallo! Ich habe euer Studio auf Instagram gesehen. Welche Kurse habt ihr?', aiGenerated: false, createdAt: ago(310) },
  { _id: 'm-2', workspaceId: 'ws-1', contactId: 'c-1', channel: 'whatsapp', direction: 'outbound', content: 'Hallo Anna! Willkommen bei Zenno Studio. Wir bieten Morning Flow, Yin Yoga, Massagen und Gesichtsbehandlungen. Wärst du an einer kostenlosen Probestunde interessiert?', aiGenerated: true, createdAt: ago(305) },
  { _id: 'm-3', workspaceId: 'ws-1', contactId: 'c-1', channel: 'whatsapp', direction: 'inbound', content: 'Klingt gut! Was kostet eine Mitgliedschaft?', aiGenerated: false, createdAt: ago(300) },
  { _id: 'm-4', workspaceId: 'ws-1', contactId: 'c-1', channel: 'whatsapp', direction: 'outbound', content: 'Unser Monatstarif ist 199€ — das sind etwa 6,60€ pro Tag für unbegrenzte Kurse. Wir legen Wert auf persönliche Betreuung und kleine Gruppen (max. 14 Teilnehmer). Möchtest du eine Probestunde buchen?', aiGenerated: true, createdAt: ago(298) },
  { _id: 'm-5', workspaceId: 'ws-1', contactId: 'c-1', channel: 'whatsapp', direction: 'inbound', content: 'Ehrlich gesagt ist mir das zu teuer...', aiGenerated: false, createdAt: ago(20) },
  { _id: 'm-6', workspaceId: 'ws-1', contactId: 'c-1', channel: 'whatsapp', direction: 'outbound', content: 'Ich verstehe das völlig, Anna. Die Probestunde ist komplett kostenlos — so kannst du erstmal sehen, ob es dir gefällt. Morgen um 9 Uhr hätten wir noch 5 Plätze frei. Soll ich dir einen reservieren?', aiGenerated: true, createdAt: ago(8) },

  // c-2 Stefan Weber — English, qualified (4 messages)
  { _id: 'm-7', workspaceId: 'ws-1', contactId: 'c-2', channel: 'whatsapp', direction: 'inbound', content: 'Hi, do you offer deep tissue massage?', aiGenerated: false, createdAt: ago(175) },
  { _id: 'm-8', workspaceId: 'ws-1', contactId: 'c-2', channel: 'whatsapp', direction: 'outbound', content: 'Hi Stefan! Yes, we offer deep tissue and sports massage with our therapist Niklas. Sessions are 60 or 90 minutes. Are you looking for a single session or a package?', aiGenerated: true, createdAt: ago(170) },
  { _id: 'm-9', workspaceId: 'ws-1', contactId: 'c-2', channel: 'whatsapp', direction: 'inbound', content: 'A package would be great. What are the options?', aiGenerated: false, createdAt: ago(28) },
  { _id: 'm-10', workspaceId: 'ws-1', contactId: 'c-2', channel: 'whatsapp', direction: 'outbound', content: 'We have a 6-session package at €360 (save €60 vs single sessions). Would you like to book a consultation first so Niklas can assess your needs? I have a slot Thursday at 2pm.', aiGenerated: true, createdAt: ago(25) },

  // c-3 Clara Schmidt — returning customer with memory (4 messages, German)
  { _id: 'm-11', workspaceId: 'ws-1', contactId: 'c-3', channel: 'whatsapp', direction: 'inbound', content: 'Hallo! Ich würde gerne wieder zu Yin Yoga kommen. Mara gibt die besten Stunden!', aiGenerated: false, createdAt: ago(70) },
  { _id: 'm-12', workspaceId: 'ws-1', contactId: 'c-3', channel: 'whatsapp', direction: 'outbound', content: 'Hallo Clara! Schön von dir zu hören. Mara unterrichtet dienstags und donnerstags um 18:30 Uhr. Da du schon seit 6 Monaten dabei bist und zwei Retreats besucht hast — möchtest du vom Monatstarif auf unseren Jahrestarif wechseln? Du sparst damit 28%.', aiGenerated: true, createdAt: ago(68) },
  { _id: 'm-13', workspaceId: 'ws-1', contactId: 'c-3', channel: 'whatsapp', direction: 'inbound', content: 'Oh, das ist interessant! Kannst du mir mehr dazu sagen?', aiGenerated: false, createdAt: ago(65) },
  { _id: 'm-14', workspaceId: 'ws-1', contactId: 'c-3', channel: 'whatsapp', direction: 'outbound', content: 'Der Jahrestarif ist 1.990€ — das sind 166€/Monat statt 199€. Du sparst über 400€ im Jahr und hast unbegrenzten Zugang zu allen Kursen, Workshops und 10% Rabatt auf Massagen. Soll ich dir ein Angebot schicken?', aiGenerated: true, createdAt: ago(60) },

  // c-4 Marco Bianchi — English, Messenger, inquiry (2 messages)
  { _id: 'm-15', workspaceId: 'ws-1', contactId: 'c-4', channel: 'messenger', direction: 'inbound', content: 'Hi! I saw your facial treatment post. Can you tell me more about it?', aiGenerated: false, createdAt: ago(40) },
  { _id: 'm-16', workspaceId: 'ws-1', contactId: 'c-4', channel: 'messenger', direction: 'outbound', content: 'Hi Marco! Happy to help. We offer three facial treatments: Signature Glow (60 min, €120), Deep Hydration (75 min, €150), and our Premium Anti-Age (90 min, €190). What skin concerns are you looking to address?', aiGenerated: true, createdAt: ago(12) },

  // c-5 Lena Fischer — negotiation, comparing with competitor (4 messages, German)
  { _id: 'm-17', workspaceId: 'ws-1', contactId: 'c-5', channel: 'whatsapp', direction: 'inbound', content: 'Hallo! Ich überlege, Mitglied zu werden. Ein anderes Studio in Mitte verlangt aber nur 159€ im Monat.', aiGenerated: false, createdAt: ago(155) },
  { _id: 'm-18', workspaceId: 'ws-1', contactId: 'c-5', channel: 'whatsapp', direction: 'outbound', content: 'Hallo Lena! Danke, dass du fragst. Unsere 199€ beinhalten unbegrenzte Kurse UND Massagen, während die meisten Studios nur Kurse anbieten. Außerdem haben wir max. 14 Teilnehmer pro Klasse — da kennst du deinen Trainer wirklich. Möchtest du eine Probestunde, um den Unterschied zu spüren?', aiGenerated: true, createdAt: ago(150) },
  { _id: 'm-19', workspaceId: 'ws-1', contactId: 'c-5', channel: 'whatsapp', direction: 'inbound', content: 'Hmm, aber 40€ mehr im Monat sind schon viel. Könnt ihr einen Rabatt geben?', aiGenerated: false, createdAt: ago(22) },
  { _id: 'm-20', workspaceId: 'ws-1', contactId: 'c-5', channel: 'whatsapp', direction: 'outbound', content: 'Ich kann dir unseren 10er-Karte anbieten — 380€ für 10 Kurse, flexibel einlösbar. Du hast also keine monatliche Bindung und zahlst nur, was du nutzt. Oder ich buche dir eine kostenlose Probestunde, damit du uns erstmal ausprobierst?', aiGenerated: true, createdAt: ago(18) },

  // c-6 Yuki Tanaka — VIP, deal won (4 messages, English)
  { _id: 'm-21', workspaceId: 'ws-1', contactId: 'c-6', channel: 'whatsapp', direction: 'inbound', content: 'Hi, I\'d like to book my usual premium spa package again.', aiGenerated: false, createdAt: ago(180) },
  { _id: 'm-22', workspaceId: 'ws-1', contactId: 'c-6', channel: 'whatsapp', direction: 'outbound', content: 'Hi Yuki! Of course — your Premium Spa Package with Lukas. I have Wednesday at 4pm available, same as your usual slot. Shall I book it?', aiGenerated: true, createdAt: ago(178) },
  { _id: 'm-23', workspaceId: 'ws-1', contactId: 'c-6', channel: 'whatsapp', direction: 'inbound', content: 'Perfect. Book it please.', aiGenerated: false, createdAt: ago(175) },
  { _id: 'm-24', workspaceId: 'ws-1', contactId: 'c-6', channel: 'whatsapp', direction: 'outbound', content: 'Booked for Wednesday at 4pm with Lukas. I\'ve sent a calendar invite to your email. See you then! ✨', aiGenerated: true, createdAt: ago(120) },

  // c-7 Hannah Wagner — stalled, only 1 message (inquiry, no reply 48h)
  { _id: 'm-25', workspaceId: 'ws-1', contactId: 'c-7', channel: 'instagram', direction: 'inbound', content: 'Hallo! Euer Studio sieht toll aus. Habt ihr noch Plätze für diese Woche frei?', aiGenerated: false, createdAt: ago(2885) },
  { _id: 'm-26', workspaceId: 'ws-1', contactId: 'c-7', channel: 'instagram', direction: 'outbound', content: 'Hallo Hannah! Danke für dein Interesse. Ja, wir haben diese Woche noch Plätze frei. Wann würdest du gern kommen — morgens oder abends?', aiGenerated: true, createdAt: ago(2880) },

  // c-8 Tom Becker — qualified, stalled 48h (3 messages then silence)
  { _id: 'm-27', workspaceId: 'ws-1', contactId: 'c-8', channel: 'whatsapp', direction: 'inbound', content: 'Hallo, ich interessiere mich für eine Massage. Was habt ihr im Angebot?', aiGenerated: false, createdAt: ago(610) },
  { _id: 'm-28', workspaceId: 'ws-1', contactId: 'c-8', channel: 'whatsapp', direction: 'outbound', content: 'Hallo Tom! Wir bieten klassische, Tiefengewebe- und Hot-Stone-Massagen an. Niklas und Mara sind unsere Therapeuten. Möchtest du eine Sitzung buchen oder erstmal beraten lassen?', aiGenerated: true, createdAt: ago(605) },
  { _id: 'm-29', workspaceId: 'ws-1', contactId: 'c-8', channel: 'whatsapp', direction: 'inbound', content: 'Tiefengewebe klingt gut. Was kostet das?', aiGenerated: false, createdAt: ago(590) },
  { _id: 'm-30', workspaceId: 'ws-1', contactId: 'c-8', channel: 'whatsapp', direction: 'outbound', content: 'Tiefengewebe-Massage: 60 Min für 89€ oder 90 Min für 129€. Ich kann dir einen Termin nächste Woche anbieten — Di oder Do um 16 Uhr. Passt das?', aiGenerated: true, createdAt: ago(2880) },

  // c-9 Sophie Klein — complaint escalation (3 messages, German)
  { _id: 'm-31', workspaceId: 'ws-1', contactId: 'c-9', channel: 'messenger', direction: 'inbound', content: 'Hallo, ich war gestern für eine Massage da und bin sehr unzufrieden. Die Behandlung war viel zu kurz und der Therapeut kam 15 Minuten zu spät.', aiGenerated: false, createdAt: ago(25) },
  { _id: 'm-32', workspaceId: 'ws-1', contactId: 'c-9', channel: 'messenger', direction: 'outbound', content: 'Es tut mir sehr leid, das zu hören, Sophie. Das entspricht nicht unserem Anspruch. Ich leite das sofort an unser Team weiter — jemand wird sich heute noch persönlich bei dir melden, um das in Ordnung zu bringen.', aiGenerated: true, createdAt: ago(22) },
  { _id: 'm-33', workspaceId: 'ws-1', contactId: 'c-9', channel: 'messenger', direction: 'inbound', content: 'Okay, danke. Ich erwarte eine Rückmeldung heute.', aiGenerated: false, createdAt: ago(20) },

  // c-10 David Chen — trial booked, confirmation (3 messages, English)
  { _id: 'm-34', workspaceId: 'ws-1', contactId: 'c-10', channel: 'whatsapp', direction: 'inbound', content: 'Hi! Are you offering facial trial sessions? I saw your story about the new treatments.', aiGenerated: false, createdAt: ago(85) },
  { _id: 'm-35', workspaceId: 'ws-1', contactId: 'c-10', channel: 'whatsapp', direction: 'outbound', content: 'Hi David! Yes — your first facial session is on us. We offer the Signature Glow trial (45 min) so you can experience the treatment. I have tomorrow at 10am available. Shall I book it?', aiGenerated: true, createdAt: ago(80) },
  { _id: 'm-36', workspaceId: 'ws-1', contactId: 'c-10', channel: 'whatsapp', direction: 'outbound', content: 'Booked for tomorrow (Saturday) at 10am with our aesthetician Mara. I\'ve sent the confirmation and address to your email. See you at the studio! 🌿', aiGenerated: true, createdAt: ago(35) },

  // c-11 Nadia Petrov — re-engaged by campaign (3 messages, German)
  { _id: 'm-37', workspaceId: 'ws-1', contactId: 'c-11', channel: 'whatsapp', direction: 'outbound', content: 'Hallo Nadia! Wir vermissen dich bei Zenno Studio. Du warst vor 3 Monaten bei uns — wir haben neue Morning Flow Zeiten und einen Frühbucher-Rabatt für dich. Möchtest du wieder vorbeikommen?', aiGenerated: false, createdAt: ago(200) },
  { _id: 'm-38', workspaceId: 'ws-1', contactId: 'c-11', channel: 'whatsapp', direction: 'inbound', content: 'Hallo! Ja, ich würde gerne wieder kommen. Wann habt ihr Plätze frei?', aiGenerated: false, createdAt: ago(185) },
  { _id: 'm-39', workspaceId: 'ws-1', contactId: 'c-11', channel: 'whatsapp', direction: 'outbound', content: 'Schön, dass du zurück bist, Nadia! Morgen um 7 Uhr hätten wir 4 Plätze frei im Morning Flow mit Niklas. Als Willkommen-zurück bekommst du die erste Woche gratis. Soll ich dich einbuchen?', aiGenerated: true, createdAt: ago(180) },

  // c-12 Felix Roth — reviewed, happy customer (3 messages, German)
  { _id: 'm-40', workspaceId: 'ws-1', contactId: 'c-12', channel: 'instagram', direction: 'inbound', content: 'Hallo! Ich habe gerade eine 5-Sterne-Bewertung auf Google hinterlassen. Wollte mich einfach bedanken für die tollen Stunden!', aiGenerated: false, createdAt: ago(520) },
  { _id: 'm-41', workspaceId: 'ws-1', contactId: 'c-12', channel: 'instagram', direction: 'outbound', content: 'Felix, das bedeutet uns unglaublich viel! Danke für die Bewertung und für dein Vertrauen. Falls du beim nächsten Retreat im Herbst dabei sein möchtest, kann ich dir die Early-Bird-Info schicken. Brauchst du sonst noch etwas?', aiGenerated: true, createdAt: ago(500) },
  { _id: 'm-42', workspaceId: 'ws-1', contactId: 'c-12', channel: 'instagram', direction: 'inbound', content: 'Ja gerne, schick mir die Infos zum Retreat! Danke für alles.', aiGenerated: false, createdAt: ago(490) },
  { _id: 'm-43', workspaceId: 'ws-1', contactId: 'c-12', channel: 'instagram', direction: 'outbound', content: 'Macht es! Ich lege die Retreat-Infos für dich bereit und markiere diesen Chat als erledigt. Bis bald, Felix! 🙏', aiGenerated: true, createdAt: ago(485) },
]

// ── Schedule Slots (7 weekly, German instructors) ─────────────────────────────

export const mockSchedule: MockScheduleSlot[] = [
  { _id: 's-1', workspaceId: 'ws-1', className: 'Morning Flow', dayOfWeek: 1, time: '07:00', durationMin: 60, capacity: 14, booked: 9, instructor: 'Niklas' },
  { _id: 's-2', workspaceId: 'ws-1', className: 'Morning Flow', dayOfWeek: 1, time: '09:00', durationMin: 60, capacity: 14, booked: 13, instructor: 'Niklas' },
  { _id: 's-3', workspaceId: 'ws-1', className: 'Morning Flow', dayOfWeek: 3, time: '07:00', durationMin: 60, capacity: 14, booked: 6, instructor: 'Mara' },
  { _id: 's-4', workspaceId: 'ws-1', className: 'Yin Yoga', dayOfWeek: 2, time: '18:30', durationMin: 75, capacity: 12, booked: 10, instructor: 'Mara' },
  { _id: 's-5', workspaceId: 'ws-1', className: 'Yin Yoga', dayOfWeek: 4, time: '18:30', durationMin: 75, capacity: 12, booked: 5, instructor: 'Lukas' },
  { _id: 's-6', workspaceId: 'ws-1', className: 'Weekend Workshop', dayOfWeek: 6, time: '10:00', durationMin: 120, capacity: 20, booked: 12, instructor: 'Mara' },
  { _id: 's-7', workspaceId: 'ws-1', className: 'Tiefengewebe-Massage', dayOfWeek: 5, time: '14:00', durationMin: 90, capacity: 4, booked: 2, instructor: 'Niklas' },
]

// ── 5 Appointments (showing Google Calendar sync) ────────────────────────────

export const mockAppointments: MockAppointment[] = [
  { _id: 'a-1', workspaceId: 'ws-1', contactId: 'c-1', contactName: 'Anna Müller', className: 'Morning Flow (Probestunde)', startsAt: upcoming(1, 9), durationMin: 60, channel: 'whatsapp', kind: 'trial', createdAt: ago(8) },
  { _id: 'a-2', workspaceId: 'ws-1', contactId: 'c-2', contactName: 'Stefan Weber', className: 'Massage Beratung', startsAt: upcoming(2, 14, 30), durationMin: 30, channel: 'whatsapp', kind: 'consult', createdAt: ago(25) },
  { _id: 'a-3', workspaceId: 'ws-1', contactId: 'c-10', contactName: 'David Chen', className: 'Signature Glow (Trial)', startsAt: upcoming(1, 10), durationMin: 45, channel: 'whatsapp', kind: 'trial', createdAt: ago(35) },
  { _id: 'a-4', workspaceId: 'ws-1', contactId: 'c-6', contactName: 'Yuki Tanaka', className: 'Premium Spa Package', startsAt: upcoming(2, 16), durationMin: 90, channel: 'whatsapp', kind: 'regular', createdAt: ago(120) },
  { _id: 'a-5', workspaceId: 'ws-1', contactId: 'c-3', contactName: 'Clara Schmidt', className: 'Yin Yoga', startsAt: upcoming(0, 18, 30), durationMin: 75, channel: 'whatsapp', kind: 'regular', createdAt: ago(60) },
]

// ── Comment Automations (2) ───────────────────────────────────────────────────

export const mockCommentAutomations: MockCommentAutomation[] = [
  {
    _id: 'ca-1',
    workspaceId: 'ws-1',
    keyword: 'PROBE',
    postLabel: 'Morning Flow Reel · Jul 14',
    openingDm: 'Hallo {{name}}! Hier ist unser kompletter Kursplan. Soll ich dir eine kostenlose Probestunde buchen?',
    status: 'active',
    stats: { commentsCaptured: 63, dmsSent: 58, booked: 14 },
    createdAt: ago(4320),
  },
  {
    _id: 'ca-2',
    workspaceId: 'ws-1',
    keyword: 'MASSAGE',
    postLabel: 'Massage Carousel · Jul 10',
    openingDm: 'Hallo {{name}}! Unsere Massagen sind beliebt — möchtest du die Verfügbarkeit sehen und einen Termin buchen?',
    status: 'active',
    stats: { commentsCaptured: 28, dmsSent: 26, booked: 7 },
    createdAt: ago(2880),
  },
]

// ── 3 AI-Driven Campaigns (German goals) ─────────────────────────────────────

export const mockCampaigns: MockCampaign[] = [
  {
    _id: 'camp-1',
    workspaceId: 'ws-1',
    name: 'Willkommen Neukunde',
    status: 'active',
    triggerStage: 'inquiry',
    goal: 'Begrüße den Neukunden herzlich, finde heraus was er sucht (Yoga, Massage oder Gesichtsbehandlung), und buche eine kostenlose Probestunde. Erwähne unsere kleinen Gruppen (max. 14 Teilnehmer) als Vorteil.',
    flow: [],
    createdAt: ago(10080),
    updatedAt: ago(1440),
  },
  {
    _id: 'camp-2',
    workspaceId: 'ws-1',
    name: 'Nach Probestunde',
    status: 'active',
    triggerStage: 'attended',
    goal: 'Bedanke dich für den Besuch, frage wie es war, und konvertiere zum bezahlten Monatstarif (199€). Biete die 10er-Karte (380€) als Alternative an. Behandle die Einwandrede "Ich muss überlegen" mit einem konkreten Grund, jetzt zu starten.',
    flow: [],
    createdAt: ago(5040),
    updatedAt: ago(720),
  },
  {
    _id: 'camp-3',
    workspaceId: 'ws-1',
    name: 'Reaktivierung',
    status: 'active',
    triggerStage: 'qualified',
    goal: 'Gewinne einen qualifizierten Lead zurück, der nicht geantwortet hat. Erinnere ihn, dass er interessiert war, biete einen konkreten Grund zur Rückkehr (neue Kurszeiten, limited Angebot, kostenlose Woche), und buche einen Termin.',
    flow: [],
    createdAt: ago(2880),
    updatedAt: ago(2880),
  },
]

// ── Mock Channel Connections (all connected) ──────────────────────────────────

export const mockChannelConnections = [
  { id: 'cc-1', workspaceId: 'ws-1', channel: 'whatsapp', credentials: { instanceName: 'zenno-studio', phoneNumber: '+49 30 12345678' }, instanceName: 'zenno-studio', status: 'connected', phoneNumber: '+49 30 12345678', warmupStartedAt: ago(10080), limits: { dailyCapBase: 20, dailyCapMax: 200, minDelaySeconds: 15 }, sentDate: null, sentToday: 0, lastSentAt: ago(8) },
  { id: 'cc-2', workspaceId: 'ws-1', channel: 'instagram', credentials: { pageAccessToken: 'mock-token', pageId: 'mock-page-id' }, instanceName: 'zenno-ig', status: 'connected', phoneNumber: null, warmupStartedAt: null, limits: { dailyCapBase: 20, dailyCapMax: 200, minDelaySeconds: 15 }, sentDate: null, sentToday: 0, lastSentAt: ago(12) },
  { id: 'cc-3', workspaceId: 'ws-1', channel: 'messenger', credentials: { pageAccessToken: 'mock-token', pageId: 'mock-page-id' }, instanceName: 'zenno-fb', status: 'connected', phoneNumber: null, warmupStartedAt: null, limits: { dailyCapBase: 20, dailyCapMax: 200, minDelaySeconds: 15 }, sentDate: null, sentToday: 0, lastSentAt: ago(20) },
  { id: 'cc-4', workspaceId: 'ws-1', channel: 'webchat', credentials: { embedKey: 'zenno-webchat-key-2026' }, instanceName: 'zenno-web', status: 'connected', phoneNumber: null, warmupStartedAt: null, limits: { dailyCapBase: 20, dailyCapMax: 200, minDelaySeconds: 15 }, sentDate: null, sentToday: 0, lastSentAt: ago(40) },
]

// Runtime mutable state (survives within a single server process)
let _agencies = [...mockAgencies]
let _contacts = [...mockContacts]
let _messages = [...mockMessages]
let _campaigns = [...mockCampaigns]
let _deals = [...mockDeals]
let _tasks = [...mockTasks]
let _schedule = [...mockSchedule]
let _appointments = [...mockAppointments]
let _commentAutomations = [...mockCommentAutomations]
let _channelConnections: Array<Record<string, any> & { id: string; workspaceId: string; channel: string }> = [...mockChannelConnections] as any

let _nextId = 1000
function uid() { return `mock-${++_nextId}` }

export const MockDB = {
  // Contacts
  getContacts: (workspaceId: string) => _contacts.filter(c => c.workspaceId === workspaceId),
  getContact: (id: string) => _contacts.find(c => c._id === id) ?? null,
  createContact: (data: Pick<MockContact, 'workspaceId' | 'externalId' | 'channel'> & Partial<MockContact>) => {
    const now = new Date()
    const contact: MockContact = {
      _id: uid(), workspaceId: data.workspaceId, externalId: data.externalId, channel: data.channel,
      name: data.name ?? null, phone: data.phone ?? null, lifecycleStage: data.lifecycleStage ?? 'inquiry',
      tags: data.tags ?? [], botActive: data.botActive ?? true, dnd: data.dnd ?? false,
      chatStatus: data.chatStatus ?? 'open', attentionRequired: data.attentionRequired ?? false,
      unread: data.unread ?? 0, notes: data.notes ?? '', memorySummary: data.memorySummary ?? '',
      memoryUpdatedAt: data.memoryUpdatedAt ?? null, createdAt: now, updatedAt: now,
    }
    _contacts = [..._contacts, contact]
    return contact
  },
  updateContact: (id: string, patch: Partial<Omit<MockContact, '_id' | 'workspaceId' | 'createdAt'>>) => {
    const existing = _contacts.find(c => c._id === id)
    if (!existing) return null
    const updated = { ...existing, ...patch, updatedAt: new Date() }
    _contacts = _contacts.map(c => (c._id === id ? updated : c))
    return updated
  },

  // Deals
  getDeals: (workspaceId: string) => _deals.filter(d => d.workspaceId === workspaceId),
  getDeal: (id: string) => _deals.find(d => d._id === id) ?? null,
  findOpenDealByContact: (contactId: string) =>
    _deals.find(d => d.contactId === contactId && !['won', 'lost'].includes(d.stage)) ?? null,
  createDeal: (data: Omit<MockDeal, '_id' | 'createdAt' | 'updatedAt'>) => {
    const deal: MockDeal = { ...data, _id: uid(), createdAt: new Date(), updatedAt: new Date() }
    _deals = [..._deals, deal]
    return deal
  },
  updateDeal: (id: string, patch: Partial<Omit<MockDeal, '_id' | 'workspaceId' | 'createdAt'>>) => {
    const existing = _deals.find(d => d._id === id)
    if (!existing) return null
    const updated = { ...existing, ...patch, updatedAt: new Date() }
    _deals = _deals.map(d => (d._id === id ? updated : d))
    return updated
  },
  deleteDeal: (id: string) => {
    const before = _deals.length
    _deals = _deals.filter(d => d._id !== id)
    return _deals.length < before
  },

  // Tasks
  getTasks: (workspaceId: string) => _tasks.filter(t => t.workspaceId === workspaceId),
  getTask: (id: string) => _tasks.find(t => t._id === id) ?? null,
  createTask: (data: Omit<MockTask, '_id' | 'createdAt' | 'updatedAt'>) => {
    const task: MockTask = { ...data, _id: uid(), createdAt: new Date(), updatedAt: new Date() }
    _tasks = [..._tasks, task]
    return task
  },
  updateTask: (id: string, patch: Partial<Omit<MockTask, '_id' | 'workspaceId' | 'createdAt'>>) => {
    const existing = _tasks.find(t => t._id === id)
    if (!existing) return null
    const updated = { ...existing, ...patch, updatedAt: new Date() }
    _tasks = _tasks.map(t => (t._id === id ? updated : t))
    return updated
  },
  deleteTask: (id: string) => {
    const before = _tasks.length
    _tasks = _tasks.filter(t => t._id !== id)
    return _tasks.length < before
  },

  // Messages
  getMessages: (contactId: string) => _messages.filter(m => m.contactId === contactId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
  getAllMessages: () => [..._messages],
  getLastMessage: (contactId: string) => {
    const msgs = _messages.filter(m => m.contactId === contactId)
    return msgs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
  },
  getInboundCount: (contactId: string) => _messages.filter(m => m.contactId === contactId && m.direction === 'inbound').length,
  addMessage: (msg: Omit<MockMessage, '_id' | 'createdAt'>) => {
    const newMsg = { ...msg, _id: uid(), createdAt: new Date() }
    _messages = [..._messages, newMsg]
    return newMsg
  },

  // Campaigns
  getCampaigns: (workspaceId: string) => _campaigns.filter(c => c.workspaceId === workspaceId),
  getCampaign: (id: string) => _campaigns.find(c => c._id === id) ?? null,
  createCampaign: (data: Omit<MockCampaign, '_id' | 'createdAt' | 'updatedAt'>) => {
    const c = { ...data, _id: uid(), createdAt: new Date(), updatedAt: new Date() }
    _campaigns = [..._campaigns, c]
    return c
  },
  updateCampaign: (id: string, patch: Partial<Omit<MockCampaign, '_id' | 'workspaceId' | 'createdAt'>>) => {
    const existing = _campaigns.find(c => c._id === id)
    if (!existing) return null
    const updated = { ...existing, ...patch, updatedAt: new Date() }
    _campaigns = _campaigns.map(c => (c._id === id ? updated : c))
    return updated
  },

  // Agencies
  getAgency: (id: string) => _agencies.find(a => a._id === id) ?? null,
  updateAgency: (id: string, patch: Partial<Omit<MockAgency, '_id' | 'createdAt'>>) => {
    const existing = _agencies.find(a => a._id === id)
    if (!existing) return null
    const updated = { ...existing, ...patch, updatedAt: new Date() }
    _agencies = _agencies.map(a => (a._id === id ? updated : a))
    return updated
  },
  createAgency: (data: Omit<MockAgency, '_id' | 'createdAt' | 'updatedAt'>) => {
    const a = { ...data, _id: `agency-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() }
    _agencies = [..._agencies, a]
    return a
  },

  // Workspaces
  getWorkspaces: (agencyId: string) => mockWorkspaces.filter(w => w.agencyId === agencyId),
  getWorkspace: (id: string) => mockWorkspaces.find(w => w._id === id) ?? null,

  // Schedule
  getSchedule: (workspaceId: string) => _schedule.filter(s => s.workspaceId === workspaceId),
  getScheduleSlot: (id: string) => _schedule.find(s => s._id === id) ?? null,
  incrementSlotBooking: (id: string) => {
    const slot = _schedule.find(s => s._id === id)
    if (!slot || slot.booked >= slot.capacity) return null
    const updated = { ...slot, booked: slot.booked + 1 }
    _schedule = _schedule.map(s => (s._id === id ? updated : s))
    return updated
  },

  // Appointments
  getAppointments: (workspaceId: string) => _appointments.filter(a => a.workspaceId === workspaceId),
  createAppointment: (data: Omit<MockAppointment, '_id' | 'createdAt'>) => {
    const appt: MockAppointment = { ...data, _id: uid(), createdAt: new Date() }
    _appointments = [..._appointments, appt]
    return appt
  },

  // Comment automations
  getCommentAutomations: (workspaceId: string) => _commentAutomations.filter(a => a.workspaceId === workspaceId),
  createCommentAutomation: (data: Omit<MockCommentAutomation, '_id' | 'createdAt' | 'stats'>) => {
    const automation: MockCommentAutomation = {
      ...data,
      _id: uid(),
      stats: { commentsCaptured: 0, dmsSent: 0, booked: 0 },
      createdAt: new Date(),
    }
    _commentAutomations = [..._commentAutomations, automation]
    return automation
  },
  updateCommentAutomation: (id: string, patch: Partial<Pick<MockCommentAutomation, 'keyword' | 'postLabel' | 'openingDm' | 'status'>>) => {
    const existing = _commentAutomations.find(a => a._id === id)
    if (!existing) return null
    const updated = { ...existing, ...patch }
    _commentAutomations = _commentAutomations.map(a => (a._id === id ? updated : a))
    return updated
  },

  // Channel connections
  getChannelConnection: (workspaceId: string, channel: string) => _channelConnections.find(c => c.workspaceId === workspaceId && c.channel === channel) ?? null,
  getChannelConnectionByInstance: (instanceName: string) => _channelConnections.find(c => c.instanceName === instanceName) ?? null,
  createChannelConnection: (data: Record<string, any>) => {
    const row = { id: uid(), credentials: {}, status: 'disconnected', ...data, workspaceId: String(data.workspaceId), channel: String(data.channel) }
    _channelConnections = [..._channelConnections, row]
    return row
  },
  updateChannelConnection: (id: string, patch: Record<string, any>) => {
    const existing = _channelConnections.find(c => c.id === id)
    if (!existing) return null
    const updated = { ...existing, ...patch }
    _channelConnections = _channelConnections.map(c => c.id === id ? updated : c)
    return updated
  },
  findChannelConnectionByEmbedKey: (key: string) => _channelConnections.find(c => c.credentials?.embedKey === key) ?? null,

  // AI config
  getSystemPrompt: (workspaceId: string) => _systemPrompts[workspaceId] ?? DEFAULT_MOCK_SYSTEM_PROMPT,
  setSystemPrompt: (workspaceId: string, prompt: string) => {
    _systemPrompts = { ..._systemPrompts, [workspaceId]: prompt }
  },
  getVoiceProfile: (workspaceId: string) => _voiceProfiles[workspaceId] ?? null,
  setVoiceProfile: (workspaceId: string, profile: string) => {
    _voiceProfiles = { ..._voiceProfiles, [workspaceId]: profile }
  },
  getGuardrails: (workspaceId: string): MockGuardrails =>
    _guardrails[workspaceId] ?? { alwaysEscalateTopics: [], maxDiscountPercent: null, businessHoursOnly: false },
  setGuardrails: (workspaceId: string, guardrails: MockGuardrails) => {
    _guardrails = { ..._guardrails, [workspaceId]: guardrails }
  },
}

export interface MockGuardrails {
  alwaysEscalateTopics: string[]
  maxDiscountPercent: number | null
  businessHoursOnly: boolean
}

let _guardrails: Record<string, MockGuardrails> = {
  'ws-1': { alwaysEscalateTopics: ['Beschwerde', 'Rückerstattung', 'medizinisch'], maxDiscountPercent: 10, businessHoursOnly: false },
}

let _voiceProfiles: Record<string, string> = {
  'ws-1': 'Schreibe in kurzen, natürlichen Sätzen (2-3 Sätze). Sei warm aber professionell. Verwende "du" als Anrede. Keine Emojis außer 🌿 gelegentlich. Beende Nachrichten mit einer klaren Frage oder einem konkreten Vorschlag. Schreibe auf Deutsch, außer der Kunde schreibt Englisch.',
}

const DEFAULT_MOCK_SYSTEM_PROMPT = `Du bist ein Senior Sales Agent für Zenno Studio Berlin — ein Premium Wellness- & Beauty-Studio in Mitte. Dein Ziel ist es, Gespräche in Buchungen und Umsatz zu verwandeln — nicht nur Fragen zu beantworten.

## Wie du verkaufst
1. **Schnell qualifizieren** — eine Frage gleichzeitig. Finde heraus: was wollen sie, wann, welches Budget, was hält sie ab.
2. **Wert vor Preis** — argumentiere mit Ergebnissen und Vorteilen (kleine Gruppen, persönliche Betreuung, erfahrene Therapeuten), BEVOR du einen Preis nennst.
3. **Einwände behandeln** — wenn jemand "zu teuer" sagt, ist das der Start des Verkaufs, nicht das Ende. Anerkennen → umdeuten → nächsten Schritt vorschlagen (Probestunde, Beratung, kleinere Option).
4. **Immer nächsten Schritt** — jede Antwort bewegt sich auf eine Buchung, Beratung oder Angebot zu. "Möchtest du, dass ich dir einen Platz reserviere?" statt "Melde dich einfach."
5. **Werkzeuge nutzen** — check_schedule vor Terminvorschlägen. book_appointment sobald sie zustimmen. create_deal wenn ein kostenpflichtiges Paket besprochen wird. flag_for_human bei Beschwerden.
6. **Tür offen lassen** — wenn es stockt, zusammenfassen was sie mochten, Wert wiederholen, klaren Weg zurück lassen.
7. **Menschlich klingen** — kurze Antworten (2-4 Sätze).匹配 ihre Sprache (Deutsch oder Englisch). Keine Roboter-Sign-offs.

## Was du nie tust
- Preise, Zeiten oder Richtlinien erfinden, die nicht in deinem Wissen oder deinen Werkzeugen stehen.
- Rabatte über 10% anbieten (Guardrail). Wenn mehr gefordert wird, an Mensch eskalieren.
- Nach einem Einwand aufgeben. Mindestens zwei Ansätze versuchen.
- Beschwerden, Rückerstattungen, medizinische Fragen selbst behandeln — immer eskalieren.

Antworte immer in der gleichen Sprache wie der Kunde. Standard: Deutsch.`

let _systemPrompts: Record<string, string> = {}
