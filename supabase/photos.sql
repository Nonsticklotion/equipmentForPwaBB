-- =========================================================
-- ระบบรูปภาพอุปกรณ์ (รันต่อจาก schema.sql ครั้งเดียว)
-- =========================================================

-- ตารางเก็บรายการรูป
create table if not exists public.equipment_photos (
  id bigint generated always as identity primary key,
  equipment_id bigint not null references public.equipment(id) on delete cascade,
  kind text not null default 'equipment' check (kind in ('equipment','nameplate','tag','other')),
  path text not null,            -- path ใน storage bucket
  caption text,
  created_at timestamptz default now()
);
create index if not exists equipment_photos_eq_idx on public.equipment_photos(equipment_id);

alter table public.equipment_photos enable row level security;
drop policy if exists "read all" on public.equipment_photos;
create policy "read all" on public.equipment_photos for select using (true);
drop policy if exists "admin write" on public.equipment_photos;
create policy "admin write" on public.equipment_photos for all
  using (public.is_admin()) with check (public.is_admin());

-- Storage bucket (public read, จำกัด 5 MB/ไฟล์, เฉพาะรูป)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('equipment-photos', 'equipment-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- เฉพาะแอดมินอัป/ลบได้
drop policy if exists "equipment photos admin insert" on storage.objects;
create policy "equipment photos admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'equipment-photos' and public.is_admin());
drop policy if exists "equipment photos admin update" on storage.objects;
create policy "equipment photos admin update" on storage.objects for update to authenticated
  using (bucket_id = 'equipment-photos' and public.is_admin());
drop policy if exists "equipment photos admin delete" on storage.objects;
create policy "equipment photos admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'equipment-photos' and public.is_admin());
