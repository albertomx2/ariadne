-- Ariadne initial schema
-- U.S.-focused, multi-organization, privacy-first classroom support platform.

create extension if not exists pgcrypto;

create type public.organization_role as enum (
  'district_admin',
  'school_admin',
  'teacher',
  'special_educator',
  'slp',
  'paraprofessional',
  'occupational_therapist'
);

create type public.material_status as enum ('draft', 'review', 'published', 'archived');
create type public.vocabulary_kind as enum ('core', 'fringe', 'safety');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  district_name text,
  locale text not null default 'en-US',
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null,
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  display_name text not null,
  initials text,
  grade_label text,
  classroom_label text,
  active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_assignments (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  relationship public.organization_role not null,
  created_at timestamptz not null default now(),
  primary key (student_id, user_id)
);

create table public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null unique references public.students(id) on delete cascade,
  communication jsonb not null default '{}'::jsonb,
  receptive_language jsonb not null default '{}'::jsonb,
  representation_preferences jsonb not null default '{}'::jsonb,
  sensory_environmental_access jsonb not null default '{}'::jsonb,
  effective_supports jsonb not null default '[]'::jsonb,
  motivators_interests jsonb not null default '[]'::jsonb,
  emergency_communication jsonb not null default '{}'::jsonb,
  home_language text,
  instructional_language text not null default 'English',
  preferred_grid text,
  processing_time_seconds integer check (processing_time_seconds between 0 and 120),
  symbol_provider text not null default 'arasaac',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_observations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  context text not null,
  observation text not null,
  potential_barrier text,
  support_used text,
  outcome text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  context text,
  starts_at timestamptz,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_students (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  primary key (activity_id, student_id)
);

create table public.support_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete set null,
  title text not null,
  barrier_analysis jsonb not null default '[]'::jsonb,
  status public.material_status not null default 'draft',
  ai_generated boolean not null default false,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  published_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or reviewed_by is not null)
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  support_package_id uuid references public.support_packages(id) on delete set null,
  student_id uuid references public.students(id) on delete cascade,
  title text not null,
  material_type text not null,
  status public.material_status not null default 'draft',
  content jsonb not null default '{}'::jsonb,
  symbol_provider text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  published_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or reviewed_by is not null)
);

create table public.symbol_references (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  external_id text not null,
  label text not null,
  language text not null default 'en',
  variant jsonb not null default '{}'::jsonb,
  attribution text,
  created_at timestamptz not null default now(),
  unique (organization_id, provider, external_id, language, variant)
);

create table public.student_vocabulary (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  symbol_reference_id uuid references public.symbol_references(id) on delete set null,
  label text not null,
  kind public.vocabulary_kind not null,
  stable_position integer,
  category text,
  enabled boolean not null default true,
  feature_weights jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (student_id, label, stable_position),
  check (
    (kind = 'core' and stable_position is not null)
    or kind <> 'core'
  )
);

create table public.vocabulary_usage_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  vocabulary_id uuid references public.student_vocabulary(id) on delete set null,
  activity_id uuid references public.activities(id) on delete set null,
  material_id uuid references public.materials(id) on delete set null,
  event_type text not null check (event_type in ('selected', 'spoken', 'removed')),
  context_features jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table public.predictive_suggestion_audits (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete set null,
  suggested_vocabulary_ids uuid[] not null default '{}',
  feature_summary jsonb not null default '{}'::jsonb,
  model_version text not null,
  created_at timestamptz not null default now()
);

create table public.student_access_grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  access_method text not null check (
    access_method in ('trusted_device', 'class_code', 'qr_code', 'visual_pin')
  ),
  token_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  student_id uuid references public.students(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.organization_members membership
      where membership.organization_id = target_organization_id
        and membership.user_id = (select auth.uid())
    );
$$;

create or replace function private.has_org_role(
  target_organization_id uuid,
  allowed_roles public.organization_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.organization_members membership
      where membership.organization_id = target_organization_id
        and membership.user_id = (select auth.uid())
        and membership.role = any(allowed_roles)
    );
$$;

revoke all on function private.is_org_member(uuid) from public;
revoke all on function private.has_org_role(uuid, public.organization_role[]) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, public.organization_role[]) to authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function private.set_updated_at();
create trigger students_set_updated_at
before update on public.students
for each row execute function private.set_updated_at();
create trigger student_profiles_set_updated_at
before update on public.student_profiles
for each row execute function private.set_updated_at();
create trigger activities_set_updated_at
before update on public.activities
for each row execute function private.set_updated_at();
create trigger support_packages_set_updated_at
before update on public.support_packages
for each row execute function private.set_updated_at();
create trigger materials_set_updated_at
before update on public.materials
for each row execute function private.set_updated_at();
create trigger student_vocabulary_set_updated_at
before update on public.student_vocabulary
for each row execute function private.set_updated_at();

create index organization_members_user_idx
  on public.organization_members (user_id, organization_id);
create index students_org_idx on public.students (organization_id);
create index student_assignments_user_idx
  on public.student_assignments (user_id, student_id);
create index observations_student_time_idx
  on public.profile_observations (student_id, created_at desc);
create index activities_org_time_idx
  on public.activities (organization_id, starts_at);
create index materials_student_status_idx
  on public.materials (student_id, status);
create index vocabulary_student_kind_idx
  on public.student_vocabulary (student_id, kind);
create index usage_student_time_idx
  on public.vocabulary_usage_events (student_id, occurred_at desc);
create index audit_org_time_idx
  on public.audit_events (organization_id, occurred_at desc);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.students enable row level security;
alter table public.student_assignments enable row level security;
alter table public.student_profiles enable row level security;
alter table public.profile_observations enable row level security;
alter table public.activities enable row level security;
alter table public.activity_students enable row level security;
alter table public.support_packages enable row level security;
alter table public.materials enable row level security;
alter table public.symbol_references enable row level security;
alter table public.student_vocabulary enable row level security;
alter table public.vocabulary_usage_events enable row level security;
alter table public.predictive_suggestion_audits enable row level security;
alter table public.student_access_grants enable row level security;
alter table public.audit_events enable row level security;

create policy "Members can read their organizations"
on public.organizations for select
to authenticated
using (private.is_org_member(id));

create policy "Members can read organization membership"
on public.organization_members for select
to authenticated
using (private.is_org_member(organization_id));

create policy "Administrators manage organization membership"
on public.organization_members for all
to authenticated
using (
  private.has_org_role(
    organization_id,
    array['district_admin', 'school_admin']::public.organization_role[]
  )
)
with check (
  private.has_org_role(
    organization_id,
    array['district_admin', 'school_admin']::public.organization_role[]
  )
);

create policy "Members read students in their organization"
on public.students for select
to authenticated
using (private.is_org_member(organization_id));

create policy "Educators manage students in their organization"
on public.students for all
to authenticated
using (private.is_org_member(organization_id))
with check (
  private.is_org_member(organization_id)
  and created_by = (select auth.uid())
);

create policy "Members manage assignments in their organization"
on public.student_assignments for all
to authenticated
using (private.is_org_member(organization_id))
with check (private.is_org_member(organization_id));

create policy "Members manage profiles in their organization"
on public.student_profiles for all
to authenticated
using (private.is_org_member(organization_id))
with check (private.is_org_member(organization_id));

create policy "Members manage observations in their organization"
on public.profile_observations for all
to authenticated
using (private.is_org_member(organization_id))
with check (
  private.is_org_member(organization_id)
  and created_by = (select auth.uid())
);

create policy "Members manage activities in their organization"
on public.activities for all
to authenticated
using (private.is_org_member(organization_id))
with check (
  private.is_org_member(organization_id)
  and created_by = (select auth.uid())
);

create policy "Members manage activity students in their organization"
on public.activity_students for all
to authenticated
using (private.is_org_member(organization_id))
with check (private.is_org_member(organization_id));

create policy "Members manage support packages in their organization"
on public.support_packages for all
to authenticated
using (private.is_org_member(organization_id))
with check (private.is_org_member(organization_id));

create policy "Members manage materials in their organization"
on public.materials for all
to authenticated
using (private.is_org_member(organization_id))
with check (private.is_org_member(organization_id));

create policy "Members manage symbol references in their organization"
on public.symbol_references for all
to authenticated
using (private.is_org_member(organization_id))
with check (private.is_org_member(organization_id));

create policy "Members manage vocabulary in their organization"
on public.student_vocabulary for all
to authenticated
using (private.is_org_member(organization_id))
with check (private.is_org_member(organization_id));

create policy "Members record usage in their organization"
on public.vocabulary_usage_events for all
to authenticated
using (private.is_org_member(organization_id))
with check (private.is_org_member(organization_id));

create policy "Members read suggestion audits in their organization"
on public.predictive_suggestion_audits for select
to authenticated
using (private.is_org_member(organization_id));

create policy "Members read access grants in their organization"
on public.student_access_grants for select
to authenticated
using (private.is_org_member(organization_id));

create policy "Administrators create and revoke access grants"
on public.student_access_grants for all
to authenticated
using (
  private.has_org_role(
    organization_id,
    array[
      'district_admin',
      'school_admin',
      'teacher',
      'special_educator',
      'slp'
    ]::public.organization_role[]
  )
)
with check (
  private.has_org_role(
    organization_id,
    array[
      'district_admin',
      'school_admin',
      'teacher',
      'special_educator',
      'slp'
    ]::public.organization_role[]
  )
  and created_by = (select auth.uid())
);

create policy "Members read audit events in their organization"
on public.audit_events for select
to authenticated
using (private.is_org_member(organization_id));

grant select, insert, update, delete on
  public.organizations,
  public.organization_members,
  public.students,
  public.student_assignments,
  public.student_profiles,
  public.profile_observations,
  public.activities,
  public.activity_students,
  public.support_packages,
  public.materials,
  public.symbol_references,
  public.student_vocabulary,
  public.vocabulary_usage_events,
  public.predictive_suggestion_audits,
  public.student_access_grants,
  public.audit_events
to authenticated;

grant usage, select on all sequences in schema public to authenticated;
