-- Allow attendees to become staff when accepting a scanner invite (see accept_staff_invitation).
-- Still blocks arbitrary role changes; super admins bypass.

create or replace function public.profiles_prevent_role_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and not public.is_super_admin () then
    if old.role = 'attendee' and new.role = 'staff' then
      return new;
    end if;
    raise exception 'Only a super admin can change role';
  end if;
  return new;
end;
$$;
