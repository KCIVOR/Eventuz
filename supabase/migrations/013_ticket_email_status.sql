-- Ticket email delivery: persist last failure without touching emailed_at.

alter table public.tickets add column if not exists email_last_error text;
