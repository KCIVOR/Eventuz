-- Event cover images: one public hero image per event, uploaded by the owning organizer.

insert into storage.buckets (id, name, public)
values ('event-covers', 'event-covers', true)
on conflict (id) do nothing;

drop policy if exists "Event cover images are publicly accessible" on storage.objects;
create policy "Event cover images are publicly accessible"
on storage.objects for select
using (bucket_id = 'event-covers');

drop policy if exists "Organizers can upload their own event covers" on storage.objects;
create policy "Organizers can upload their own event covers"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'event-covers'
  and public.is_organizer()
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Organizers can update their own event covers" on storage.objects;
create policy "Organizers can update their own event covers"
on storage.objects for update
to authenticated
using (
  bucket_id = 'event-covers'
  and public.is_organizer()
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'event-covers'
  and public.is_organizer()
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Organizers can delete their own event covers" on storage.objects;
create policy "Organizers can delete their own event covers"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'event-covers'
  and public.is_organizer()
  and (storage.foldername(name))[1] = auth.uid()::text
);
