-- =========================================================
-- ทะเบียนอุปกรณ์สถานี : Supabase schema
-- รันทั้งไฟล์ใน Supabase > SQL Editor ครั้งเดียว
-- =========================================================

-- ---------- ตาราง ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'viewer' check (role in ('viewer','admin')),
  created_at timestamptz default now()
);

create table if not exists public.stations (
  id bigint generated always as identity primary key,
  code text unique,
  name text not null,
  location text,
  note text,
  sort int default 0,
  created_at timestamptz default now()
);

create table if not exists public.buildings (
  id bigint generated always as identity primary key,
  station_id bigint not null references public.stations(id) on delete cascade,
  name text not null,
  note text,
  sort int default 0,
  created_at timestamptz default now()
);

-- หมวดอุปกรณ์ : field_schema กำหนดว่าหมวดนี้มีช่องข้อมูลอะไรบ้าง
-- รูปแบบ: [{ "group": "ชื่อกลุ่ม", "fields": [{ "key","label","type","unit","options" }] }]
-- type: text | number | date | select | textarea
create table if not exists public.categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  icon text default '⚙️',
  field_schema jsonb not null default '[]'::jsonb,
  sort int default 0,
  created_at timestamptz default now()
);

create table if not exists public.equipment (
  id bigint generated always as identity primary key,
  building_id bigint not null references public.buildings(id) on delete restrict,
  category_id bigint not null references public.categories(id) on delete restrict,
  tag text,                        -- รหัสอุปกรณ์ เช่น P-101
  name text not null,
  status text not null default 'ใช้งาน' check (status in ('ใช้งาน','สำรอง','ชำรุด','ซ่อม','เลิกใช้')),
  specs jsonb not null default '{}'::jsonb,   -- ค่าตาม field_schema ของหมวด
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  search_text text generated always as (
    lower(coalesce(tag,'') || ' ' || name || ' ' || coalesce(note,'') || ' ' || specs::text)
  ) stored
);

create index if not exists equipment_building_idx on public.equipment(building_id);
create index if not exists equipment_category_idx on public.equipment(category_id);
create index if not exists buildings_station_idx on public.buildings(station_id);

-- ---------- ฟังก์ชัน / trigger ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- สมัครสมาชิกใหม่ -> สร้าง profile role viewer อัตโนมัติ
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists equipment_touch on public.equipment;
create trigger equipment_touch before update on public.equipment
  for each row execute function public.touch_updated_at();

-- ---------- RLS ----------
alter table public.profiles   enable row level security;
alter table public.stations   enable row level security;
alter table public.buildings  enable row level security;
alter table public.categories enable row level security;
alter table public.equipment  enable row level security;

-- profiles: ดูของตัวเองได้, แอดมินดูทั้งหมด
drop policy if exists "profile self read" on public.profiles;
create policy "profile self read" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- อ่าน: ค่าเริ่มต้นให้ทุกคนดูได้ (ไม่ต้องล็อกอิน)
-- ถ้าต้องการให้เฉพาะคนที่ล็อกอินดูได้ เปลี่ยน `using (true)` เป็น `using (auth.uid() is not null)`
do $$
declare t text;
begin
  foreach t in array array['stations','buildings','categories','equipment'] loop
    execute format('drop policy if exists "read all" on public.%I', t);
    execute format('create policy "read all" on public.%I for select using (true)', t);
    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format('create policy "admin write" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- ---------- ข้อมูลหมวดเริ่มต้น ----------
insert into public.categories (name, icon, sort, field_schema) values
('มอเตอร์ / ชุดสูบน้ำ', '🔄', 1, $json$[
  {"group":"ข้อมูลมอเตอร์ (Nameplate)","fields":[
    {"key":"m_brand","label":"ยี่ห้อ","type":"text"},
    {"key":"m_model","label":"รุ่น / Type","type":"text"},
    {"key":"m_serial","label":"Serial No.","type":"text"},
    {"key":"m_kw","list":true,"label":"กำลัง","type":"number","unit":"kW"},
    {"key":"m_hp","label":"กำลัง","type":"number","unit":"HP"},
    {"key":"m_voltage","list":true,"label":"แรงดัน","type":"number","unit":"V"},
    {"key":"m_current","list":true,"label":"กระแสพิกัด (FLA)","type":"number","unit":"A"},
    {"key":"m_freq","label":"ความถี่","type":"number","unit":"Hz"},
    {"key":"m_rpm","label":"ความเร็วรอบ","type":"number","unit":"rpm"},
    {"key":"m_poles","label":"จำนวนขั้ว","type":"select","options":["2","4","6","8"]},
    {"key":"m_pf","label":"Power Factor","type":"number"},
    {"key":"m_eff","label":"ประสิทธิภาพ","type":"number","unit":"%"},
    {"key":"m_ie","label":"ระดับประสิทธิภาพ","type":"select","options":["IE1","IE2","IE3","IE4"]},
    {"key":"m_connection","label":"การต่อขดลวด","type":"select","options":["Y","Δ","Y/Δ"]},
    {"key":"m_ins_class","label":"Insulation Class","type":"select","options":["B","F","H"]},
    {"key":"m_ip","label":"IP","type":"text"},
    {"key":"m_frame","label":"Frame Size","type":"text"},
    {"key":"m_duty","label":"Duty","type":"select","options":["S1","S2","S3","S4","S6"]},
    {"key":"m_mounting","label":"การติดตั้ง","type":"select","options":["B3 (ขาตั้ง)","B5 (หน้าแปลน)","V1 (แนวตั้ง)","อื่นๆ"]},
    {"key":"m_bearing_de","label":"Bearing DE","type":"text"},
    {"key":"m_bearing_nde","label":"Bearing NDE","type":"text"},
    {"key":"m_weight","label":"น้ำหนัก","type":"number","unit":"kg"},
    {"key":"m_year","label":"ปีที่ผลิต","type":"number"}
  ]},
  {"group":"ข้อมูลปั๊ม","fields":[
    {"key":"p_brand","label":"ยี่ห้อ","type":"text"},
    {"key":"p_model","label":"รุ่น","type":"text"},
    {"key":"p_serial","label":"Serial No.","type":"text"},
    {"key":"p_type","label":"ชนิดปั๊ม","type":"select","options":["End Suction","Split Case","Vertical Turbine","Submersible","Multistage","อื่นๆ"]},
    {"key":"p_flow","list":true,"label":"อัตราสูบ","type":"number","unit":"m³/h"},
    {"key":"p_head","list":true,"label":"Head","type":"number","unit":"m"},
    {"key":"p_speed","label":"ความเร็วรอบ","type":"number","unit":"rpm"},
    {"key":"p_eff","label":"ประสิทธิภาพ","type":"number","unit":"%"},
    {"key":"p_npshr","label":"NPSHr","type":"number","unit":"m"},
    {"key":"p_impeller","label":"เส้นผ่านศูนย์กลางใบพัด","type":"number","unit":"mm"},
    {"key":"p_suction","label":"ขนาดท่อดูด","type":"text","unit":"mm"},
    {"key":"p_discharge","label":"ขนาดท่อส่ง","type":"text","unit":"mm"},
    {"key":"p_seal","label":"ซีล","type":"select","options":["Mechanical Seal","Gland Packing"]},
    {"key":"p_coupling","label":"Coupling","type":"text"},
    {"key":"p_bearing","label":"Bearing","type":"text"}
  ]},
  {"group":"การควบคุม / ไฟฟ้า","fields":[
    {"key":"c_panel","label":"ตู้ / Feeder (MCC)","type":"text"},
    {"key":"c_start","list":true,"label":"วิธีสตาร์ท","type":"select","options":["DOL","Star-Delta","Soft Starter","VFD","Autotransformer"]},
    {"key":"c_vfd","label":"ยี่ห้อ/รุ่น Starter หรือ VFD","type":"text"},
    {"key":"c_breaker","label":"Breaker","type":"text","unit":"A"},
    {"key":"c_overload","label":"ตั้งค่า Overload","type":"number","unit":"A"},
    {"key":"c_cable","label":"สายไฟ","type":"text","unit":"mm²"},
    {"key":"c_capacitor","label":"Capacitor","type":"number","unit":"kVAR"}
  ]},
  {"group":"ติดตั้ง / บำรุงรักษา","fields":[
    {"key":"s_install_date","label":"วันที่ติดตั้ง","type":"date"},
    {"key":"s_supplier","label":"ผู้ติดตั้ง / ผู้ขาย","type":"text"},
    {"key":"s_contract","label":"เลขสัญญา / ครุภัณฑ์","type":"text"},
    {"key":"s_overhaul","label":"Overhaul ล่าสุด","type":"date"},
    {"key":"s_rewind","label":"พันขดลวดล่าสุด","type":"date"},
    {"key":"s_ir","label":"Insulation Resistance ล่าสุด","type":"number","unit":"MΩ"},
    {"key":"s_ir_date","label":"วันที่วัด IR","type":"date"},
    {"key":"s_run_current","label":"กระแสขณะทำงาน","type":"number","unit":"A"},
    {"key":"s_vibration","label":"Vibration ล่าสุด","type":"number","unit":"mm/s"},
    {"key":"s_history","label":"ประวัติซ่อม","type":"textarea"}
  ]}
]$json$::jsonb),
('หม้อแปลง', '⚡', 2, $json$[
  {"group":"Nameplate","fields":[
    {"key":"t_brand","list":true,"label":"ยี่ห้อ","type":"text"},
    {"key":"t_serial","label":"Serial No.","type":"text"},
    {"key":"t_kva","list":true,"label":"พิกัด","type":"number","unit":"kVA"},
    {"key":"t_hv","list":true,"label":"แรงดันด้านแรงสูง","type":"number","unit":"kV"},
    {"key":"t_lv","list":true,"label":"แรงดันด้านแรงต่ำ","type":"number","unit":"V"},
    {"key":"t_vector","label":"Vector Group","type":"text"},
    {"key":"t_z","label":"%Impedance","type":"number","unit":"%"},
    {"key":"t_type","label":"ชนิด","type":"select","options":["Oil Hermetically Sealed","Oil Conservator","Dry Type"]},
    {"key":"t_tap","label":"Tap ปัจจุบัน","type":"text"},
    {"key":"t_year","label":"ปีที่ผลิต","type":"number"}
  ]},
  {"group":"บำรุงรักษา","fields":[
    {"key":"t_owner","label":"ผู้ดูแล","type":"select","options":["กปภ.","กฟภ."]},
    {"key":"t_pea_no","label":"หมายเลขผู้ใช้ไฟ (CA)","type":"text"},
    {"key":"t_oil_test","label":"ทดสอบน้ำมันล่าสุด","type":"date"},
    {"key":"t_history","label":"ประวัติ","type":"textarea"}
  ]}
]$json$::jsonb)
on conflict (name) do nothing;

-- ---------- ตั้งแอดมินคนแรก ----------
-- 1) สมัครสมาชิกผ่านหน้าเว็บ (หรือ Authentication > Add user)
-- 2) รันคำสั่งนี้ (แก้อีเมล):
-- update public.profiles set role = 'admin' where email = 'you@example.com';
