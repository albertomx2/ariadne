-- A compact, versioned snapshot keeps the current hackathon application
-- synchronized while the normalized domain tables remain available for the
-- production data model. Every row is isolated by organization membership.

create table public.workspace_snapshots (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1 check (schema_version > 0),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger workspace_snapshots_set_updated_at
before update on public.workspace_snapshots
for each row execute function private.set_updated_at();

alter table public.workspace_snapshots enable row level security;

create policy "Members read their workspace snapshot"
on public.workspace_snapshots for select
to authenticated
using (private.is_org_member(organization_id));

create policy "Members create their workspace snapshot"
on public.workspace_snapshots for insert
to authenticated
with check (
  private.is_org_member(organization_id)
  and updated_by = (select auth.uid())
);

create policy "Members update their workspace snapshot"
on public.workspace_snapshots for update
to authenticated
using (private.is_org_member(organization_id))
with check (
  private.is_org_member(organization_id)
  and updated_by = (select auth.uid())
);

grant select, insert, update on public.workspace_snapshots to authenticated;

-- A signed-in educator can create exactly the first workspace they belong to.
-- Further team access is invite-only and continues to use organization roles.
create or replace function public.create_workspace(
  workspace_name text,
  classroom_name text default 'Classroom'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_organization_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if exists (
    select 1
    from public.organization_members
    where user_id = current_user_id
  ) then
    raise exception 'This account already belongs to a workspace';
  end if;

  insert into public.organizations (name)
  values (coalesce(nullif(trim(workspace_name), ''), 'Ariadne School'))
  returning id into new_organization_id;

  insert into public.organization_members (
    organization_id,
    user_id,
    role
  )
  values (
    new_organization_id,
    current_user_id,
    'school_admin'::public.organization_role
  );

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    new_organization_id,
    current_user_id,
    'workspace.created',
    'organization',
    new_organization_id,
    jsonb_build_object('classroom_name', classroom_name)
  );

  return new_organization_id;
end;
$$;

revoke all on function public.create_workspace(text, text) from public;
revoke execute on function public.create_workspace(text, text) from anon;
grant execute on function public.create_workspace(text, text) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workspace_snapshots'
  ) then
    alter publication supabase_realtime add table public.workspace_snapshots;
  end if;
end;
$$;
