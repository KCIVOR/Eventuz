-- MVP event statuses: draft | published | disabled (no "completed")

update public.events
set status = 'disabled'
where status = 'completed';

alter table public.events drop constraint if exists events_status_check;

alter table public.events
  add constraint events_status_check check (status in ('draft', 'published', 'disabled'));
