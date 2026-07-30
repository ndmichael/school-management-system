create or replace function public.register_students_for_session(
  p_source_session_id uuid,
  p_target_session_id uuid,
  p_students jsonb
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_target_session public.sessions%rowtype;
  v_student record;
  v_item record;

  v_inserted_count integer := 0;
  v_updated_level_count integer := 0;
  v_affected_rows integer := 0;

  v_processed_student_ids uuid[] := array[]::uuid[];
  v_skipped jsonb := '[]'::jsonb;
begin
  /*
   * Validate the overall request before processing students.
   */
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

  /*
   * Lock both session records so their state cannot change
   * while the bulk operation is running.
   */
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

  /*
   * An inactive session whose end date has passed is completed.
   * Active and upcoming sessions remain valid targets.
   */
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

  /*
   * Each JSON object should contain:
   *
   * {
   *   "student_id": "uuid",
   *   "level": "ND II",
   *   "update_student_level": true
   * }
   */
  for v_item in
    select
      nullif(item ->> 'student_id', '')::uuid
        as student_id,

      nullif(btrim(item ->> 'level'), '')
        as level,

      coalesce(
        (item ->> 'update_student_level')::boolean,
        false
      ) as update_student_level
    from jsonb_array_elements(p_students) as item
  loop
    /*
     * Missing student IDs indicate a malformed request,
     * so the entire operation is rejected.
     */
    if v_item.student_id is null then
      raise exception 'Every submitted student requires a student_id.'
        using errcode = '22023';
    end if;

    /*
     * Prevent the same student from being processed twice
     * when the request accidentally contains duplicates.
     */
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
      array_append(
        v_processed_student_ids,
        v_item.student_id
      );

    /*
     * Confirm that the student belongs to the source session.
     *
     * The student and source registration are locked so their
     * statuses cannot change during processing.
     */
    select
      students.id,
      students.status as student_status,
      students.archived_at,
      students.program_id,
      source_registration.status
        as source_registration_status
    into v_student
    from public.students
    join public.student_registrations
      as source_registration
      on source_registration.student_id = students.id
      and source_registration.session_id =
        p_source_session_id
    where students.id = v_item.student_id
    for update of students, source_registration;

    if not found then
      v_skipped := v_skipped || jsonb_build_array(
        jsonb_build_object(
          'student_id', v_item.student_id,
          'reason',
          'Student is not registered in the source session.'
        )
      );

      continue;
    end if;

    /*
     * Recheck duplicate registrations on the backend.
     */
    if exists (
      select 1
      from public.student_registrations
      where student_id = v_item.student_id
        and session_id = p_target_session_id
    ) then
      v_skipped := v_skipped || jsonb_build_array(
        jsonb_build_object(
          'student_id', v_item.student_id,
          'reason',
          'Student is already registered in the target session.'
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
          'reason',
          'Source-session registration is withdrawn.'
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

    /*
     * Insert the target registration.
     *
     * The unique constraint remains the final protection against
     * concurrent duplicate registrations.
     */
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
    do nothing;

    get diagnostics v_affected_rows = row_count;

    /*
     * A zero row count means another request registered the
     * student between our earlier check and the insert.
     */
    if v_affected_rows = 0 then
      v_skipped := v_skipped || jsonb_build_array(
        jsonb_build_object(
          'student_id', v_item.student_id,
          'reason',
          'Student was already registered by another request.'
        )
      );

      continue;
    end if;

    v_inserted_count := v_inserted_count + 1;

    /*
     * Updating students.level is optional.
     *
     * A null submitted level never blocks registration and does
     * not erase the student's existing level.
     */
    if v_item.update_student_level
      and v_item.level is not null then
      update public.students
      set level = v_item.level
      where id = v_item.student_id
        and level is distinct from v_item.level;

      get diagnostics v_affected_rows = row_count;

      v_updated_level_count :=
        v_updated_level_count + v_affected_rows;
    end if;
  end loop;

  return jsonb_build_object(
    'submitted_count',
    jsonb_array_length(p_students),

    'inserted_count',
    v_inserted_count,

    'updated_level_count',
    v_updated_level_count,

    'skipped_count',
    jsonb_array_length(v_skipped),

    'skipped',
    v_skipped
  );
end;
$$;

/*
 * Only the server-side service-role client should execute
 * this RPC. The browser must call the protected API route.
 */
revoke all
on function public.register_students_for_session(
  uuid,
  uuid,
  jsonb
)
from public, anon, authenticated;

grant execute
on function public.register_students_for_session(
  uuid,
  uuid,
  jsonb
)
to service_role;