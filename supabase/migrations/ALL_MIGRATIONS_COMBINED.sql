-- Combined Schema for easy deployment

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


-- --- 0002_admin_auth.sql (your existing) ---
-- Keep your original 0002 here if you have it, else this placeholder works

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
create or replace function public.is_admin() returns boolean language sql security definer as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;


-- --- 0003_approval_system.sql ---
-- Migration 0003: Approval workflow, comments, bulk upload, master admin
-- Run in Supabase SQL Editor AFTER 0002_admin_auth.sql

alter table public.admin_users add column if not exists role text not null default 'admin' check (role in ('admin','master_admin'));
alter table public.admin_users add column if not exists display_name text;
alter table public.admin_users add column if not exists created_at timestamptz default now();

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('add','edit','bulk_upload')),
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  submitted_by uuid not null references auth.users(id),
  submitted_at timestamptz not null default now(),
  locomotive_number text,
  previous_data jsonb,
  proposed_data jsonb not null,
  reason text,
  admin_comment text,
  excel_file_name text,
  excel_file_url text,
  review_notes jsonb,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  declined_by uuid references auth.users(id),
  declined_at timestamptz,
  decline_reason text
);

create table if not exists public.bulk_upload_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.approval_requests(id) on delete cascade,
  row_number int not null,
  locomotive_number text not null,
  status text not null check (status in ('new','existing_update','duplicate','invalid')),
  proposed_data jsonb not null,
  missing_fields text[],
  validation_errors text[],
  previous_data jsonb
);

create table if not exists public.locomotive_comments (
  id uuid primary key default gen_random_uuid(),
  locomotive_number text not null,
  comment text not null,
  reason text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.locomotive_activity_log (
  id uuid primary key default gen_random_uuid(),
  locomotive_number text not null,
  action text not null check (action in ('submitted','approved','declined','commented','bulk_submitted')),
  field_name text,
  old_value text,
  new_value text,
  performed_by uuid not null references auth.users(id),
  performed_at timestamptz not null default now(),
  reason text,
  request_id uuid references public.approval_requests(id)
);

alter table public.approval_requests enable row level security;
alter table public.bulk_upload_items enable row level security;
alter table public.locomotive_comments enable row level security;
alter table public.locomotive_activity_log enable row level security;

drop policy if exists admin_read_approval on public.approval_requests;
drop policy if exists admin_insert_approval on public.approval_requests;
drop policy if exists master_update_approval on public.approval_requests;
create policy admin_read_approval on public.approval_requests for select using (public.is_admin() and (submitted_by = auth.uid() or exists (select 1 from public.admin_users where user_id = auth.uid() and role='master_admin')));
create policy admin_insert_approval on public.approval_requests for insert with check (public.is_admin() and submitted_by = auth.uid());
create policy master_update_approval on public.approval_requests for update using (exists (select 1 from public.admin_users where user_id = auth.uid() and role='master_admin'));

drop policy if exists admin_bulk_read on public.bulk_upload_items;
create policy admin_bulk_read on public.bulk_upload_items for select using (public.is_admin());
drop policy if exists admin_bulk_insert on public.bulk_upload_items;
create policy admin_bulk_insert on public.bulk_upload_items for insert with check (public.is_admin());

drop policy if exists admin_comment_read on public.locomotive_comments;
create policy admin_comment_read on public.locomotive_comments for select using (public.is_admin());
drop policy if exists admin_comment_insert on public.locomotive_comments;
create policy admin_comment_insert on public.locomotive_comments for insert with check (public.is_admin() and created_by = auth.uid());

drop policy if exists admin_activity_read on public.locomotive_activity_log;
create policy admin_activity_read on public.locomotive_activity_log for select using (public.is_admin());
drop policy if exists admin_activity_insert on public.locomotive_activity_log;
create policy admin_activity_insert on public.locomotive_activity_log for insert with check (public.is_admin());

drop policy if exists admin_insert on public.locomotives;
drop policy if exists admin_update on public.locomotives;
drop policy if exists master_admin_insert on public.locomotives;
drop policy if exists master_admin_update on public.locomotives;
create policy master_admin_insert on public.locomotives for insert with check (exists (select 1 from public.admin_users where user_id = auth.uid() and role='master_admin'));
create policy master_admin_update on public.locomotives for update using (exists (select 1 from public.admin_users where user_id = auth.uid() and role='master_admin'));

create or replace function public.is_master_admin() returns boolean language sql security definer as $$ select exists (select 1 from public.admin_users where user_id = auth.uid() and role='master_admin'); $$;

create or replace function public.approve_request(p_request_id uuid, p_master_id uuid) returns void language plpgsql security definer as $$
declare req record; item record;
begin
  if not exists (select 1 from public.admin_users where user_id = p_master_id and role='master_admin') then raise exception 'Not authorized'; end if;
  select * into req from public.approval_requests where id = p_request_id and status='pending';
  if not found then raise exception 'Request not found or not pending'; end if;
  if req.submitted_by = p_master_id then raise exception 'Cannot approve own request'; end if;
  if req.request_type in ('add','edit') then
    insert into public.locomotives (loco_number, loco_class, shed, zone, builder, additional_data)
    values ((req.proposed_data->>'loco_number'), (req.proposed_data->>'class'), (req.proposed_data->>'shed'), (req.proposed_data->>'zone'), (req.proposed_data->>'builder'), req.proposed_data)
    on conflict (loco_number) do update set loco_class = coalesce(nullif(excluded.loco_class,''), public.locomotives.loco_class), shed = coalesce(nullif(excluded.shed,''), public.locomotives.shed), zone = coalesce(nullif(excluded.zone,''), public.locomotives.zone), builder = coalesce(nullif(excluded.builder,''), public.locomotives.builder), additional_data = public.locomotives.additional_data || excluded.additional_data;
  elsif req.request_type = 'bulk_upload' then
    for item in select * from public.bulk_upload_items where request_id = p_request_id and status in ('new','existing_update') loop
      insert into public.locomotives (loco_number, loco_class, shed, zone, builder, additional_data) values (item.locomotive_number, item.proposed_data->>'class', item.proposed_data->>'shed', item.proposed_data->>'zone', item.proposed_data->>'builder', item.proposed_data)
      on conflict (loco_number) do update set loco_class = coalesce(nullif(item.proposed_data->>'class',''), public.locomotives.loco_class), shed = coalesce(nullif(item.proposed_data->>'shed',''), public.locomotives.shed), zone = coalesce(nullif(item.proposed_data->>'zone',''), public.locomotives.zone), builder = coalesce(nullif(item.proposed_data->>'builder',''), public.locomotives.builder), additional_data = public.locomotives.additional_data || item.proposed_data;
    end loop;
  end if;
  update public.approval_requests set status='approved', approved_by=p_master_id, approved_at=now() where id=p_request_id;
  insert into public.locomotive_activity_log (locomotive_number, action, performed_by, reason, request_id) values (coalesce(req.locomotive_number,'BULK'), 'approved', p_master_id, 'Approved via master dashboard', p_request_id);
end $$;

create or replace function public.decline_request(p_request_id uuid, p_master_id uuid, p_reason text) returns void language plpgsql security definer as $$
begin
  if not exists (select 1 from public.admin_users where user_id = p_master_id and role='master_admin') then raise exception 'Not authorized'; end if;
  update public.approval_requests set status='declined', declined_by=p_master_id, declined_at=now(), decline_reason=p_reason where id=p_request_id and status='pending';
  if not found then raise exception 'Request not found or not pending'; end if;
end $$;
