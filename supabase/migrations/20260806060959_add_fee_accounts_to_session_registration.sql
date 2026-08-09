begin;

-- One fee account per student session registration.
alter table public.student_fee_accounts
add constraint student_fee_accounts_student_registration_id_key
unique (student_registration_id);


-- =========================================================
-- SINGLE STUDENT SESSION REGISTRATION
-- =========================================================
create or replace function public.register_student_for_session(
  p_student_id uuid,
  p_session_id uuid,
  p_level text default null::text,
  p_status public.student_registration_status
    default 'registered'::public.student_registration_status
)
returns table(
  registration_id uuid,
  student_id uuid,
  session_id uuid,
  level text,
  status public.student_registration_status
)
language plpgsql
set search_path to 'public'
as $function$
declare
  v_student public.students%rowtype;
  v_session public.sessions%rowtype;
  v_level text;
  v_registration_id uuid;
  v_annual_fee numeric;
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
  where id = p_session_id
  for share;

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

  -- The target programme and session must have a fee plan.
  select annual_fee
  into v_annual_fee
  from public.program_fee_plans
  where program_id = v_student.program_id
    and session_id = p_session_id
  for share;

  if not found then
    raise exception using
      errcode = '22023',
      message =
        'No fee plan is configured for the student''s programme and academic session.';
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

  -- Create the fee account in the same transaction.
  insert into public.student_fee_accounts (
    student_registration_id,
    program_id,
    annual_fee,
    total_paid_approved,
    balance_due,
    payment_status
  )
  values (
    v_registration_id,
    v_student.program_id,
    v_annual_fee,
    0,
    v_annual_fee,
    'unpaid'
  );

  -- Update the student's current level only when explicitly supplied.
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
$function$;


-- =========================================================
-- BULK STUDENT SESSION REGISTRATION
-- =========================================================
create or replace function public.register_students_for_session(
  p_source_session_id uuid,
  p_target_session_id uuid,
  p_students jsonb
)
returns jsonb
language plpgsql
set search_path to 'public'
as $function$
declare
  v_target_session public.sessions%rowtype;
  v_student record;
  v_item record;

  v_registration_id uuid;
  v_annual_fee numeric;

  v_inserted_count integer := 0;
  v_updated_level_count integer := 0;
  v_affected_rows integer := 0;

  v_processed_student_ids uuid[] := array[]::uuid[];
  v_skipped jsonb := '[]'::jsonb;
begin
  if p_source_session_id is null then
    raise exception 'Source session is required.'
      using errcode = '22023';
  end if;

  if p_target_session_id is null then
    raise exception 'Target session is required.'
      using errcode = '22023';
  end if;

  if p_source_session_id = p_target_session_id then
    raise exception 'Source and target sessions must be different.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_students) <> 'array'
    or jsonb_array_length(p_students) = 0 then
    raise exception 'At least one student must be submitted.'
      using errcode = '22023';
  end if;

  perform 1
  from public.sessions
  where id = p_source_session_id
  for share;

  if not found then
    raise exception 'Source session not found.'
      using errcode = 'P0002';
  end if;

  select *
  into v_target_session
  from public.sessions
  where id = p_target_session_id
  for share;

  if not found then
    raise exception 'Target session not found.'
      using errcode = 'P0002';
  end if;

  if v_target_session.is_active is not true
    and v_target_session.end_date < current_date then
    raise exception 'A completed session cannot be used as the target.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.student_registrations
    where session_id = p_source_session_id
  ) then
    raise exception 'The source session has no registrations.'
      using errcode = '22023';
  end if;

  for v_item in
    select
      nullif(item ->> 'student_id', '')::uuid as student_id,
      nullif(btrim(item ->> 'level'), '') as level,
      coalesce(
        (item ->> 'update_student_level')::boolean,
        false
      ) as update_student_level
    from jsonb_array_elements(p_students) as item
  loop
    if v_item.student_id is null then
      raise exception 'Every submitted student requires a student_id.'
        using errcode = '22023';
    end if;

    if v_item.student_id = any(v_processed_student_ids) then
      v_skipped := v_skipped || jsonb_build_array(
        jsonb_build_object(
          'student_id', v_item.student_id,
          'reason', 'Duplicate student in submitted request.'
        )
      );

      continue;
    end if;

    v_processed_student_ids :=
      array_append(v_processed_student_ids, v_item.student_id);

    select
      students.id,
      students.status as student_status,
      students.archived_at,
      students.program_id,
      source_registration.status as source_registration_status
    into v_student
    from public.students
    join public.student_registrations as source_registration
      on source_registration.student_id = students.id
      and source_registration.session_id = p_source_session_id
    where students.id = v_item.student_id
    for update of students, source_registration;

    if not found then
      v_skipped := v_skipped || jsonb_build_array(
        jsonb_build_object(
          'student_id', v_item.student_id,
          'reason', 'Student is not registered in the source session.'
        )
      );

      continue;
    end if;

    if exists (
      select 1
      from public.student_registrations
      where student_id = v_item.student_id
        and session_id = p_target_session_id
    ) then
      v_skipped := v_skipped || jsonb_build_array(
        jsonb_build_object(
          'student_id', v_item.student_id,
          'reason', 'Student is already registered in the target session.'
        )
      );

      continue;
    end if;

    if v_student.archived_at is not null then
      v_skipped := v_skipped || jsonb_build_array(
        jsonb_build_object(
          'student_id', v_item.student_id,
          'reason', 'Student is archived.'
        )
      );

      continue;
    end if;

    if v_student.student_status is distinct from 'active' then
      v_skipped := v_skipped || jsonb_build_array(
        jsonb_build_object(
          'student_id', v_item.student_id,
          'reason',
          format(
            'Student status is %s.',
            coalesce(v_student.student_status, 'not set')
          )
        )
      );

      continue;
    end if;

    if v_student.source_registration_status = 'withdrawn' then
      v_skipped := v_skipped || jsonb_build_array(
        jsonb_build_object(
          'student_id', v_item.student_id,
          'reason', 'Source-session registration is withdrawn.'
        )
      );

      continue;
    end if;

    if v_student.program_id is null then
      v_skipped := v_skipped || jsonb_build_array(
        jsonb_build_object(
          'student_id', v_item.student_id,
          'reason', 'Student has no programme assigned.'
        )
      );

      continue;
    end if;

    -- Reset per-student variables before querying and inserting.
    v_annual_fee := null;
    v_registration_id := null;

    select annual_fee
    into v_annual_fee
    from public.program_fee_plans
    where program_id = v_student.program_id
      and session_id = p_target_session_id
    for share;

    if not found then
      v_skipped := v_skipped || jsonb_build_array(
        jsonb_build_object(
          'student_id', v_item.student_id,
          'reason',
          'No fee plan is configured for the student''s programme and target session.'
        )
      );

      continue;
    end if;

    insert into public.student_registrations (
      student_id,
      session_id,
      level,
      status
    )
    values (
      v_item.student_id,
      p_target_session_id,
      v_item.level,
      'registered'::public.student_registration_status
    )
    on conflict (student_id, session_id)
    do nothing
    returning id into v_registration_id;

    if v_registration_id is null then
      v_skipped := v_skipped || jsonb_build_array(
        jsonb_build_object(
          'student_id', v_item.student_id,
          'reason', 'Student was already registered by another request.'
        )
      );

      continue;
    end if;

    -- The fee account is created atomically with the registration.
    insert into public.student_fee_accounts (
      student_registration_id,
      program_id,
      annual_fee,
      total_paid_approved,
      balance_due,
      payment_status
    )
    values (
      v_registration_id,
      v_student.program_id,
      v_annual_fee,
      0,
      v_annual_fee,
      'unpaid'
    );

    v_inserted_count := v_inserted_count + 1;

    if v_item.update_student_level
      and v_item.level is not null then
      update public.students
      set
        level = v_item.level,
        updated_at = now()
      where id = v_item.student_id
        and level is distinct from v_item.level;

      get diagnostics v_affected_rows = row_count;

      v_updated_level_count :=
        v_updated_level_count + v_affected_rows;
    end if;
  end loop;

  return jsonb_build_object(
    'submitted_count', jsonb_array_length(p_students),
    'inserted_count', v_inserted_count,
    'updated_level_count', v_updated_level_count,
    'skipped_count', jsonb_array_length(v_skipped),
    'skipped', v_skipped
  );
end;
$function$;

commit;