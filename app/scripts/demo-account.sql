-- ============================================================================
-- Zenno demo account seed
-- ============================================================================
-- Creates a fully populated demo login to show customers:
--
--   Email:    demo@zennohq.studio
--   Password: ZennoDemo2026!
--
-- The demo business is "Glow Studio Berlin", a beauty & wellness studio with
-- contacts across WhatsApp / Instagram / web chat, live conversations,
-- appointments, deals, tasks, a class schedule, campaigns and AI config.
--
-- Run in the Supabase SQL editor (as postgres). Safe to re-run: it wipes and
-- recreates only this demo account (ids prefixed "demo-").
-- No real channels are connected except web chat, so the demo can never
-- message real people.
-- ============================================================================

set search_path = public, extensions;

-- ── Wipe any previous demo data ─────────────────────────────────────────────
delete from public.agencies where id = 'demo-agency';           -- cascades to workspace + content
delete from public.users where email = 'demo@zennohq.studio';
delete from auth.users where email = 'demo@zennohq.studio';     -- cascades to identities

-- ── Auth user (Supabase Auth login) ─────────────────────────────────────────
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current
) values (
  '00000000-0000-0000-0000-000000000000',
  'de300000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated',
  'demo@zennohq.studio',
  crypt('ZennoDemo2026!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Demo Owner","business_name":"Glow Studio Berlin"}'::jsonb,
  now(), now(), '', '', '', '', ''
);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  gen_random_uuid(),
  'de300000-0000-4000-8000-000000000001',
  'de300000-0000-4000-8000-000000000001',
  '{"sub":"de300000-0000-4000-8000-000000000001","email":"demo@zennohq.studio","email_verified":true}'::jsonb,
  'email', now(), now(), now()
);

-- ── Agency, app user, workspace ─────────────────────────────────────────────
insert into public.agencies (id, name, slug, owner_id, credits, plan, brand_color)
values ('demo-agency', 'Glow Studio Berlin', 'demo-glow-studio', 'de300000-0000-4000-8000-000000000001', 350, 'pro', '#B76E79');

insert into public.users (id, auth_user_id, email, password_hash, name, role, agency_id)
values ('demo-user-1', 'de300000-0000-4000-8000-000000000001', 'demo@zennohq.studio', '', 'Demo Owner', 'owner', 'demo-agency');

insert into public.workspaces (id, name, slug, agency_id, timezone, currency, business_hours)
values ('demo-ws-1', 'Glow Studio Berlin', 'demo-glow-studio', 'demo-agency', 'Europe/Berlin', 'EUR',
        '{"days":[1,2,3,4,5,6],"start":"10:00","end":"19:00"}'::jsonb);

-- ── AI configuration ────────────────────────────────────────────────────────
insert into public.workspace_ai_configs (workspace_id, system_prompt, knowledge_summary, guardrails)
values ('demo-ws-1',
'You are Mia, the friendly booking assistant for Glow Studio Berlin — a premium beauty & wellness studio in Berlin-Mitte. Your goal is to turn conversations into bookings. Be warm, concise and specific. Always suggest a concrete next step. Match the customer''s language (German or English). Never mention that you are an AI unless asked directly.',
'Services: Signature Facial (75 min, €95), Deep Cleansing Facial (60 min, €75), Lash Lift & Tint (45 min, €65), Brow Styling (30 min, €35), Deep Tissue Massage (60 min, €85), Hot Stone Massage (75 min, €99). Opening hours: Mon–Sat 10:00–19:00. Address: Torstraße 101, 10119 Berlin. First-visit discount: 15% on any facial. Cancellations free up to 24h before the appointment.',
'{"alwaysEscalateTopics":["refund","complaint","allergic reaction"],"maxDiscountPercent":15,"businessHoursOnly":false}'::jsonb);

-- ── Contacts ────────────────────────────────────────────────────────────────
insert into public.contacts (id, workspace_id, external_id, channel, name, phone, instagram_handle, lifecycle_stage, tags, bot_active, unread, attention_required, notes, memory_summary, created_at, updated_at) values
('demo-c1', 'demo-ws-1', '4915211111111', 'whatsapp',  'Lena Hoffmann',   '+49 152 1111 1111', null,           'vip',          '{facial,regular}',        true,  0, false, 'Comes every 3 weeks.', 'Regular since January. Prefers Saturday mornings with Anna. Sensitive skin — always books the Signature Facial.', now() - interval '92 days', now() - interval '1 day'),
('demo-c2', 'demo-ws-1', '4915222222222', 'whatsapp',  'Sofia Marino',    '+49 152 2222 2222', null,           'trial_booked', '{lashes,first-visit}',    true,  2, false, '', 'New lead from a friend''s referral. Booked a Lash Lift trial for this week. Asked about the first-visit discount.', now() - interval '3 days', now() - interval '2 hours'),
('demo-c3', 'demo-ws-1', 'ig_9483720', 'instagram', 'Maja K.',         null, '@maja.moves', 'qualified',    '{massage}',               true,  0, false, '', 'Found us through the GLOW reel. Interested in Deep Tissue after marathon training. Wants weekday evenings.', now() - interval '6 days', now() - interval '1 day'),
('demo-c4', 'demo-ws-1', 'v_demo_web_1', 'webchat',   'Thomas Berger',   null, null,           'inquiry',      '{}',                      true,  1, true,  'Asked about gift cards — needs a human answer.', 'Website visitor asking about a gift voucher for his wife''s birthday next month.', now() - interval '1 day', now() - interval '30 minutes'),
('demo-c5', 'demo-ws-1', '4915255555555', 'whatsapp',  'Amelie Fischer',  '+49 152 5555 5555', null,           'attended',     '{facial,first-visit}',    true,  0, false, '', 'Came for the Deep Cleansing Facial last week, very happy. Good candidate for a review request and rebooking.', now() - interval '12 days', now() - interval '5 days'),
('demo-c6', 'demo-ws-1', 'ig_1120394', 'instagram', 'Nina Petrova',    null, '@ninap.berlin', 'reviewed',     '{brows,regular}',         true,  0, false, '', 'Left a 5-star Google review after her brow styling. Books roughly monthly.', now() - interval '45 days', now() - interval '8 days'),
('demo-c7', 'demo-ws-1', '4915277777777', 'whatsapp',  'Charlotte Weber', '+49 152 7777 7777', null,           'rebooked',     '{massage,regular}',       false, 0, false, 'Taken over by staff — prefers human contact.', 'Long-time massage client. Prefers talking to Anna directly, bot switched off.', now() - interval '120 days', now() - interval '3 days'),
('demo-c8', 'demo-ws-1', 'v_demo_web_2', 'webchat',   'Julia Schmidt',   null, null,           'inquiry',      '{sleeping}',              true,  0, false, '', 'Asked about prices in May, then went quiet. Good win-back candidate.', now() - interval '60 days', now() - interval '38 days');

-- ── Conversations ───────────────────────────────────────────────────────────
insert into public.messages (workspace_id, contact_id, channel, direction, content, ai_generated, created_at) values
-- Sofia: fresh trial booking (unread=2 shows a live inbox)
('demo-ws-1', 'demo-c2', 'whatsapp', 'inbound',  'Hi! My friend Lena recommended you — do you do lash lifts?', false, now() - interval '3 days'),
('demo-ws-1', 'demo-c2', 'whatsapp', 'outbound', 'Hi Sofia! Lovely to hear Lena sent you 💛 Yes — our Lash Lift & Tint takes 45 minutes and costs €65. As a first-time guest you also get 15% off. Would Thursday 16:00 or Friday 11:00 suit you?', true, now() - interval '3 days' + interval '2 minutes'),
('demo-ws-1', 'demo-c2', 'whatsapp', 'inbound',  'Friday 11:00 sounds great!', false, now() - interval '2 days'),
('demo-ws-1', 'demo-c2', 'whatsapp', 'outbound', 'Perfect — you''re booked for Friday 11:00, Lash Lift & Tint with Marie. We''re at Torstraße 101. See you then! ✨', true, now() - interval '2 days' + interval '1 minute'),
('demo-ws-1', 'demo-c2', 'whatsapp', 'inbound',  'Can I pay by card at the studio?', false, now() - interval '2 hours'),
('demo-ws-1', 'demo-c2', 'whatsapp', 'inbound',  'And is parking available nearby?', false, now() - interval '105 minutes'),
-- Maja: Instagram lead being qualified
('demo-ws-1', 'demo-c3', 'instagram', 'inbound',  'Saw your reel! Do you do sports massage? Training for the Berlin marathon 🏃‍♀️', false, now() - interval '6 days'),
('demo-ws-1', 'demo-c3', 'instagram', 'outbound', 'Hi Maja! Congrats on the marathon training 💪 Our Deep Tissue Massage (60 min, €85) is exactly what tired legs need. When do you usually have time — mornings or after work?', true, now() - interval '6 days' + interval '3 minutes'),
('demo-ws-1', 'demo-c3', 'instagram', 'inbound',  'After work is best, like 18:00ish on weekdays', false, now() - interval '1 day'),
('demo-ws-1', 'demo-c3', 'instagram', 'outbound', 'Great — we have Tuesday and Thursday at 18:00 free next week. Shall I reserve one of those for you?', true, now() - interval '1 day' + interval '2 minutes'),
-- Thomas: webchat, needs human (attention_required)
('demo-ws-1', 'demo-c4', 'webchat', 'inbound',  'Hello, do you sell gift vouchers? It''s for my wife''s birthday.', false, now() - interval '1 day'),
('demo-ws-1', 'demo-c4', 'webchat', 'outbound', 'Hi! What a lovely idea 🎁 We do offer gift vouchers for any treatment or amount. Let me hand you to a colleague who can arrange the details and delivery.', true, now() - interval '1 day' + interval '1 minute'),
('demo-ws-1', 'demo-c4', 'webchat', 'inbound',  'Great, ideally something around €100.', false, now() - interval '30 minutes'),
-- Amelie: attended, post-visit follow-up
('demo-ws-1', 'demo-c5', 'whatsapp', 'inbound',  'Thanks again for yesterday, my skin feels amazing!', false, now() - interval '5 days'),
('demo-ws-1', 'demo-c5', 'whatsapp', 'outbound', 'So happy to hear that, Amelie! 🌸 If you have a spare minute, a short Google review would mean the world to us. And whenever you''re ready, the ideal rhythm for your skin type is every 4–5 weeks — shall I pencil you in for mid-August?', true, now() - interval '5 days' + interval '4 minutes'),
-- Lena: VIP regular
('demo-ws-1', 'demo-c1', 'whatsapp', 'inbound',  'Hi Mia, same as always for Saturday?', false, now() - interval '1 day'),
('demo-ws-1', 'demo-c1', 'whatsapp', 'outbound', 'Of course, Lena! Signature Facial, Saturday 10:00 with Anna — booked. See you then 💛', true, now() - interval '1 day' + interval '1 minute');

-- ── Appointments (upcoming week) ────────────────────────────────────────────
insert into public.appointments (workspace_id, contact_id, contact_name, class_name, starts_at, duration_min, channel, kind) values
('demo-ws-1', 'demo-c1', 'Lena Hoffmann',  'Signature Facial',      date_trunc('day', now()) + interval '2 days' + interval '10 hours', 75, 'whatsapp',  'regular'),
('demo-ws-1', 'demo-c2', 'Sofia Marino',   'Lash Lift & Tint',      date_trunc('day', now()) + interval '1 day' + interval '11 hours', 45, 'whatsapp',  'trial'),
('demo-ws-1', 'demo-c3', 'Maja K.',        'Deep Tissue Massage',   date_trunc('day', now()) + interval '4 days' + interval '18 hours', 60, 'instagram', 'trial'),
('demo-ws-1', 'demo-c7', 'Charlotte Weber','Hot Stone Massage',     date_trunc('day', now()) + interval '3 days' + interval '17 hours', 75, 'whatsapp',  'regular'),
('demo-ws-1', 'demo-c6', 'Nina Petrova',   'Brow Styling',          date_trunc('day', now()) + interval '6 days' + interval '14 hours', 30, 'instagram', 'regular'),
('demo-ws-1', 'demo-c4', 'Thomas Berger',  'Gift Voucher Consult',  date_trunc('day', now()) + interval '2 days' + interval '16 hours', 15, 'webchat',   'consult');

-- ── Deals ───────────────────────────────────────────────────────────────────
insert into public.deals (workspace_id, contact_id, contact_name, name, value, currency, stage, channel, created_at, updated_at) values
('demo-ws-1', 'demo-c2', 'Sofia Marino',    'Lash Lift trial → package',      65,  'EUR', 'qualified',   'whatsapp',  now() - interval '2 days',  now() - interval '2 hours'),
('demo-ws-1', 'demo-c3', 'Maja K.',         'Marathon massage series (5x)',   382, 'EUR', 'proposal',    'instagram', now() - interval '5 days',  now() - interval '1 day'),
('demo-ws-1', 'demo-c4', 'Thomas Berger',   'Gift voucher €100',              100, 'EUR', 'lead',        'webchat',   now() - interval '1 day',   now() - interval '30 minutes'),
('demo-ws-1', 'demo-c1', 'Lena Hoffmann',   'Annual facial membership',       950, 'EUR', 'negotiation', 'whatsapp',  now() - interval '14 days', now() - interval '3 days'),
('demo-ws-1', 'demo-c5', 'Amelie Fischer',  'First facial visit',             75,  'EUR', 'won',         'whatsapp',  now() - interval '12 days', now() - interval '6 days'),
('demo-ws-1', 'demo-c8', 'Julia Schmidt',   'Facial inquiry (went quiet)',    95,  'EUR', 'lost',        'webchat',   now() - interval '60 days', now() - interval '38 days');

-- ── Tasks ───────────────────────────────────────────────────────────────────
insert into public.tasks (workspace_id, contact_id, contact_name, title, priority, status, due_date) values
('demo-ws-1', 'demo-c4', 'Thomas Berger',   'Prepare €100 gift voucher + delivery details', 'high',   'todo',        now() + interval '1 day'),
('demo-ws-1', 'demo-c2', 'Sofia Marino',    'Answer parking question before Friday visit',  'medium', 'in_progress', now() + interval '12 hours'),
('demo-ws-1', 'demo-c1', 'Lena Hoffmann',   'Send membership offer with Anna''s notes',     'high',   'waiting',     now() + interval '3 days'),
('demo-ws-1', 'demo-c5', 'Amelie Fischer',  'Follow up on review request',                  'low',    'todo',        now() + interval '2 days'),
('demo-ws-1', null,      null,              'Restock lash tint (running low)',              'medium', 'done',        now() - interval '1 day');

-- ── Weekly class schedule ───────────────────────────────────────────────────
insert into public.schedule_slots (workspace_id, class_name, day_of_week, time, duration_min, capacity, booked, instructor) values
('demo-ws-1', 'Morning Glow Yoga',    1, '08:30', 60, 12, 9,  'Anna'),
('demo-ws-1', 'Morning Glow Yoga',    3, '08:30', 60, 12, 11, 'Anna'),
('demo-ws-1', 'Pilates Sculpt',       2, '18:30', 55, 10, 10, 'Marie'),
('demo-ws-1', 'Pilates Sculpt',       4, '18:30', 55, 10, 7,  'Marie'),
('demo-ws-1', 'Deep Stretch & Relax', 5, '17:00', 45, 14, 6,  'Anna'),
('demo-ws-1', 'Weekend Glow Flow',    6, '10:00', 60, 16, 13, 'Marie');

-- ── Campaigns ───────────────────────────────────────────────────────────────
insert into public.campaigns (id, workspace_id, name, status, campaign_type, trigger_stage, goal, flow, audience, follow_up_delays_days) values
('demo-camp-1', 'demo-ws-1', 'New inquiry welcome', 'active', 'triggered', 'inquiry',
 'Welcome new inquiries, mention the 15% first-visit facial discount and get them to book a concrete time slot.',
 '[{"type":"message","content":"Hi {{name}}! Thanks for reaching out to Glow Studio Berlin 💛 As a first-time guest you get 15% off any facial. When would suit you for a visit?"}]'::jsonb,
 '{"stages":[],"tags":[],"inactiveDays":null,"lostOnly":false,"contactIds":[],"resumeBot":true}'::jsonb,
 '{2,5}'),
('demo-camp-2', 'demo-ws-1', 'Win back sleeping clients', 'draft', 'manual', null,
 'Re-activate clients who have not visited in over 30 days with a friendly check-in and a small incentive.',
 '[{"type":"message","content":"Hi {{name}}, we miss you at Glow Studio! ✨ Your skin deserves a treat — book this month and enjoy 10% off your favourite treatment."}]'::jsonb,
 '{"stages":[],"tags":["sleeping"],"inactiveDays":30,"lostOnly":false,"contactIds":[],"resumeBot":true}'::jsonb,
 '{3}');

-- A completed run so the campaign screen shows history.
insert into public.campaign_runs (id, campaign_id, status, started_at, completed_at)
values ('demo-run-1', 'demo-camp-1', 'completed', now() - interval '6 days', now() - interval '6 days' + interval '10 minutes');

insert into public.campaign_enrollments (campaign_id, run_id, contact_id, step_index, status, delivery_status, sends_completed, sent_at, enrolled_at) values
('demo-camp-1', 'demo-run-1', 'demo-c3', 1, 'completed', 'delivered', 1, now() - interval '6 days' + interval '3 minutes', now() - interval '6 days'),
('demo-camp-1', 'demo-run-1', 'demo-c8', 1, 'completed', 'delivered', 1, now() - interval '6 days' + interval '5 minutes', now() - interval '6 days');

-- ── Comment automation (Instagram) ──────────────────────────────────────────
insert into public.comment_automations (workspace_id, keyword, post_label, opening_dm, status, stats)
values ('demo-ws-1', 'GLOW', 'Summer skin reel', 'Hey! 💛 Here''s the treatment menu you asked for — and as a first-time guest you get 15% off any facial. Want me to check free slots this week?', 'active',
        '{"commentsCaptured":47,"dmsSent":41,"booked":9}'::jsonb);

-- ── Web chat channel (safe to leave connected — no real messaging) ─────────
insert into public.channel_connections (workspace_id, channel, credentials, instance_name, status)
values ('demo-ws-1', 'webchat',
        '{"embedKey":"wc_demo_glow_2026","widgetSettings":{"accentColor":"#B76E79","title":"Glow Studio Berlin","subtitle":"We reply in seconds","greeting":"Hi! 💛 Wie können wir helfen? / How can we help?","position":"right"}}'::jsonb,
        'webchat-demo-ws-1', 'connected');

-- ── Credit history (matches the agency balance of 350) ─────────────────────
insert into public.credit_ledger (agency_id, delta, reason, balance, created_at) values
('demo-agency',  500, 'purchase:pack_500', 500, now() - interval '30 days'),
('demo-agency', -150, 'usage:ai_messages', 350, now() - interval '2 days');

-- Done. Log in with demo@zennohq.studio / ZennoDemo2026!
