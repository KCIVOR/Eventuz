-- Ticket types: inventory quantity must be at least 1 (organizer Phase 4).

update public.ticket_types
set quantity = 1
where quantity < 1;

alter table public.ticket_types drop constraint if exists ticket_types_quantity_check;

alter table public.ticket_types
  add constraint ticket_types_quantity_check check (quantity >= 1);
