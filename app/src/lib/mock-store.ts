import type { Types } from 'mongoose'

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
  dayOfWeek: number // 0 = Sunday … 6 = Saturday
  time: string // '07:00'
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

const now = new Date()
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000)

export const mockAgencies: MockAgency[] = [
  {
    _id: 'agency-1',
    name: 'Zen Studio Agency',
    slug: 'zen-studio',
    ownerId: 'user-1',
    brandColor: '#1A1714',
    credits: 450,
    plan: 'starter',
    createdAt: ago(10080),
  },
]

export const mockWorkspaces: MockWorkspace[] = [
  { _id: 'ws-1', name: 'Lotus Yoga Bangkok', slug: 'lotus-yoga', agencyId: 'agency-1', createdAt: ago(5040) },
  { _id: 'ws-2', name: 'Serene Spa Sukhumvit', slug: 'serene-spa', agencyId: 'agency-1', createdAt: ago(2520) },
]

export const mockContacts: MockContact[] = [
  { _id: 'c-1', workspaceId: 'ws-1', externalId: '66812345678', channel: 'whatsapp', name: 'Mia Tanaka', phone: '+66812345678', lifecycleStage: 'inquiry', tags: ['yoga', 'trial'], botActive: true, dnd: false, chatStatus: 'open', attentionRequired: false, unread: 2, notes: '', memorySummary: 'First-time inquiry via Instagram. Interested in morning classes. Asked about 7am vs 9am. Considering a trial.', memoryUpdatedAt: ago(5), createdAt: ago(120), updatedAt: ago(5) },
  { _id: 'c-2', workspaceId: 'ws-1', externalId: '66823456789', channel: 'whatsapp', name: 'Lena Hoffmann', phone: '+66823456789', lifecycleStage: 'qualified', tags: ['spa', 'vip'], botActive: true, dnd: false, chatStatus: 'open', attentionRequired: true, unread: 1, notes: 'Wants to start monthly unlimited this week — needs human confirmation for payment.', memorySummary: 'Returning interest in monthly unlimited (2,500 THB). Compared against 10-class pack. Wants to start this week. Payment needs human.', memoryUpdatedAt: ago(30), createdAt: ago(200), updatedAt: ago(30) },
  { _id: 'c-3', workspaceId: 'ws-1', externalId: 'ig_sarahloves', channel: 'instagram', name: 'Sarah Chen', phone: null, lifecycleStage: 'trial_booked', tags: ['inquiry'], botActive: false, dnd: false, chatStatus: 'open', attentionRequired: false, unread: 1, notes: '', memorySummary: 'Booked a 9am trial class. Enthusiastic tone. Bot paused (human took over).', memoryUpdatedAt: ago(60), createdAt: ago(480), updatedAt: ago(60) },
  { _id: 'c-4', workspaceId: 'ws-1', externalId: 'line_kk2024', channel: 'line', name: 'Koko Watanabe', phone: null, lifecycleStage: 'attended', tags: ['lead'], botActive: false, dnd: false, chatStatus: 'closed', attentionRequired: false, unread: 0, notes: 'Prefers Thai language.', memorySummary: 'Attended a class. Prefers Thai. Chat closed — re-engagement candidate.', memoryUpdatedAt: ago(240), createdAt: ago(1440), updatedAt: ago(240) },
  { _id: 'c-5', workspaceId: 'ws-1', externalId: '66834567890', channel: 'whatsapp', name: 'Priya Nair', phone: '+66834567890', lifecycleStage: 'rebooked', tags: ['retreat'], botActive: true, dnd: true, chatStatus: 'closed', attentionRequired: false, unread: 0, notes: 'Attended March retreat. Early-bird for next one.', memorySummary: 'Past retreat attendee. Offered early-bird for next retreat (4,200 THB). On DND.', memoryUpdatedAt: ago(480), createdAt: ago(2880), updatedAt: ago(480) },
  { _id: 'c-6', workspaceId: 'ws-2', externalId: '66845678901', channel: 'whatsapp', name: 'Emma Williams', phone: '+66845678901', lifecycleStage: 'vip', tags: ['vip'], botActive: true, dnd: false, chatStatus: 'open', attentionRequired: false, unread: 0, notes: '', memorySummary: 'VIP customer. No open objections.', memoryUpdatedAt: null, createdAt: ago(4320), updatedAt: ago(720) },
]

export const mockDeals: MockDeal[] = [
  { _id: 'd-1', workspaceId: 'ws-1', contactId: 'c-1', name: 'Yoga Package 10x', contactName: 'Mia Tanaka', value: 4500, currency: 'THB', stage: 'lead', channel: 'whatsapp', createdAt: ago(100), updatedAt: ago(100) },
  { _id: 'd-2', workspaceId: 'ws-1', contactId: null, name: 'Monthly Membership', contactName: 'Sara Bloom', value: 2900, currency: 'THB', stage: 'lead', channel: 'instagram', createdAt: ago(300), updatedAt: ago(300) },
  { _id: 'd-3', workspaceId: 'ws-1', contactId: 'c-2', name: 'Private Coaching', contactName: 'Lena Hoffmann', value: 18000, currency: 'THB', stage: 'lead', channel: 'whatsapp', createdAt: ago(400), updatedAt: ago(400) },
  { _id: 'd-4', workspaceId: 'ws-1', contactId: null, name: 'Drop-in Pass x5', contactName: 'James Wu', value: 1500, currency: 'THB', stage: 'lead', channel: 'instagram', createdAt: ago(500), updatedAt: ago(500) },
  { _id: 'd-5', workspaceId: 'ws-1', contactId: 'c-3', name: 'Annual Plan', contactName: 'Sarah Chen', value: 28800, currency: 'THB', stage: 'qualified', channel: 'whatsapp', createdAt: ago(600), updatedAt: ago(600) },
  { _id: 'd-6', workspaceId: 'ws-1', contactId: null, name: 'Corporate Wellness', contactName: 'Tom Reeves', value: 45000, currency: 'THB', stage: 'qualified', channel: 'whatsapp', createdAt: ago(700), updatedAt: ago(700) },
  { _id: 'd-7', workspaceId: 'ws-1', contactId: null, name: 'Retreat Package', contactName: 'Nadia Park', value: 12000, currency: 'THB', stage: 'qualified', channel: 'instagram', createdAt: ago(800), updatedAt: ago(800) },
]

export const mockTasks: MockTask[] = [
  { _id: 't-1', workspaceId: 'ws-1', contactId: 'c-2', title: 'Confirm monthly membership payment', contactName: 'Lena Hoffmann', priority: 'high', status: 'todo', dueDate: ago(-1440), createdAt: ago(30), updatedAt: ago(30) },
  { _id: 't-2', workspaceId: 'ws-1', contactId: 'c-3', title: 'Prepare trial class welcome pack', contactName: 'Sarah Chen', priority: 'medium', status: 'todo', dueDate: ago(-2880), createdAt: ago(60), updatedAt: ago(60) },
  { _id: 't-3', workspaceId: 'ws-1', contactId: 'c-1', title: 'Follow up on morning flow question', contactName: 'Mia Tanaka', priority: 'low', status: 'in_progress', dueDate: ago(-720), createdAt: ago(120), updatedAt: ago(15) },
  { _id: 't-4', workspaceId: 'ws-1', contactId: 'c-5', title: 'Send retreat early-bird offer', contactName: 'Priya Nair', priority: 'medium', status: 'in_progress', dueDate: ago(-4320), createdAt: ago(480), updatedAt: ago(200) },
]

export const mockMessages: MockMessage[] = [
  // c-1 Mia
  { _id: 'm-1', workspaceId: 'ws-1', contactId: 'c-1', channel: 'whatsapp', direction: 'inbound', content: 'Hi! I saw your yoga studio on Instagram. What classes do you have?', aiGenerated: false, createdAt: ago(125) },
  { _id: 'm-2', workspaceId: 'ws-1', contactId: 'c-1', channel: 'whatsapp', direction: 'outbound', content: "Hi Mia! Welcome to Lotus Yoga. We have morning flows, evening yin, and weekend workshops. Would you like to book a free trial class?", aiGenerated: true, createdAt: ago(124) },
  { _id: 'm-3', workspaceId: 'ws-1', contactId: 'c-1', channel: 'whatsapp', direction: 'inbound', content: 'That sounds amazing! What time is the morning flow?', aiGenerated: false, createdAt: ago(10) },
  { _id: 'm-4', workspaceId: 'ws-1', contactId: 'c-1', channel: 'whatsapp', direction: 'outbound', content: 'Morning flow is at 7am and 9am daily. The 7am slot is usually quieter if you prefer a more intimate setting!', aiGenerated: true, createdAt: ago(5) },
  // c-2 Lena
  { _id: 'm-5', workspaceId: 'ws-1', contactId: 'c-2', channel: 'whatsapp', direction: 'inbound', content: 'Do you offer monthly memberships?', aiGenerated: false, createdAt: ago(205) },
  { _id: 'm-6', workspaceId: 'ws-1', contactId: 'c-2', channel: 'whatsapp', direction: 'outbound', content: 'Yes! Our monthly unlimited is 2,500 THB. We also have a 10-class pack at 1,800 THB. Which suits you better?', aiGenerated: true, createdAt: ago(204) },
  { _id: 'm-7', workspaceId: 'ws-1', contactId: 'c-2', channel: 'whatsapp', direction: 'inbound', content: 'The monthly unlimited sounds good. Can I start this week?', aiGenerated: false, createdAt: ago(35) },
  // c-3 Sarah
  { _id: 'm-8', workspaceId: 'ws-1', contactId: 'c-3', channel: 'instagram', direction: 'inbound', content: 'Your studio looks so peaceful ✨ I want to join!', aiGenerated: false, createdAt: ago(485) },
  { _id: 'm-9', workspaceId: 'ws-1', contactId: 'c-3', channel: 'instagram', direction: 'outbound', content: "Thank you Sarah! We'd love to have you. I've reserved a spot for you in tomorrow's 9am trial class. Shall I confirm?", aiGenerated: true, createdAt: ago(483) },
  { _id: 'm-10', workspaceId: 'ws-1', contactId: 'c-3', channel: 'instagram', direction: 'inbound', content: 'Yes please! See you tomorrow 🙏', aiGenerated: false, createdAt: ago(65) },
  // c-4 Koko
  { _id: 'm-11', workspaceId: 'ws-1', contactId: 'c-4', channel: 'line', direction: 'inbound', content: 'สวัสดีค่ะ อยากถามเรื่องคลาสโยคะค่ะ', aiGenerated: false, createdAt: ago(1450) },
  { _id: 'm-12', workspaceId: 'ws-1', contactId: 'c-4', channel: 'line', direction: 'outbound', content: 'สวัสดีค่ะ Koko! ยินดีต้อนรับสู่ Lotus Yoga นะคะ มีคลาสหลากหลายให้เลือกเลยค่ะ', aiGenerated: true, createdAt: ago(1448) },
  // c-5 Priya
  { _id: 'm-13', workspaceId: 'ws-1', contactId: 'c-5', channel: 'whatsapp', direction: 'inbound', content: 'I loved the retreat last month! When is the next one?', aiGenerated: false, createdAt: ago(490) },
  { _id: 'm-14', workspaceId: 'ws-1', contactId: 'c-5', channel: 'whatsapp', direction: 'outbound', content: "So happy you loved it Priya! Our next weekend retreat is March 15-16. As a returning guest you get early bird pricing — just 4,200 THB!", aiGenerated: true, createdAt: ago(488) },
]

export const mockSchedule: MockScheduleSlot[] = [
  { _id: 's-1', workspaceId: 'ws-1', className: 'Morning Flow', dayOfWeek: 1, time: '07:00', durationMin: 60, capacity: 14, booked: 9, instructor: 'Nok' },
  { _id: 's-2', workspaceId: 'ws-1', className: 'Morning Flow', dayOfWeek: 1, time: '09:00', durationMin: 60, capacity: 14, booked: 13, instructor: 'Nok' },
  { _id: 's-3', workspaceId: 'ws-1', className: 'Morning Flow', dayOfWeek: 3, time: '07:00', durationMin: 60, capacity: 14, booked: 6, instructor: 'Ploy' },
  { _id: 's-4', workspaceId: 'ws-1', className: 'Morning Flow', dayOfWeek: 5, time: '09:00', durationMin: 60, capacity: 14, booked: 8, instructor: 'Nok' },
  { _id: 's-5', workspaceId: 'ws-1', className: 'Evening Yin', dayOfWeek: 2, time: '18:30', durationMin: 75, capacity: 12, booked: 10, instructor: 'Ploy' },
  { _id: 's-6', workspaceId: 'ws-1', className: 'Evening Yin', dayOfWeek: 4, time: '18:30', durationMin: 75, capacity: 12, booked: 5, instructor: 'Mali' },
  { _id: 's-7', workspaceId: 'ws-1', className: 'Weekend Workshop', dayOfWeek: 6, time: '10:00', durationMin: 120, capacity: 20, booked: 12, instructor: 'Mali' },
]

const upcoming = (daysAhead: number, hour: number, minute = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  d.setHours(hour, minute, 0, 0)
  return d
}

export const mockAppointments: MockAppointment[] = [
  { _id: 'a-1', workspaceId: 'ws-1', contactId: 'c-3', contactName: 'Sarah Chen', className: 'Morning Flow (Trial)', startsAt: upcoming(1, 9), durationMin: 60, channel: 'instagram', kind: 'trial', createdAt: ago(480) },
  { _id: 'a-2', workspaceId: 'ws-1', contactId: 'c-2', contactName: 'Lena Hoffmann', className: 'Membership Consult', startsAt: upcoming(2, 14, 30), durationMin: 30, channel: 'whatsapp', kind: 'consult', createdAt: ago(200) },
]

export const mockCommentAutomations: MockCommentAutomation[] = [
  {
    _id: 'ca-1',
    workspaceId: 'ws-1',
    keyword: 'CLASS',
    postLabel: 'Morning Flow reel · Jun 28',
    openingDm: "Hi {{name}}! Here's our full class schedule. Want me to book you a free trial?",
    status: 'active',
    stats: { commentsCaptured: 47, dmsSent: 44, booked: 9 },
    createdAt: ago(8640),
  },
  {
    _id: 'ca-2',
    workspaceId: 'ws-1',
    keyword: 'RETREAT',
    postLabel: 'Weekend retreat carousel · Jun 30',
    openingDm: 'Hi {{name}}! The next retreat is coming up — want the details and early-bird pricing?',
    status: 'paused',
    stats: { commentsCaptured: 12, dmsSent: 12, booked: 2 },
    createdAt: ago(5760),
  },
]

export const mockCampaigns: MockCampaign[] = [
  {
    _id: 'camp-1',
    workspaceId: 'ws-1',
    name: 'New Inquiry Welcome',
    status: 'active',
    triggerStage: 'inquiry',
    goal: 'Welcome the lead, find out what they want, and book them into a free trial class this week. Offer the most relevant class based on what they say.',
    flow: [],
    createdAt: ago(10080),
    updatedAt: ago(1440),
  },
  {
    _id: 'camp-2',
    workspaceId: 'ws-1',
    name: 'Post Trial Follow-up',
    status: 'active',
    triggerStage: 'attended',
    goal: 'Thank them for coming, ask how it went, then convert them to a paid membership with a first-month offer (unlimited 1,999 THB). Handle the "I need to think about it" objection.',
    flow: [],
    createdAt: ago(5040),
    updatedAt: ago(720),
  },
  {
    _id: 'camp-3',
    workspaceId: 'ws-1',
    name: 'Re-engagement',
    status: 'draft',
    triggerStage: 'qualified',
    goal: 'Win back a qualified lead who went quiet. Acknowledge they were interested, offer a concrete reason to return (a new class, a limited offer, or a consult), and book them in.',
    flow: [],
    createdAt: ago(2880),
    updatedAt: ago(2880),
  },
]

// Runtime mutable state (survives within a single server process)
let _contacts = [...mockContacts]
let _messages = [...mockMessages]
let _campaigns = [...mockCampaigns]
let _deals = [...mockDeals]
let _tasks = [...mockTasks]
let _schedule = [...mockSchedule]
let _appointments = [...mockAppointments]
let _commentAutomations = [...mockCommentAutomations]

let _nextId = 1000
function uid() { return `mock-${++_nextId}` }

export const MockDB = {
  // Contacts
  getContacts: (workspaceId: string) => _contacts.filter(c => c.workspaceId === workspaceId),
  getContact: (id: string) => _contacts.find(c => c._id === id) ?? null,
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
  getAgency: (id: string) => mockAgencies.find(a => a._id === id) ?? null,

  // Workspaces
  getWorkspaces: (agencyId: string) => mockWorkspaces.filter(w => w.agencyId === agencyId),

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

  // AI config
  getSystemPrompt: (workspaceId: string) => _systemPrompts[workspaceId] ?? DEFAULT_MOCK_SYSTEM_PROMPT,
  setSystemPrompt: (workspaceId: string, prompt: string) => {
    _systemPrompts = { ..._systemPrompts, [workspaceId]: prompt }
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

let _guardrails: Record<string, MockGuardrails> = {}

const DEFAULT_MOCK_SYSTEM_PROMPT = `You are a senior sales agent for Lotus Yoga Bangkok. Your job is to turn conversations into bookings and memberships — not just answer questions.

Qualify fast (one question at a time), build value before price, handle objections by reframing and proposing a next step, and always move toward a booking. Use your tools: check the schedule, book the moment they agree, create a deal when they evaluate a paid package, escalate refunds/complaints/medical to a human. Keep replies to 2–4 sentences, sound human, match their language, and never give up after one objection.

Key knowledge:
- Classes: Morning Flow (7am, 9am), Evening Yin (6:30pm), Weekend Workshop (Sat 10am)
- Pricing: Drop-in 450 THB, 10-class pack 1,800 THB, Monthly unlimited 2,500 THB
- Free trial class available for first-time visitors — lead with this for new inquiries
- Location: Sukhumvit Soi 23, Bangkok`

let _systemPrompts: Record<string, string> = {}
