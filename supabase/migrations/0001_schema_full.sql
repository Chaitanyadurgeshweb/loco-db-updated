
-- 0001_schema_full.sql - Complete Loco Portal Schema
-- This is the full scheme included in zip

-- Enable extensions
create extension if not exists "uuid-ossp";

-- loco_classes
create table if not exists public.loco_classes (
  id uuid primary key default gen_random_uuid(),
  class_code text unique not null,
  class_name text,
  traction text, -- Electric, Diesel
  gauge text,
  description text,
  created_at timestamptz default now()
);

-- sheds
create table if not exists public.sheds (
  id uuid primary key default gen_random_uuid(),
  shed_code text unique not null,
  shed_name text,
  zone text,
  division text,
  created_at timestamptz default now()
);

-- locomotives - main table
create table if not exists public.locomotives (
  id uuid primary key default gen_random_uuid(),
  loco_number text unique not null,
  loco_class text references public.loco_classes(class_code),
  shed text references public.sheds(shed_code),
  zone text,
  builder text,
  build_date date,
  -- New columns from your reference sheet
  kavach_make text,
  service_status text default 'active',
  verification_status text,
  last_verified date,
  additional_data jsonb default '{}'::jsonb,
  archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_loco_number on public.locomotives(loco_number);
create index if not exists idx_loco_class on public.locomotives(loco_class);
create index if not exists idx_loco_shed on public.locomotives(shed);
create index if not exists idx_loco_zone on public.locomotives(zone);
create index if not exists idx_loco_archived on public.locomotives(archived);

-- RLS
alter table public.loco_classes enable row level security;
alter table public.sheds enable row level security;
alter table public.locomotives enable row level security;

drop policy if exists read_all on public.locomotives;
create policy read_all on public.locomotives for select using (true);

drop policy if exists read_all_classes on public.loco_classes;
create policy read_all_classes on public.loco_classes for select using (true);

drop policy if exists read_all_sheds on public.sheds;
create policy read_all_sheds on public.sheds for select using (true);

-- Trigger to update updated_at
create or replace function public.update_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_loco_updated on public.locomotives;
create trigger trg_loco_updated before update on public.locomotives for each row execute function public.update_updated_at();

-- Sample data for testing (optional)
-- insert into public.loco_classes (class_code, class_name, traction) values ('WAP7', 'WAP-7', 'Electric') on conflict do nothing;
-- insert into public.sheds (shed_code, shed_name, zone) values ('LGD', 'Lallaguda', 'SCR') on conflict do nothing;
