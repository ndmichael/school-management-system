begin;

/*
 * Returns student IDs matching a matriculation number, email address,
 * or any combination of first, middle, and last-name tokens.
 *
 * ILIKE makes matching case-insensitive. Splitting the search into tokens
 * allows "John Doe" to match a profile stored as:
 * first_name = John, middle_name = Michael, last_name = Doe.
 */
create or replace function public.search_student_ids(
  p_search text
)
returns table (
  student_id uuid
)
language sql
stable
security invoker
set search_path = public
as $$
  with normalized_search as (
    select regexp_replace(
      trim(coalesce(p_search, '')),
      '\s+',
      ' ',
      'g'
    ) as query
  ),
  search_tokens as (
    select token
    from normalized_search,
    lateral regexp_split_to_table(query, '\s+') as token
    where token <> ''
  )
  select distinct s.id as student_id
  from public.students as s
  inner join public.profiles as p
    on p.id = s.profile_id
  cross join normalized_search as normalized
  where s.archived_at is null
    and normalized.query <> ''
    and (
      /* Match the complete search phrase against matric number or email. */
      s.matric_no ilike '%' || normalized.query || '%'
      or p.email ilike '%' || normalized.query || '%'

      /*
       * Every name token must appear somewhere in the combined name.
       * Token order does not matter, so both "John Doe" and "Doe John" match.
       */
      or not exists (
        select 1
        from search_tokens as search_token
        where concat_ws(
          ' ',
          p.first_name,
          p.middle_name,
          p.last_name
        ) not ilike '%' || search_token.token || '%'
      )
    );
$$;

/* Keep this search function private to trusted server-side code. */
revoke all
on function public.search_student_ids(text)
from public;

grant execute
on function public.search_student_ids(text)
to service_role;

commit;