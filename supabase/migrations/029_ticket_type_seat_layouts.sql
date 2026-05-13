-- Saved visual seating layout per ticket type.
-- Selectable inventory still lives in public.seats; these columns store the
-- organizer's generator settings so the same visual can be shown to attendees.

alter table public.ticket_types
  add column if not exists seat_layout_mode text not null default 'rowed'
    check (seat_layout_mode in ('rowed', 'tables')),
  add column if not exists seat_layout_rows int
    check (seat_layout_rows is null or seat_layout_rows > 0),
  add column if not exists seat_layout_columns int
    check (seat_layout_columns is null or seat_layout_columns > 0),
  add column if not exists seat_layout_table_count int
    check (seat_layout_table_count is null or seat_layout_table_count > 0),
  add column if not exists seat_layout_seats_per_table int
    check (seat_layout_seats_per_table is null or seat_layout_seats_per_table > 0);

update public.ticket_types
set
  seat_layout_mode = coalesce(seat_layout_mode, 'rowed'),
  seat_layout_rows = coalesce(seat_layout_rows, quantity),
  seat_layout_columns = coalesce(seat_layout_columns, 1)
where seat_layout_rows is null
  or seat_layout_columns is null;
