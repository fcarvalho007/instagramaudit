-- Bucket público para thumbnails de posts do Instagram (persistidos em vez de proxy ao CDN do IG)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-thumbnails',
  'post-thumbnails',
  true,
  2097152,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Leitura pública
create policy "Post thumbnails are publicly readable"
on storage.objects
for select
using (bucket_id = 'post-thumbnails');

-- Escrita só service role (uploads server-side)
create policy "Service role can insert post thumbnails"
on storage.objects
for insert
to service_role
with check (bucket_id = 'post-thumbnails');

create policy "Service role can update post thumbnails"
on storage.objects
for update
to service_role
using (bucket_id = 'post-thumbnails');

create policy "Service role can delete post thumbnails"
on storage.objects
for delete
to service_role
using (bucket_id = 'post-thumbnails');