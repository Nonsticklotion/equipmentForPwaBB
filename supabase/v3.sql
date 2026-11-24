-- =========================================================
-- v3: ผู้ดูแลรายสถานี + ชื่อผู้ใช้ + บันทึกการแก้ไข (Audit log)
-- รันต่อจาก v2.sql ครั้งเดียว
-- =========================================================

-- ---------- profiles: ชื่อที่แสดง + role editor ----------
alter table public.profiles add column if not exists display_name text;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('viewer','editor','admin'));

drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles" on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- ผู้ใช้ตั้งชื่อตัวเองได้ (แก้ role ตัวเองไม่ได้)
create or replace function public.set_my_name(n text)
returns void language sql security definer set search_path = public as $$
  update public.profiles set display_name = nullif(left(trim(n), 60), '') where id = auth.uid();
$$;
revoke all on function public.set_my_name(text) from public, anon;
grant execute on function public.set_my_name(text) to authenticated;

-- ---------- ผู้ดูแลรายสถานี ----------
create table if not exists public.station_members (
  user_id uuid not null references public.profiles(id) on delete cascade,
  station_id bigint not null references public.stations(id) on delete cascade,
  primary key (user_id, station_id)
);
alter table public.station_members enable row level security;
drop policy if exists "member read" on public.station_members;
create policy "member read" on public.station_members for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "admin write" on public.station_members;
create policy "admin write" on public.station_members for all
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.can_edit_station(sid bigint)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.station_members m
    join public.profiles p on p.id = m.user_id
    where m.user_id = auth.uid() and m.station_id = sid and p.role in ('editor','admin')
  );
$$;

create or replace function public.station_of_building(bid bigint)
returns bigint language sql stable security definer set search_path = public as $$
  select station_id from public.buildings where id = bid;
$$;

create or replace function public.station_of_equipment(eid bigint)
returns bigint language sql stable security definer set search_path = public as $$
  select b.station_id from public.equipment e join public.buildings b on b.id = e.building_id where e.id = eid;
$$;

create or replace function public.can_edit_photo_path(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select case when split_part(p, '/', 1) ~ '^[0-9]+$'
    then public.can_edit_station(public.station_of_equipment(split_part(p, '/', 1)::bigint))
    else public.is_admin() end;
$$;

-- ---------- RLS: แก้ได้เฉพาะสถานีที่ดูแล ----------
-- (stations, categories ยังเป็นแอดมินเท่านั้น)
drop policy if exists "admin write" on public.buildings;
drop policy if exists "station write" on public.buildings;
create policy "station write" on public.buildings for all
  using (public.can_edit_station(station_id)) with check (public.can_edit_station(station_id));

drop policy if exists "admin write" on public.equipment;
drop policy if exists "station write" on public.equipment;
create policy "station write" on public.equipment for all
  using (public.can_edit_station(public.station_of_building(building_id)))
  with check (public.can_edit_station(public.station_of_building(building_id)));

drop policy if exists "admin write" on public.equipment_photos;
drop policy if exists "station write" on public.equipment_photos;
create policy "station write" on public.equipment_photos for all
  using (public.can_edit_station(public.station_of_equipment(equipment_id)))
  with check (public.can_edit_station(public.station_of_equipment(equipment_id)));

drop policy if exists "admin write" on public.maintenance_logs;
drop policy if exists "station write" on public.maintenance_logs;
create policy "station write" on public.maintenance_logs for all
  using (public.can_edit_station(public.station_of_equipment(equipment_id)))
  with check (public.can_edit_station(public.station_of_equipment(equipment_id)));

drop policy if exists "equipment photos admin insert" on storage.objects;
drop policy if exists "equipment photos admin update" on storage.objects;
drop policy if exists "equipment photos admin delete" on storage.objects;
drop policy if exists "equipment photos insert" on storage.objects;
drop policy if exists "equipment photos update" on storage.objects;
drop policy if exists "equipment photos delete" on storage.objects;
create policy "equipment photos insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'equipment-photos' and public.can_edit_photo_path(name));
create policy "equipment photos update" on storage.objects for update to authenticated
  using (bucket_id = 'equipment-photos' and public.can_edit_photo_path(name));
create policy "equipment photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'equipment-photos' and public.can_edit_photo_path(name));

-- ---------- Audit log ----------
create table if not exists public.audit_log (
  id bigint generated by default as identity primary key,
  at timestamptz not null default now(),
  user_id uuid,
  user_name text,
  table_name text not null,
  row_id bigint,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  station_id bigint,
  equipment_id bigint,
  label text,
  changes jsonb
);
create index if not exists audit_log_at_idx on public.audit_log(at desc);
create index if not exists audit_log_eq_idx on public.audit_log(equipment_id, at desc);
create index if not exists audit_log_st_idx on public.audit_log(station_id, at desc);

alter table public.audit_log enable row level security;
drop policy if exists "audit read" on public.audit_log;
create policy "audit read" on public.audit_log for select
  using (public.is_admin() or (station_id is not null and public.can_edit_station(station_id)));
-- ไม่มี policy insert/update/delete: เขียนได้จาก trigger เท่านั้น แก้/ลบย้อนหลังไม่ได้

create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  o jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  n jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  r jsonb := coalesce(n, o);
  ch jsonb := '{}'::jsonb;
  k text; sid bigint; eid bigint; uname text;
begin
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(n) loop
      continue when k in ('updated_at', 'search_text', 'created_at', 'specs');
      if (o -> k) is distinct from (n -> k) then
        ch := ch || jsonb_build_object(k, jsonb_build_array(o -> k, n -> k));
      end if;
    end loop;
    if n ? 'specs' then
      for k in select jsonb_object_keys(coalesce(o -> 'specs', '{}') || coalesce(n -> 'specs', '{}')) loop
        if (o -> 'specs' -> k) is distinct from (n -> 'specs' -> k) then
          ch := ch || jsonb_build_object('specs.' || k, jsonb_build_array(o -> 'specs' -> k, n -> 'specs' -> k));
        end if;
      end loop;
    end if;
    if ch = '{}'::jsonb then return null; end if;   -- ไม่มีอะไรเปลี่ยน
  else
    ch := r - 'search_text' - 'updated_at' - 'created_at';
  end if;

  case tg_table_name
    when 'stations' then sid := (r ->> 'id')::bigint;
    when 'buildings' then sid := (r ->> 'station_id')::bigint;
    when 'equipment' then
      eid := (r ->> 'id')::bigint;
      select station_id into sid from public.buildings where id = (r ->> 'building_id')::bigint;
    when 'equipment_photos', 'maintenance_logs' then
      eid := (r ->> 'equipment_id')::bigint;
      sid := public.station_of_equipment(eid);
    else null;
  end case;

  select coalesce(nullif(display_name, ''), email) into uname from public.profiles where id = auth.uid();

  insert into public.audit_log (user_id, user_name, table_name, row_id, action, station_id, equipment_id, label, changes)
  values (auth.uid(), uname, tg_table_name, (r ->> 'id')::bigint, tg_op, sid, eid,
          coalesce(nullif(concat_ws(' ', r ->> 'tag', r ->> 'name'), ''), r ->> 'title', r ->> 'kind'),
          ch);
  return null;
end; $$;

do $$
declare t text;
begin
  foreach t in array array['stations','buildings','categories','equipment','equipment_photos','maintenance_logs'] loop
    execute format('drop trigger if exists audit on public.%I', t);
    execute format('create trigger audit after insert or update or delete on public.%I for each row execute function public.audit_trigger()', t);
  end loop;
end $$;

notify pgrst, 'reload schema';
