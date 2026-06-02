create table if not exists public.event_floor_plans (
  event_id uuid primary key references public.events(id) on delete cascade,
  layout_json jsonb not null default '{"elements":[]}'::jsonb,
  canvas_width int not null default 1200 check (canvas_width > 0),
  canvas_height int not null default 800 check (canvas_height > 0),
  grid_size int not null default 20 check (grid_size > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_event_floor_plans_updated_at on public.event_floor_plans;
create trigger set_event_floor_plans_updated_at
  before update on public.event_floor_plans
  for each row execute procedure public.set_updated_at();

alter table public.event_floor_plans enable row level security;

drop policy if exists "event_floor_plans_select_organizer" on public.event_floor_plans;
create policy "event_floor_plans_select_organizer"
  on public.event_floor_plans for select
  to authenticated
  using (
    exists (
      select 1
      from public.events e
      where e.id = event_floor_plans.event_id
        and e.organizer_id = auth.uid()
    )
    or public.is_super_admin()
  );

drop policy if exists "event_floor_plans_insert_organizer" on public.event_floor_plans;
create policy "event_floor_plans_insert_organizer"
  on public.event_floor_plans for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.events e
      where e.id = event_floor_plans.event_id
        and e.organizer_id = auth.uid()
    )
    or public.is_super_admin()
  );

drop policy if exists "event_floor_plans_update_organizer" on public.event_floor_plans;
create policy "event_floor_plans_update_organizer"
  on public.event_floor_plans for update
  to authenticated
  using (
    exists (
      select 1
      from public.events e
      where e.id = event_floor_plans.event_id
        and e.organizer_id = auth.uid()
    )
    or public.is_super_admin()
  )
  with check (
    exists (
      select 1
      from public.events e
      where e.id = event_floor_plans.event_id
        and e.organizer_id = auth.uid()
    )
    or public.is_super_admin()
  );

drop policy if exists "event_floor_plans_delete_organizer" on public.event_floor_plans;
create policy "event_floor_plans_delete_organizer"
  on public.event_floor_plans for delete
  to authenticated
  using (
    exists (
      select 1
      from public.events e
      where e.id = event_floor_plans.event_id
        and e.organizer_id = auth.uid()
    )
    or public.is_super_admin()
  );
