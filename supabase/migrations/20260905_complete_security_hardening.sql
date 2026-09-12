-- =========================================================================
-- Visa Doo — Complete Enterprise Security & RLS Hardening Migration
-- Date: 2026-09-05
-- Production Defense-in-Depth for Authorization, IDOR, Storage & Audit Trail
-- Run once in the Supabase SQL Editor.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. Ensure All Tables Have Row Level Security (RLS) Enabled
-- -------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='profiles') then
    alter table public.profiles enable row level security;
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='applications') then
    alter table public.applications enable row level security;
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='visa_documents') then
    alter table public.visa_documents enable row level security;
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='security_audit_logs') then
    alter table public.security_audit_logs enable row level security;
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='customer_families') then
    alter table public.customer_families enable row level security;
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='customer_family_members') then
    alter table public.customer_family_members enable row level security;
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='visa_form_templates') then
    alter table public.visa_form_templates enable row level security;
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='visa_types') then
    alter table public.visa_types enable row level security;
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='countries') then
    alter table public.countries enable row level security;
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='site_settings') then
    alter table public.site_settings enable row level security;
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='customers') then
    alter table public.customers enable row level security;
  end if;
end $$;

-- -------------------------------------------------------------------------
-- 2. Profiles Table RLS & Role Escalation Defense
-- -------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='profiles') then
    drop policy if exists "allow_user_select_own_profile" on public.profiles;
    drop policy if exists "allow_staff_select_all_profiles" on public.profiles;
    drop policy if exists "allow_user_update_own_profile" on public.profiles;
    drop policy if exists "allow_admin_manage_profiles" on public.profiles;

    create policy "allow_user_select_own_profile" on public.profiles
      for select to authenticated
      using (
        id = auth.uid() or
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','agent','viewer','finance','sales'))
      );

    create policy "allow_user_update_own_profile" on public.profiles
      for update to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());

    create policy "allow_admin_manage_profiles" on public.profiles
      for all to authenticated
      using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;
end $$;

-- Trigger ensuring non-admins cannot escalate their own role
create or replace function public.check_profile_role_update()
returns trigger as $$
begin
  if (old.role is not distinct from new.role) then
    return new;
  end if;

  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) and current_user not in ('postgres', 'service_role') then
    raise exception 'Unauthorized: Only an administrator can update user roles.';
  end if;

  return new;
end;
$$ language plpgsql security definer;

do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='profiles') then
    drop trigger if exists tr_protect_profile_role on public.profiles;
    create trigger tr_protect_profile_role
      before update on public.profiles
      for each row execute function public.check_profile_role_update();
  end if;
end $$;

-- -------------------------------------------------------------------------
-- 3. Applications Table IDOR & RBAC Hardening
-- -------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='applications') then
    drop policy if exists "users_select_own_applications" on public.applications;
    drop policy if exists "users_insert_own_applications" on public.applications;
    drop policy if exists "users_update_own_applications" on public.applications;

    create policy "users_select_own_applications" on public.applications
      for select to authenticated
      using (
        user_id = auth.uid() or
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','agent','viewer','finance','sales'))
      );

    create policy "users_insert_own_applications" on public.applications
      for insert to authenticated
      with check (
        user_id = auth.uid() or
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','agent'))
      );

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

-- -------------------------------------------------------------------------
-- 4. Visa Documents Table Hardening (Passports & Sensitive Proofs)
-- -------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='visa_documents') then
    drop policy if exists "users_select_own_documents" on public.visa_documents;
    drop policy if exists "users_insert_own_documents" on public.visa_documents;
    drop policy if exists "users_delete_own_documents" on public.visa_documents;

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

    create policy "users_delete_own_documents" on public.visa_documents
      for delete to authenticated
      using (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','agent'))
      );
  end if;
end $$;

-- -------------------------------------------------------------------------
-- 5. Security Audit Trail (Immutable Append-Only Log)
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

alter table public.security_audit_logs enable row level security;

do $$ begin
  drop policy if exists "allow_auth_insert_audit" on public.security_audit_logs;
  drop policy if exists "admins_view_audit" on public.security_audit_logs;

  create policy "allow_auth_insert_audit" on public.security_audit_logs
    for insert to authenticated
    with check (actor_id = auth.uid() or actor_id is null);

  create policy "admins_view_audit" on public.security_audit_logs
    for select to authenticated
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
end $$;

-- Revoke all update and delete permissions to ensure immutable audit log
revoke update, delete, truncate on public.security_audit_logs from authenticated, anon, public;

-- -------------------------------------------------------------------------
-- 6. Storage Buckets Private Isolation & Object Policies
-- -------------------------------------------------------------------------
update storage.buckets
set public = false
where id in ('visa-documents', 'finance-files');

do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='storage' and table_name='objects') then
    drop policy if exists "auth_users_upload_visa_documents" on storage.objects;
    drop policy if exists "auth_users_view_visa_documents" on storage.objects;
    drop policy if exists "staff_manage_finance_files" on storage.objects;

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

    create policy "staff_manage_finance_files" on storage.objects
      for all to authenticated
      using (
        bucket_id = 'finance-files' and
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','finance','agent'))
      )
      with check (
        bucket_id = 'finance-files' and
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','finance','agent'))
      );
  end if;
end $$;
