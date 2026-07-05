// Seeds the production MongoDB with demo business data.
// Run: MONGODB_URI=mongodb://localhost:27017/agentapp node scripts/seed.mjs
import mongoose from 'mongoose'

const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/agentapp'
await mongoose.connect(uri)
const db = mongoose.connection.db

const ago = (minutes) => new Date(Date.now() - minutes * 60_000)
const upcoming = (daysAhead, hour, minute = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  d.setHours(hour, minute, 0, 0)
  return d
}

// Wipe demo collections (idempotent re-seed)
const collections = ['agencies', 'workspaces', 'contacts', 'messages', 'campaigns', 'deals', 'tasks', 'appointments', 'scheduleslots', 'commentautomations', 'workspaceaiconfigs']
for (const c of collections) {
  await db.collection(c).deleteMany({})
}

await db.collection('agencies').insertOne({
  name: 'Zen Studio Agency', slug: 'zen-studio', ownerId: 'user-1', brandColor: '#1A1714',
  credits: 450, plan: 'starter', createdAt: ago(10080), updatedAt: ago(10080),
})

await db.collection('workspaces').insertMany([
  { _id: 'ws-1', name: 'Lotus Yoga Bangkok', slug: 'lotus-yoga', agencyId: 'agency-1', createdAt: ago(5040), updatedAt: ago(5040) },
  { _id: 'ws-2', name: 'Serene Spa Sukhumvit', slug: 'serene-spa', agencyId: 'agency-1', createdAt: ago(2520), updatedAt: ago(2520) },
])
const ws1 = 'ws-1'

const contactDocs = [
  { workspaceId: ws1, externalId: '66812345678', channel: 'whatsapp', name: 'Mia Tanaka', phone: '+66812345678', instagramHandle: null, lifecycleStage: 'inquiry', tags: ['yoga', 'trial'], botActive: true, dnd: false, chatStatus: 'open', attentionRequired: false, unread: 2, notes: '', createdAt: ago(120), updatedAt: ago(5) },
  { workspaceId: ws1, externalId: '66823456789', channel: 'whatsapp', name: 'Lena Hoffmann', phone: '+66823456789', instagramHandle: null, lifecycleStage: 'qualified', tags: ['spa', 'vip'], botActive: true, dnd: false, chatStatus: 'open', attentionRequired: true, unread: 1, notes: 'Wants to start monthly unlimited this week.', createdAt: ago(200), updatedAt: ago(30) },
  { workspaceId: ws1, externalId: 'ig_sarahloves', channel: 'instagram', name: 'Sarah Chen', phone: null, instagramHandle: 'sarahloves', lifecycleStage: 'trial_booked', tags: ['inquiry'], botActive: false, dnd: false, chatStatus: 'open', attentionRequired: false, unread: 1, notes: '', createdAt: ago(480), updatedAt: ago(60) },
  { workspaceId: ws1, externalId: 'line_kk2024', channel: 'line', name: 'Koko Watanabe', phone: null, instagramHandle: null, lifecycleStage: 'attended', tags: ['lead'], botActive: false, dnd: false, chatStatus: 'closed', attentionRequired: false, unread: 0, notes: 'Prefers Thai language.', createdAt: ago(1440), updatedAt: ago(240) },
  { workspaceId: ws1, externalId: '66834567890', channel: 'whatsapp', name: 'Priya Nair', phone: '+66834567890', instagramHandle: null, lifecycleStage: 'rebooked', tags: ['retreat'], botActive: true, dnd: true, chatStatus: 'closed', attentionRequired: false, unread: 0, notes: 'Attended March retreat.', createdAt: ago(2880), updatedAt: ago(480) },
]
const cResult = await db.collection('contacts').insertMany(contactDocs)
const cid = (i) => cResult.insertedIds[i].toString()

await db.collection('messages').insertMany([
  { workspaceId: ws1, contactId: cid(0), channel: 'whatsapp', direction: 'inbound', content: 'Hi! I saw your yoga studio on Instagram. What classes do you have?', aiGenerated: false, createdAt: ago(125) },
  { workspaceId: ws1, contactId: cid(0), channel: 'whatsapp', direction: 'outbound', content: 'Hi Mia! Welcome to Lotus Yoga. We have morning flows, evening yin, and weekend workshops. Would you like to book a free trial class?', aiGenerated: true, createdAt: ago(124) },
  { workspaceId: ws1, contactId: cid(0), channel: 'whatsapp', direction: 'inbound', content: 'That sounds amazing! What time is the morning flow?', aiGenerated: false, createdAt: ago(10) },
  { workspaceId: ws1, contactId: cid(1), channel: 'whatsapp', direction: 'inbound', content: 'Do you offer monthly memberships?', aiGenerated: false, createdAt: ago(205) },
  { workspaceId: ws1, contactId: cid(1), channel: 'whatsapp', direction: 'outbound', content: 'Yes! Our monthly unlimited is 2,500 THB. We also have a 10-class pack at 1,800 THB. Which suits you better?', aiGenerated: true, createdAt: ago(204) },
  { workspaceId: ws1, contactId: cid(1), channel: 'whatsapp', direction: 'inbound', content: 'The monthly unlimited sounds good. Can I start this week?', aiGenerated: false, createdAt: ago(35) },
  { workspaceId: ws1, contactId: cid(2), channel: 'instagram', direction: 'inbound', content: 'Your studio looks so peaceful. I want to join!', aiGenerated: false, createdAt: ago(485) },
  { workspaceId: ws1, contactId: cid(2), channel: 'instagram', direction: 'outbound', content: "Thank you Sarah! I've reserved a spot for you in tomorrow's 9am trial class. Shall I confirm?", aiGenerated: true, createdAt: ago(483) },
  { workspaceId: ws1, contactId: cid(3), channel: 'line', direction: 'inbound', content: 'สวัสดีค่ะ อยากถามเรื่องคลาสโยคะค่ะ', aiGenerated: false, createdAt: ago(1450) },
  { workspaceId: ws1, contactId: cid(3), channel: 'line', direction: 'outbound', content: 'สวัสดีค่ะ Koko! ยินดีต้อนรับสู่ Lotus Yoga นะคะ', aiGenerated: true, createdAt: ago(1448) },
])

await db.collection('scheduleslots').insertMany([
  { workspaceId: ws1, className: 'Morning Flow', dayOfWeek: 1, time: '07:00', durationMin: 60, capacity: 14, booked: 9, instructor: 'Nok' },
  { workspaceId: ws1, className: 'Morning Flow', dayOfWeek: 1, time: '09:00', durationMin: 60, capacity: 14, booked: 13, instructor: 'Nok' },
  { workspaceId: ws1, className: 'Morning Flow', dayOfWeek: 3, time: '07:00', durationMin: 60, capacity: 14, booked: 6, instructor: 'Ploy' },
  { workspaceId: ws1, className: 'Morning Flow', dayOfWeek: 5, time: '09:00', durationMin: 60, capacity: 14, booked: 8, instructor: 'Nok' },
  { workspaceId: ws1, className: 'Evening Yin', dayOfWeek: 2, time: '18:30', durationMin: 75, capacity: 12, booked: 10, instructor: 'Ploy' },
  { workspaceId: ws1, className: 'Evening Yin', dayOfWeek: 4, time: '18:30', durationMin: 75, capacity: 12, booked: 5, instructor: 'Mali' },
  { workspaceId: ws1, className: 'Weekend Workshop', dayOfWeek: 6, time: '10:00', durationMin: 120, capacity: 20, booked: 12, instructor: 'Mali' },
])

await db.collection('appointments').insertMany([
  { workspaceId: ws1, contactId: cid(2), contactName: 'Sarah Chen', className: 'Morning Flow (Trial)', startsAt: upcoming(1, 9), durationMin: 60, channel: 'instagram', kind: 'trial', createdAt: ago(480) },
  { workspaceId: ws1, contactId: cid(1), contactName: 'Lena Hoffmann', className: 'Membership Consult', startsAt: upcoming(2, 14, 30), durationMin: 30, channel: 'whatsapp', kind: 'consult', createdAt: ago(200) },
])

await db.collection('deals').insertMany([
  { workspaceId: ws1, contactId: cid(0), name: 'Yoga Package 10x', contactName: 'Mia Tanaka', value: 4500, currency: 'THB', stage: 'lead', channel: 'whatsapp', createdAt: ago(100), updatedAt: ago(100) },
  { workspaceId: ws1, contactId: cid(1), name: 'Private Coaching', contactName: 'Lena Hoffmann', value: 18000, currency: 'THB', stage: 'lead', channel: 'whatsapp', createdAt: ago(400), updatedAt: ago(400) },
  { workspaceId: ws1, contactId: cid(2), name: 'Annual Plan', contactName: 'Sarah Chen', value: 28800, currency: 'THB', stage: 'qualified', channel: 'whatsapp', createdAt: ago(600), updatedAt: ago(600) },
  { workspaceId: ws1, contactId: null, name: 'Corporate Wellness', contactName: 'Tom Reeves', value: 45000, currency: 'THB', stage: 'qualified', channel: 'whatsapp', createdAt: ago(700), updatedAt: ago(700) },
])

await db.collection('tasks').insertMany([
  { workspaceId: ws1, contactId: cid(1), title: 'Confirm monthly membership payment', contactName: 'Lena Hoffmann', priority: 'high', status: 'todo', dueDate: upcoming(1, 12), createdAt: ago(30), updatedAt: ago(30) },
  { workspaceId: ws1, contactId: cid(2), title: 'Prepare trial class welcome pack', contactName: 'Sarah Chen', priority: 'medium', status: 'todo', dueDate: upcoming(2, 12), createdAt: ago(60), updatedAt: ago(60) },
  { workspaceId: ws1, contactId: cid(0), title: 'Follow up on morning flow question', contactName: 'Mia Tanaka', priority: 'low', status: 'in_progress', dueDate: upcoming(1, 9), createdAt: ago(120), updatedAt: ago(15) },
])

await db.collection('commentautomations').insertMany([
  { workspaceId: ws1, keyword: 'CLASS', postLabel: 'Morning Flow reel · Jun 28', openingDm: "Hi {{name}}! Here's our full class schedule. Want me to book you a free trial?", status: 'active', stats: { commentsCaptured: 47, dmsSent: 44, booked: 9 }, createdAt: ago(8640) },
  { workspaceId: ws1, keyword: 'RETREAT', postLabel: 'Weekend retreat carousel · Jun 30', openingDm: 'Hi {{name}}! The next retreat is coming up — want the details and early-bird pricing?', status: 'paused', stats: { commentsCaptured: 12, dmsSent: 12, booked: 2 }, createdAt: ago(5760) },
])

await db.collection('workspaceaiconfigs').insertOne({
  workspaceId: ws1,
  systemPrompt: `You are a warm and knowledgeable assistant for Lotus Yoga Bangkok. Help potential and existing students with class schedules, pricing, bookings, and general questions.

Always be friendly, concise, and encouraging. Keep replies to 2-4 sentences. When someone seems interested, offer to book a free trial class. Respond in the same language the customer uses.

Key information:
- Classes: Morning Flow (7am, 9am), Evening Yin (6:30pm), Weekend Workshop (Sat 10am)
- Pricing: Drop-in 450 THB, 10-class pack 1,800 THB, Monthly unlimited 2,500 THB
- Free trial class for first-time visitors
- Location: Sukhumvit Soi 23, Bangkok`,
  createdAt: new Date(), updatedAt: new Date(),
})

console.log('Seeded workspace ws-1 with demo business data.')
await mongoose.disconnect()
