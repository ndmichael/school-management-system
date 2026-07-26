begin;

create or replace function public.register_student_for_session(
  p_student_id uuid,
  p_session_id uuid,
  p_level text default null,
  p_status public.student_registration_status default 'registered'
)
returns table (
  registration_id uuid,
  student_id uuid,
  session_id uuid,
  level text,
  status public.student_registration_status
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_student public.students%rowtype;
  v_session public.sessions%rowtype;
  v_level text;
  v_registration_id uuid;
begin
  select *
  into v_student
  from public.students
  where id = p_student_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Student not found.';
  end if;

  if v_student.status <> 'active' then
    raise exception using
      errcode = '22023',
      message = 'Only active students can be registered.';
  end if;

  if v_student.program_id is null then
    raise exception using
      errcode = '22023',
      message = 'Assign the student to a programme first.';
  end if;

  select *
  into v_session
  from public.sessions
  where id = p_session_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Academic session not found.';
  end if;

  if v_session.end_date < current_date then
    raise exception using
      errcode = '22023',
      message = 'Students cannot be registered into a completed session.';
  end if;

  if p_status = 'withdrawn' then
    raise exception using
      errcode = '22023',
      message = 'A new session registration cannot start as withdrawn.';
  end if;

  v_level := coalesce(
    nullif(trim(p_level), ''),
    nullif(trim(v_student.level), '')
  );

  insert into public.student_registrations (
    student_id,
    session_id,
    level,
    status
  )
  values (
    p_student_id,
    p_session_id,
    v_level,
    p_status
  )
  returning id into v_registration_id;

  -- Update the student's current level only when the admin
  -- explicitly supplied a new level.
  if nullif(trim(p_level), '') is not null then
    update public.students
    set
      level = nullif(trim(p_level), ''),
      updated_at = now()
    where id = p_student_id;
  end if;

  return query
  select
    v_registration_id,
    p_student_id,
    p_session_id,
    v_level,
    p_status;
end;
$$;

revoke all
on function public.register_student_for_session(
  uuid,
  uuid,
  text,
  public.student_registration_status
)
from public;

grant execute
on function public.register_student_for_session(
  uuid,
  uuid,
  text,
  public.student_registration_status
)
to service_role;

commit;