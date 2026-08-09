begin;

-- =========================================================
-- 1. KEEP RECEIPT STATUS VALUES VALID
-- =========================================================

alter table public.payment_receipts
add constraint payment_receipts_status_check
check (
  status in ('pending', 'approved', 'rejected')
);


-- =========================================================
-- 2. KEEP APPROVED AMOUNTS VALID
-- =========================================================

alter table public.payment_receipts
add constraint payment_receipts_approved_amount_check
check (
  approved_amount is null
  or (
    approved_amount > 0
    and approved_amount <= amount_submitted
  )
);


-- =========================================================
-- 3. SEPARATE STUDENT REMARKS FROM BURSARY REMARKS
-- =========================================================

alter table public.payment_receipts
add column review_remarks text;


-- =========================================================
-- 4. KEEP RECEIPT STATES CONSISTENT
-- =========================================================

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
  )
  or
  (
    status = 'approved'
    and approved_amount = amount_submitted
    and verified_by is not null
    and verified_at is not null
    and rejected_by is null
    and rejected_at is null
  )
  or
  (
    status = 'rejected'
    and approved_amount is null
    and verified_by is null
    and verified_at is null
    and rejected_by is not null
    and rejected_at is not null
  )
);


-- =========================================================
-- 5. TRANSACTIONAL RECEIPT REVIEW
-- =========================================================

create or replace function public.review_payment_receipt(
  p_receipt_id uuid,
  p_action text,
  p_reviewer_id uuid,
  p_review_remarks text default null
)
returns jsonb
language plpgsql
set search_path to 'public'
as $function$
declare
  v_receipt public.payment_receipts%rowtype;
  v_fee_account public.student_fee_accounts%rowtype;

  v_current_paid numeric := 0;
  v_new_total_paid numeric := 0;
  v_new_balance numeric := 0;
  v_payment_status text;
begin

  -- Only two actions are accepted.
  if p_action not in ('approve', 'reject') then
    raise exception 'Invalid review action.'
      using errcode = '22023';
  end if;


  -- -------------------------------------------------------
  -- Lock the receipt.
  --
  -- FOR UPDATE means another reviewer cannot change this
  -- receipt until this transaction finishes.
  -- -------------------------------------------------------

  select *
  into v_receipt
  from public.payment_receipts
  where id = p_receipt_id
  for update;

  if not found then
    raise exception 'Receipt not found.'
      using errcode = 'P0002';
  end if;


  -- A reviewed receipt cannot simply be reviewed again.
  if v_receipt.status <> 'pending' then
    raise exception 'Only pending receipts can be reviewed.'
      using errcode = '22023';
  end if;


  -- =======================================================
  -- REJECTION
  -- =======================================================

  if p_action = 'reject' then

    if nullif(btrim(p_review_remarks), '') is null then
      raise exception 'A reason is required when rejecting a receipt.'
        using errcode = '22023';
    end if;

    update public.payment_receipts
    set
      status = 'rejected',
      approved_amount = null,

      rejected_by = p_reviewer_id,
      rejected_at = now(),

      verified_by = null,
      verified_at = null,

      review_remarks = btrim(p_review_remarks),
      updated_at = now()
    where id = p_receipt_id;

    return jsonb_build_object(
      'receipt_id', p_receipt_id,
      'status', 'rejected'
    );
  end if;


  -- =======================================================
  -- APPROVAL
  -- =======================================================

  -- Lock the student's fee account too.
  --
  -- This is important when two bursary officers approve
  -- two receipts for the same student at the same time.
  select *
  into v_fee_account
  from public.student_fee_accounts
  where id = v_receipt.student_fee_account_id
  for update;

  if not found then
    raise exception 'Student fee account not found.'
      using errcode = 'P0002';
  end if;


  -- Calculate the real amount already approved from receipts.
  --
  -- We do not blindly trust student_fee_accounts.total_paid_approved.
  select coalesce(sum(approved_amount), 0)
  into v_current_paid
  from public.payment_receipts
  where student_fee_account_id = v_fee_account.id
    and status = 'approved';


  -- Do not allow the student to pay more than their annual fee.
  if v_receipt.amount_submitted >
     (v_fee_account.annual_fee - v_current_paid) then

    raise exception
      'Submitted amount exceeds the student''s remaining balance.'
      using errcode = '22023';

  end if;


  -- The business rule we agreed on:
  --
  -- approved_amount is exactly what the student submitted.
  update public.payment_receipts
  set
    status = 'approved',
    approved_amount = amount_submitted,

    verified_by = p_reviewer_id,
    verified_at = now(),

    rejected_by = null,
    rejected_at = null,

    review_remarks = nullif(btrim(p_review_remarks), ''),
    updated_at = now()
  where id = p_receipt_id;


  -- Recalculate the total from the approved receipts.
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
    'status', 'approved',
    'approved_amount', v_receipt.amount_submitted,
    'total_paid_approved', v_new_total_paid,
    'balance_due', v_new_balance,
    'payment_status', v_payment_status
  );

end;
$function$;

commit;