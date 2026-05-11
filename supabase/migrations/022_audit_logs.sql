-- Append-only audit trail for critical business actions.
-- Inserts: SECURITY DEFINER write_audit_log (app / service_role) or direct insert from other DEFINER functions (housekeeping).

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid (),
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now ()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index if not exists audit_logs_action_idx on public.audit_logs (action);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_select_super_admin" on public.audit_logs;
create policy "audit_logs_select_super_admin"
  on public.audit_logs for select to authenticated
  using (public.is_super_admin ());

-- Authenticated: actor is always auth.uid(). Service role: optional p_actor_override (often null for system events).
create or replace function public.write_audit_log (
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb default '{}'::jsonb,
  p_actor_override uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  v_actor uuid;
  v_role text := coalesce(auth.jwt () ->> 'role', '');
begin
  if v_role = 'service_role' then
    v_actor := p_actor_override;
  else
    v_actor := auth.uid ();
  end if;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    v_actor,
    p_action,
    p_entity_type,
    p_entity_id,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

grant execute on function public.write_audit_log (text, text, uuid, jsonb, uuid) to authenticated;

grant execute on function public.write_audit_log (text, text, uuid, jsonb, uuid) to service_role;
