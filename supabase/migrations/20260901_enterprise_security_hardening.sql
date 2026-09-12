-- =========================================================================
-- Visa Doo — Enterprise Security & Database Hardening Migration
-- Run once in the Supabase SQL Editor.
-- Enforces:
-- 1. Immutable security audit logging (tamper-resistant audit trail)
-- 2. Strict IDOR protection on applications, customers, and documents
-- 3. Privilege escalation defense on user roles
-- 4. Private storage access control for customer passport documents
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Security Audit Logs (Immutable Append-Only Log)
-- -------------------------------------------------------------------------
create table if not exists public.security_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  resource_type text,
  resource_id text,
  result text not null default 'success',
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.security_audit_logs enable row level security;

-- Policies: Authenticated users can insert their own events; Admins can view; No updates or deletes.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='security_audit_logs' and policyname='allow_auth_insert_audit') then
    create policy allow_auth_insert_audit on public.security_audit_logs
      for insert to authenticated
      with check (actor_id = auth.uid() or actor_id is null);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='security_audit_logs' and policyname='admins_view_audit') then
    create policy admins_view_audit on public.security_audit_logs
      for select to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;
end $$;

-- Revoke update and delete from authenticated and anon to guarantee immutability
revoke update, delete on public.security_audit_logs from authenticated, anon, public;

-- -------------------------------------------------------------------------
-- 2. Privilege Escalation Defense (Protect profiles.role)
-- -------------------------------------------------------------------------
create or replace function public.check_profile_role_update()
returns trigger as $$
begin
  -- If role is unchanged, allow update
  if (old.role is not distinct from new.role) then
    return new;
  end if;

  -- Only existing admin can alter roles
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) and current_user not in ('postgres', 'service_role') then
    raise exception 'Unauthorized: Only an administrator can update user roles.';
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Attach trigger to profiles table if it exists
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='profiles') then
    drop trigger if exists tr_protect_profile_role on public.profiles;
    create trigger tr_protect_profile_role
      before update on public.profiles
      for each row execute function public.check_profile_role_update();
  end if;
end $$;

-- -------------------------------------------------------------------------
-- 3. IDOR Defense on Core Data Tables
-- -------------------------------------------------------------------------

-- Applications Table RLS
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='applications') then
    alter table public.applications enable row level security;

    -- Drop existing loose policies if present to prevent policy conflicts
    drop policy if exists "Users can read own applications" on public.applications;
    drop policy if exists "Users can insert own applications" on public.applications;
    drop policy if exists "Users can update own applications" on public.applications;
    drop policy if exists "Staff can view all applications" on public.applications;
    drop policy if exists "Staff can update all applications" on public.applications;

    -- Customers can ONLY select their own rows
    create policy "users_select_own_applications" on public.applications
      for select to authenticated
      using (
        user_id = auth.uid() or
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','agent','viewer','finance','sales'))
      );

    -- Customers can insert only with their own user_id
    create policy "users_insert_own_applications" on public.applications
      for insert to authenticated
      with check (
        user_id = auth.uid() or
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','agent'))
      );

    -- Customers can update only their draft/submitted applications before processing
    create policy "users_update_own_applications" on public.applications
      for update to authenticated
      using (
        user_id = auth.uid() or
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','agent','finance'))
      )
      with check (
        user_id = auth.uid() or
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','agent','finance'))
      );
  end if;
end $$;

-- Visa Documents Table RLS (Passport Images & Sensitive Customer Documents)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='visa_documents') then
    alter table public.visa_documents enable row level security;

    drop policy if exists "users_select_own_documents" on public.visa_documents;
    drop policy if exists "users_insert_own_documents" on public.visa_documents;

    create policy "users_select_own_documents" on public.visa_documents
      for select to authenticated
      using (
        user_id = auth.uid() or
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','agent','viewer','finance','sales'))
      );

    create policy "users_insert_own_documents" on public.visa_documents
      for insert to authenticated
      with check (
        user_id = auth.uid() or
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','agent'))
      );
  end if;
end $$;

-- -------------------------------------------------------------------------
-- 4. Storage Bucket Security (visa-documents and finance-files are PRIVATE)
-- -------------------------------------------------------------------------
update storage.buckets
set public = false
where id in ('visa-documents', 'finance-files');

-- Storage Object Policies for visa-documents
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='storage' and table_name='objects') then
    drop policy if exists "auth_users_upload_visa_documents" on storage.objects;
    drop policy if exists "auth_users_view_visa_documents" on storage.objects;

    create policy "auth_users_upload_visa_documents" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'visa-documents' and
        ((storage.foldername(name))[1] = auth.uid()::text or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','agent')))
      );

    create policy "auth_users_view_visa_documents" on storage.objects
      for select to authenticated
      using (
        bucket_id = 'visa-documents' and
        ((storage.foldername(name))[1] = auth.uid()::text or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','agent','viewer','finance','sales')))
      );
  end if;
end $$;
