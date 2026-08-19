begin;

-- 1. Add reversal audit fields.
alter table public.payment_receipts
add column reversed_by uuid references public.profiles(id),
add column reversed_at timestamptz,
add column reversal_reason text;


-- 2. Allow the new "reversed" status.
alter table public.payment_receipts
drop constraint payment_receipts_status_check;

alter table public.payment_receipts
add constraint payment_receipts_status_check
check (
  status in ('pending', 'approved', 'rejected', 'reversed')
);


-- 3. Update the receipt state rules.
alter table public.payment_receipts
drop constraint payment_receipts_review_state_check;

alter table public.payment_receipts
add constraint payment_receipts_review_state_check
check (
  (
    status = 'pending'
    and approved_amount is null
    and verified_by is null
    and verified_at is null
    and rejected_by is null
    and rejected_at is null
    and reversed_by is null
    and reversed_at is null
    and reversal_reason is null
  )
  or
  (
    status = 'approved'
    and approved_amount = amount_submitted
    and verified_by is not null
    and verified_at is not null
    and rejected_by is null
    and rejected_at is null
    and reversed_by is null
    and reversed_at is null
    and reversal_reason is null
  )
  or
  (
    status = 'rejected'
    and approved_amount is null
    and verified_by is null
    and verified_at is null
    and rejected_by is not null
    and rejected_at is not null
    and reversed_by is null
    and reversed_at is null
    and reversal_reason is null
  )
  or
  (
    status = 'reversed'
    and approved_amount = amount_submitted
    and verified_by is not null
    and verified_at is not null
    and reversed_by is not null
    and reversed_at is not null
    and nullif(btrim(reversal_reason), '') is not null
  )
);


-- 4. Transactional reversal RPC.
create or replace function public.reverse_payment_receipt(
  p_receipt_id uuid,
  p_reviewer_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
set search_path to 'public'
as $function$
declare
  v_receipt public.payment_receipts%rowtype;
  v_fee_account public.student_fee_accounts%rowtype;

  v_new_total_paid numeric := 0;
  v_new_balance numeric := 0;
  v_payment_status text;
begin

  if nullif(btrim(p_reason), '') is null then
    raise exception 'A reversal reason is required.'
      using errcode = '22023';
  end if;

  -- Lock the receipt so two people cannot reverse it simultaneously.
  select *
  into v_receipt
  from public.payment_receipts
  where id = p_receipt_id
  for update;

  if not found then
    raise exception 'Receipt not found.'
      using errcode = 'P0002';
  end if;

  if v_receipt.status <> 'approved' then
    raise exception 'Only approved receipts can be reversed.'
      using errcode = '22023';
  end if;

  -- Lock the student's fee account too.
  select *
  into v_fee_account
  from public.student_fee_accounts
  where id = v_receipt.student_fee_account_id
  for update;

  if not found then
    raise exception 'Student fee account not found.'
      using errcode = 'P0002';
  end if;

  -- Preserve the original approval details.
  -- We only change the receipt's current state.
  update public.payment_receipts
  set
    status = 'reversed',
    reversed_by = p_reviewer_id,
    reversed_at = now(),
    reversal_reason = btrim(p_reason),
    updated_at = now()
  where id = p_receipt_id;

  -- Recalculate from receipts that are STILL approved.
  select coalesce(sum(approved_amount), 0)
  into v_new_total_paid
  from public.payment_receipts
  where student_fee_account_id = v_fee_account.id
    and status = 'approved';

  v_new_balance :=
    greatest(v_fee_account.annual_fee - v_new_total_paid, 0);

  if v_new_balance = 0 then
    v_payment_status := 'paid';
  elsif v_new_total_paid > 0 then
    v_payment_status := 'partial';
  else
    v_payment_status := 'unpaid';
  end if;

  update public.student_fee_accounts
  set
    total_paid_approved = v_new_total_paid,
    balance_due = v_new_balance,
    payment_status = v_payment_status,
    updated_at = now()
  where id = v_fee_account.id;

  return jsonb_build_object(
    'receipt_id', p_receipt_id,
    'status', 'reversed',
    'total_paid_approved', v_new_total_paid,
    'balance_due', v_new_balance,
    'payment_status', v_payment_status
  );

end;
$function$;

commit;