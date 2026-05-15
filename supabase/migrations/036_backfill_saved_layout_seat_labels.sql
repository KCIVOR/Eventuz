do $$
declare
  tt record;
  seat_rec record;
  seat_idx int;
  expected_count int;
  row_zero int;
  col_num int;
  table_num int;
  seat_num int;
  row_label text;
  n int;
  rem int;
begin
  create temporary table if not exists pg_temp.seat_label_backfill (
    seat_id uuid primary key,
    table_label text,
    seat_label text not null,
    display_label text not null
  ) on commit drop;

  truncate table pg_temp.seat_label_backfill;

  for tt in
    select
      id,
      seat_layout_mode,
      seat_layout_rows,
      seat_layout_columns,
      seat_layout_table_count,
      seat_layout_seats_per_table
    from public.ticket_types
    where (
      seat_layout_mode = 'rowed'
      and seat_layout_rows is not null
      and seat_layout_columns is not null
    )
    or (
      seat_layout_mode = 'tables'
      and seat_layout_table_count is not null
      and seat_layout_seats_per_table is not null
    )
  loop
    seat_idx := 0;
    expected_count := case
      when tt.seat_layout_mode = 'tables' then
        tt.seat_layout_table_count * tt.seat_layout_seats_per_table
      else
        tt.seat_layout_rows * tt.seat_layout_columns
    end;

    for seat_rec in
      select id
      from public.seats
      where ticket_type_id = tt.id
      order by created_at asc, id asc
    loop
      seat_idx := seat_idx + 1;
      if seat_idx > expected_count then
        continue;
      end if;

      if tt.seat_layout_mode = 'tables' then
        table_num := ((seat_idx - 1) / tt.seat_layout_seats_per_table) + 1;
        seat_num := ((seat_idx - 1) % tt.seat_layout_seats_per_table) + 1;

        insert into pg_temp.seat_label_backfill (
          seat_id,
          table_label,
          seat_label,
          display_label
        )
        values (
          seat_rec.id,
          'T' || table_num::text,
          seat_num::text,
          'T' || table_num::text || '-' || seat_num::text
        );
      else
        row_zero := (seat_idx - 1) / tt.seat_layout_columns;
        col_num := ((seat_idx - 1) % tt.seat_layout_columns) + 1;
        n := row_zero + 1;
        row_label := '';

        while n > 0 loop
          rem := (n - 1) % 26;
          row_label := chr(65 + rem) || row_label;
          n := (n - 1) / 26;
        end loop;

        insert into pg_temp.seat_label_backfill (
          seat_id,
          table_label,
          seat_label,
          display_label
        )
        values (
          seat_rec.id,
          'Row ' || row_label,
          col_num::text,
          row_label || col_num::text
        );
      end if;
    end loop;
  end loop;

  -- Avoid transient collisions with seats_ticket_display_unique while labels are swapped.
  update public.seats s
  set
    display_label = '__seat_label_backfill__' || s.id::text,
    updated_at = now()
  from pg_temp.seat_label_backfill b
  where s.id = b.seat_id;

  update public.seats s
  set
    table_label = b.table_label,
    seat_label = b.seat_label,
    display_label = b.display_label,
    updated_at = now()
  from pg_temp.seat_label_backfill b
  where s.id = b.seat_id;
end $$;
