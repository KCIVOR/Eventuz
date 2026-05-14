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

        update public.seats
        set
          table_label = 'T' || table_num::text,
          seat_label = seat_num::text,
          display_label = 'T' || table_num::text || '-' || seat_num::text,
          updated_at = now()
        where id = seat_rec.id;
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

        update public.seats
        set
          table_label = 'Row ' || row_label,
          seat_label = col_num::text,
          display_label = row_label || col_num::text,
          updated_at = now()
        where id = seat_rec.id;
      end if;
    end loop;
  end loop;
end $$;
