-- ============================================================================
-- NEXORA — 0003 storage buckets and policies
--
-- Three buckets:
--   nexora-images   public read  — article covers, book covers, thumbnails
--   nexora-pdfs     private      — book and study PDFs, served via signed URLs
--   nexora-private  private      — diary attachments, never publicly reachable
--
-- Only admins may write. Reads are public for the image bucket and denied for
-- the other two except to admins; restricted files are handed out as
-- short-lived signed URLs by the storage service.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('nexora-images',  'nexora-images',  true,  5242880,  array['image/jpeg','image/png','image/webp']),
  ('nexora-pdfs',    'nexora-pdfs',    false, 26214400, array['application/pdf']),
  ('nexora-private', 'nexora-private', false, 26214400, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public images: anyone may read, only admins may change.
drop policy if exists "storage: public image read" on storage.objects;
create policy "storage: public image read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'nexora-images');

drop policy if exists "storage: admin image write" on storage.objects;
create policy "storage: admin image write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'nexora-images' and public.is_admin());

drop policy if exists "storage: admin image update" on storage.objects;
create policy "storage: admin image update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'nexora-images' and public.is_admin())
  with check (bucket_id = 'nexora-images' and public.is_admin());

drop policy if exists "storage: admin image delete" on storage.objects;
create policy "storage: admin image delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'nexora-images' and public.is_admin());

-- PDFs and private files: admin-only read. Signed URLs are issued by an
-- authenticated admin session, so no anonymous policy exists.
drop policy if exists "storage: admin pdf read" on storage.objects;
create policy "storage: admin pdf read"
  on storage.objects for select
  to authenticated
  using (bucket_id in ('nexora-pdfs', 'nexora-private') and public.is_admin());

drop policy if exists "storage: admin pdf write" on storage.objects;
create policy "storage: admin pdf write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id in ('nexora-pdfs', 'nexora-private') and public.is_admin());

drop policy if exists "storage: admin pdf update" on storage.objects;
create policy "storage: admin pdf update"
  on storage.objects for update
  to authenticated
  using (bucket_id in ('nexora-pdfs', 'nexora-private') and public.is_admin())
  with check (bucket_id in ('nexora-pdfs', 'nexora-private') and public.is_admin());

drop policy if exists "storage: admin pdf delete" on storage.objects;
create policy "storage: admin pdf delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id in ('nexora-pdfs', 'nexora-private') and public.is_admin());
