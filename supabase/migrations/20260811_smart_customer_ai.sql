-- VisaDoo Smart Customer Reuse / Family profiles / Form Templates
-- Run in Supabase SQL Editor once. Existing application history remains the source of truth.

create table if not exists public.customer_families (
  id uuid primary key default gen_random_uuid(),
  family_name text not null,
  primary_customer_id uuid references public.customers(id) on delete set null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_family_members (
  family_id uuid not null references public.customer_families(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  relationship text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (family_id, customer_id)
);

create table if not exists public.visa_form_templates (
  id uuid primary key default gen_random_uuid(),
  country_slug text not null,
  name text not null,
  template_key text not null unique,
  reference_file_path text,
  field_map jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_families enable row level security;
alter table public.customer_family_members enable row level security;
alter table public.visa_form_templates enable row level security;

-- Admin-only back-office access. Adjust role names if your profiles table differs.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='customer_families' and policyname='admins_manage_customer_families') then
    create policy admins_manage_customer_families on public.customer_families for all to authenticated
      using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
      with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='customer_family_members' and policyname='admins_manage_customer_family_members') then
    create policy admins_manage_customer_family_members on public.customer_family_members for all to authenticated
      using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
      with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='visa_form_templates' and policyname='admins_manage_visa_form_templates') then
    create policy admins_manage_visa_form_templates on public.visa_form_templates for all to authenticated
      using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
      with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
  end if;
end $$;

insert into public.visa_form_templates(country_slug,name,template_key,reference_file_path,field_map)
values (
  'japan',
  'Japan Visa Application Form',
  'japan-tourist-standard',
  'assets/form-templates/japan-visa-reference.pdf',
  '{
    "surname":"last_name",
    "given_names":"first_name",
    "date_of_birth":"date_of_birth",
    "sex":"gender",
    "nationality":"nationality",
    "passport_number":"passport_number",
    "place_of_issue":"passport_issuing_country",
    "passport_issue_date":"passport_issue_date",
    "passport_expiry":"passport_expiry",
    "mobile":"phone",
    "email":"email"
  }'::jsonb
)
on conflict (template_key) do update set
  reference_file_path=excluded.reference_file_path,
  field_map=excluded.field_map,
  updated_at=now();
