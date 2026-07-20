begin;

-- The existing constraint includes the legacy program_id column
-- and does not prevent duplicates when nullable values are used.
alter table public.course_offerings
drop constraint if exists course_offerings_unique;

-- Prevent duplicate offerings.
-- Empty level and null level are treated as the same shared-level value.
create unique index course_offerings_unique_v2
on public.course_offerings (
  course_id,
  session_id,
  semester,
  coalesce(nullif(trim(level), ''), '')
);

create or replace function public.create_course_offering_with_programs(
  p_course_id uuid,
  p_session_id uuid,
  p_semester public.semester,
  p_level text,
  p_program_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_offering_id uuid;
  v_program_ids uuid[];
  v_level text;
begin
  if p_course_id is null then
    raise exception using
      errcode = '22023',
      message = 'Course is required.';
  end if;

  if p_session_id is null then
    raise exception using
      errcode = '22023',
      message = 'Academic session is required.';
  end if;

  select array_agg(distinct program_id)
  into v_program_ids
  from unnest(p_program_ids) as program_id
  where program_id is not null;

  if coalesce(cardinality(v_program_ids), 0) = 0 then
    raise exception using
      errcode = '22023',
      message = 'Select at least one programme.';
  end if;

  v_level := nullif(trim(p_level), '');

  insert into public.course_offerings (
    course_id,
    session_id,
    semester,
    program_id,
    level,
    is_published
  )
  values (
    p_course_id,
    p_session_id,
    p_semester,
    null,
    v_level,
    false
  )
  returning id into v_offering_id;

  insert into public.course_offering_programs (
    course_offering_id,
    program_id
  )
  select
    v_offering_id,
    program_id
  from unnest(v_program_ids) as program_id;

  return v_offering_id;
end;
$$;

-- The RPC is called only through the server-side service-role client.
revoke all
on function public.create_course_offering_with_programs(
  uuid,
  uuid,
  public.semester,
  text,
  uuid[]
)
from public;

grant execute
on function public.create_course_offering_with_programs(
  uuid,
  uuid,
  public.semester,
  text,
  uuid[]
)
to service_role;

commit;