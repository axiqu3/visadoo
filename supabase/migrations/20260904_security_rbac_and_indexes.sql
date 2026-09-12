-- =========================================================================
-- Visa Doo — Enterprise RBAC, RLS Hardening & Database Index Migration
-- Date: 2026-09-04
-- Execute in the Supabase SQL Editor.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Applications Performance Composite Index
-- -------------------------------------------------------------------------
create index if not exists idx_applications_user_status_created
  on public.applications (user_id, status, created_at desc);

-- -------------------------------------------------------------------------
-- 2. Protect Applications User Deletion (ON DELETE SET NULL)
-- -------------------------------------------------------------------------
-- Prevents deletion of a user profile/account from destroying historical
-- financial, booking and audit records in the applications table.
do $$
declare
  fk_name text;
begin
  select tc.constraint_name into fk_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
    and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'applications'
    and kcu.column_name = 'user_id'
    and tc.constraint_type = 'FOREIGN KEY'
  limit 1;

  if fk_name is not null then
    execute format('alter table public.applications drop constraint %I', fk_name);
    alter table public.applications
      add constraint applications_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete set null;
  end if;
end $$;

-- -------------------------------------------------------------------------
-- 3. Visa Types Catalog RLS & Role-Based Access Control
-- -------------------------------------------------------------------------
alter table public.visa_types enable row level security;

-- Public & Customers can read active visa types
drop policy if exists "allow_public_read_visa_types" on public.visa_types;
create policy "allow_public_read_visa_types" on public.visa_types
  for select
  using (true);

-- Only Admin & Content editors can create, modify, or remove visa types
drop policy if exists "allow_staff_manage_visa_types" on public.visa_types;
create policy "allow_staff_manage_visa_types" on public.visa_types
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'content')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'content')
    )
  );

-- -------------------------------------------------------------------------
-- 4. Countries Catalog RLS
-- -------------------------------------------------------------------------
alter table public.countries enable row level security;

-- Public can read all destination countries
drop policy if exists "allow_public_read_countries" on public.countries;
create policy "allow_public_read_countries" on public.countries
  for select
  using (true);

-- Only Admin & Content editors can modify destination country records
drop policy if exists "allow_staff_manage_countries" on public.countries;
create policy "allow_staff_manage_countries" on public.countries
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'content')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'content')
    )
  );

-- -------------------------------------------------------------------------
-- 5. Site Settings RLS
-- -------------------------------------------------------------------------
alter table public.site_settings enable row level security;

drop policy if exists "allow_public_read_site_settings" on public.site_settings;
create policy "allow_public_read_site_settings" on public.site_settings
  for select
  using (true);

drop policy if exists "allow_admin_manage_site_settings" on public.site_settings;
create policy "allow_admin_manage_site_settings" on public.site_settings
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- -------------------------------------------------------------------------
-- 6. Storage Bucket Privacy (visa-documents is private)
-- -------------------------------------------------------------------------
update storage.buckets
set public = false
where id in ('visa-documents', 'finance-files');
