alter table public.ticket_types
  add column if not exists seat_overview_order int;

with ordered as (
  select
    id,
    row_number() over (
      partition by event_id
      order by created_at asc, id asc
    )::int as next_order
  from public.ticket_types
  where seat_overview_order is null
)
update public.ticket_types tt
set seat_overview_order = ordered.next_order
from ordered
where tt.id = ordered.id;

create index if not exists ticket_types_event_seat_overview_order_idx
  on public.ticket_types (event_id, seat_overview_order, created_at);
