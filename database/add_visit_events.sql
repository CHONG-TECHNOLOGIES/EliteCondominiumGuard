-- Add visit_events table for visit status tracking
create table if not exists public.visit_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  visit_id int4 not null references public.visits(id) on delete cascade,
  status text not null,
  event_at timestamptz not null,
  actor_id int4 null references public.staff(id),
  device_id uuid null references public.devices(id)
);

create index if not exists visit_events_visit_id_idx
  on public.visit_events (visit_id);

create index if not exists visit_events_event_at_idx
  on public.visit_events (event_at);

create or replace function public.create_visit_event(p_data jsonb)
returns public.visit_events
language plpgsql
as $$
declare
  v public.visit_events;
begin
  insert into public.visit_events (
    visit_id,
    status,
    event_at,
    actor_id,
    device_id
  )
  values (
    (p_data->>'visit_id')::int4,
    p_data->>'status',
    coalesce((p_data->>'event_at')::timestamptz, now()),
    nullif(p_data->>'actor_id', '')::int4,
    nullif(p_data->>'device_id', '')::uuid
  )
  returning * into v;

  return v;
end;
$$;

grant execute on function public.create_visit_event(jsonb) to anon, authenticated;

create or replace function public.get_visit_events(p_visit_id int4)
returns setof public.visit_events
language sql
as $$
  select *
  from public.visit_events
  where visit_id = p_visit_id
  order by event_at asc;
$$;

grant execute on function public.get_visit_events(int4) to anon, authenticated;
