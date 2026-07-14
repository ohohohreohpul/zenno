create index if not exists campaign_enrollments_message_idx
  on public.campaign_enrollments(message_id)
  where message_id is not null;
