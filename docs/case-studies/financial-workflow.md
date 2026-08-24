# Financial Workflow Hardening

## Context

Financial workflows are different from normal application features.

A mistake in a profile update may affect one record.

A mistake in a financial workflow can affect:

- Account balances
- Payment history
- Institutional reporting
- Trust in the system

The challenge was not simply storing payments.

The challenge was ensuring that financial state remained:

- Correct
- Explainable
- Auditable
- Recoverable when mistakes happen

The goal was to design a workflow where every important financial action had a clear answer to:

- What happened?
- Who performed it?
- When did it happen?
- Why did it happen?
- What changed afterwards?

---

# Payment Workflow Overview

A payment is treated as a financial event connected to a student's fee account.

The simplified lifecycle:

```text
Payment Event
      ↓
Validation
      ↓
Review
      ↓
Approved / Rejected
      ↓
Financial State Update
      ↓
Audit History
```

<!-- IMAGE PLACEHOLDER -->

![Payment Workflow](../assets/diagrams/payment-workflow.png)

The payment source itself can vary.

A payment could originate from:

- Payment gateway
- Bank transfer
- Institution-managed entry
- Other validated sources

The important part is that every payment enters a controlled workflow before affecting financial state.

---

# The Problem

The initial implementation handled the normal payment path.

A payment could be:

```text
Submitted
    ↓
Reviewed
    ↓
Approved
```

However, the more important questions appeared when looking beyond the happy path.

Examples:

- What if two reviewers approve the same payment?
- What if the account update fails after payment approval?
- What if an approved payment needs correction?
- What if the same external payment event is received twice?
- What if a user attempts an operation they should not perform?

These questions changed the focus from:

> How do we update a payment?

to:

> How do we protect financial state?

---

# Financial State Model

The student's financial state is connected to their academic registration.

The relationship:

```text
Student
    ↓
Academic Registration
    ↓
Fee Account
    ↓
Payment Events
```

The fee account tracks values such as:

- Annual fee
- Approved payments
- Outstanding balance
- Payment status

The payment records remain the underlying financial events.

The account values represent the current financial summary.

<!-- IMAGE PLACEHOLDER -->

![Financial Model](../assets/diagrams/financial-model.png)

---

# Payment Approval Workflow

An approval is not simply changing:

```text
status = approved
```

It represents a financial operation.

A simplified approval flow:

```text
Pending Payment
        ↓
Validate Current State
        ↓
Verify Reviewer Permission
        ↓
Lock Relevant Records
        ↓
Approve Payment
        ↓
Update Financial Summary
        ↓
Write Audit Information
```

The workflow verifies:

- The payment is still pending
- The reviewer is authorized
- The amount is valid
- The related fee account exists
- The financial state can be updated safely

---

# Transactional Processing

One of the most important decisions was treating approval as one atomic operation.

A payment approval can involve:

```text
Update Payment Status

+

Update Approved Payment Total

+

Update Balance

+

Update Payment Status

+

Record Reviewer Information
```

If these operations happen separately, inconsistent state becomes possible.

Example:

```text
Payment approved ✅

Balance update failed ❌

Audit write failed ❌
```

The payment now says one thing while the account says another.

---

## Transaction Approach

The workflow therefore follows:

```text
BEGIN

Validate payment state

Lock related records

Approve payment

Recalculate financial values

Store audit information

COMMIT
```

If any critical operation fails:

```text
ROLLBACK
```

The database returns to the previous valid state.

---

# Database RPCs vs Application-Layer Transactions

One important architectural decision was where this transaction should live.

There are two common approaches.

---

# Option 1: Application-Layer Transaction

Example:

```text
API

1. Approve payment

2. Update account

3. Write audit record
```

The application controls the sequence.

## Advantages

- Logic stays inside application code
- Easier for many developers to understand
- Less database-specific logic

## Disadvantages

- More network communication with the database
- Easier to accidentally split one operation into multiple independent actions
- Concurrency handling becomes more complex
- Harder to guarantee consistency

---

# Option 2: Database Transaction / RPC

The API calls one database operation.

Example:

```text
API
 ↓
PostgreSQL Function

BEGIN

Validate
Lock
Update payment
Update account
Write audit

COMMIT
```

## Advantages

- Atomic operation close to the data
- Strong consistency guarantees
- Easier row-locking behaviour
- Fewer opportunities for partial failure

## Disadvantages

- Business logic exists partly inside PostgreSQL
- Developers need database knowledge
- Testing requires database-level scenarios

---

# Why RPCs Were Chosen

For ordinary CRUD operations, keeping logic in the application layer is reasonable.

However, financial approval and reversal workflows are different.

The priority is:

```text
Correctness
>
Maximum simplicity
```

These operations modify related financial state together.

Therefore, PostgreSQL functions became a better fit.

The trade-off was accepting some database-side business logic in exchange for stronger guarantees.

---

# Concurrency Problem

Financial operations can involve multiple users.

Consider:

```text
Payment Amount: 50,000

Current Balance: 50,000
```

Two authorized reviewers open the same payment.

Both see:

```text
Balance = 50,000
```

Both attempt approval.

Without protection:

```text
Reviewer A
→ Approves

Reviewer B
→ Approves

Final state becomes unpredictable
```

This is a race condition.

---

# Locking vs Optimistic Concurrency

There are two common approaches.

---

# Approach 1: Pessimistic Locking

The system locks the records before changing them.

Example:

```sql
SELECT *
FROM payment_receipts
WHERE id = ?
FOR UPDATE;
```

Flow:

```text
Reviewer A

Lock Payment
      ↓
Approve
      ↓
Update Account
      ↓
Release Lock


Reviewer B

Wait
      ↓
Read Updated State
      ↓
Continue
```

## Advantages

- Strong protection
- Easy to reason about
- Suitable for sensitive operations
- Prevents conflicting updates before they happen

## Disadvantages

- Transactions may wait
- Too many locks can reduce throughput
- Long transactions need careful handling

---

# Approach 2: Optimistic Concurrency

Instead of locking first, the system checks whether the data changed before saving.

Example:

Initial:

```text
Payment Version = 5
```

Two reviewers read version 5.

Reviewer A saves:

```text
Version 5 → Version 6
```

Reviewer B tries:

```text
Expected Version = 5
Current Version = 6
```

The update fails.

## Advantages

- Better throughput
- Less database locking
- Good for high-volume systems

## Disadvantages

- More conflict handling
- Requires retry behaviour
- More complicated user experience

---

# Why Locking Was Chosen

For this platform, payment approval is not a high-volume trading system.

The important requirement is correctness.

The cost of a reviewer waiting briefly is much lower than allowing two conflicting financial updates.

Therefore:

```text
Financial correctness
>
Maximum write throughput
```

Row locking was a reasonable trade-off.

<!-- IMAGE PLACEHOLDER -->

![Concurrency Protection](../assets/diagrams/payment-locking.png)

---

# Recalculation vs Incremental Totals

Another important design choice was how financial summaries should be maintained.

The account contains values such as:

```text
Total Approved Paid

Balance Due
```

There are two common approaches.

---

# Option 1: Incremental Updates

Example:

```text
Current Approved Total
=
100,000

New Payment
=
20,000


New Total
=
120,000
```

## Advantages

- Fast
- Simple calculation
- Efficient for large datasets

## Risks

The summary can become incorrect if something unexpected happens.

Examples:

```text
Payment reversed

Manual correction

Failed update

Incorrect adjustment
```

Now the stored total may no longer match the actual payment records.

---

# Option 2: Recalculation

Instead of trusting the stored summary:

```text
Approved Payments

        ↓

SUM(Approved Amount)

        ↓

Current Approved Total

        ↓

Balance Calculation
```

## Advantages

- Derived from actual records
- Easier to verify
- More resistant to stale values

## Disadvantages

- More database work
- More expensive with extremely large datasets

---

# Why Recalculation Was Chosen

For institutional payments, correctness is more important than saving a small amount of calculation time.

The payment records are the source of truth.

The account summary is a representation of that state.

Therefore:

```text
Financial accuracy
>
Small calculation optimization
```

---

# Payment Correction: Reversal vs Mutation

A common mistake in financial systems is modifying historical records directly.

Example:

```text
Approved Payment

Amount:
100,000

Change to:
80,000
```

This creates a problem.

The system no longer knows:

- What was originally approved?
- Who approved it?
- Why did the amount change?

---

# Mutation Approach

Changing the original record.

Example:

```text
Original Payment

100,000

↓

Modified Payment

80,000
```

## Advantages

- Simple
- Fewer records

## Disadvantages

- History is lost
- Audit becomes difficult
- Previous state cannot be reconstructed

---

# Reversal Approach

A reversal creates a new event that corrects the previous state.

Example:

```text
Approved Payment

        ↓

Reversal

        ↓

New Financial State
```

The original payment remains.

The correction becomes part of the history.

---

# Why Reversal Was Chosen

Financial records are historical events.

A correction should answer:

```text
What happened originally?

What changed?

Who changed it?

Why was it changed?
```

Reversal preserves that information.

The trade-off:

## Benefits

- Strong audit trail
- Easier investigation
- Better accountability

## Costs

- More records
- More states to manage

For financial workflows, preserving history is worth the additional complexity.

<!-- IMAGE PLACEHOLDER -->

![Payment Reversal](../assets/diagrams/payment-reversal.png)

---

# Overpayment Handling

Another business decision involved payments larger than the remaining balance.

Example:

```text
Fee Due:
100,000

Payment Submitted:
120,000
```

There are two possible approaches.

---

# Option 1: Reject Overpayment

Current approach:

```text
Payment > Balance

↓

Reject Approval
```

## Advantages

- Simple accounting model
- Prevents unsupported financial states
- Easier reporting

## Disadvantages

- Does not support advance payments
- Does not support account credits

---

# Option 2: Credit Balance

Alternative:

```text
Fee Due:
100,000

Payment:
120,000

Remaining Credit:
20,000
```

## Advantages

- More flexible
- Supports advance payments
- Common in larger financial systems

## Disadvantages

Requires additional concepts:

- Credit ledger
- Refunds
- Carry-forward rules
- Credit allocation

---

# Why Rejection Was Chosen

The platform currently focuses on fee settlement rather than a complete accounting system.

Introducing credits would require a larger financial model.

Therefore:

```text
Clear controlled behaviour
>
Unsupported flexibility
```

The system rejects a state it does not yet model.

---

# Idempotency Considerations

Payment workflows can also receive repeated events.

This is especially important when integrating with external payment providers.

For example:

```text
Gateway sends payment event

↓

System processes event

↓

Gateway retries same event
```

The same financial event should not create another payment record.

A typical gateway integration would use:

```text
External Transaction Reference

+

Unique Constraint
```

Example:

```text
Gateway Transaction ID
        ↓
Already Processed?
        ↓
Yes → Return Existing Result

No → Process Payment
```

This protects against duplicate financial processing.

---

# Auditability

Financial systems need more than the final status.

The platform preserves information such as:

- Reviewer
- Approval timestamp
- Rejection reason
- Reversal user
- Reversal timestamp
- Reversal reason

The goal is that every important financial action has an explanation.

---

# Lessons Learned

The biggest lesson from this workflow was that financial correctness comes from the combination of several decisions.

No single technique solves everything.

Reliable financial processing requires:

```text
Authorization

+

Transactions

+

Concurrency Control

+

Idempotency

+

Database Constraints

+

Audit History

+

Clear Business Rules
```

The difficult part was not creating a payment record.

The difficult part was designing a workflow where unexpected situations still produce predictable outcomes.

---

# Outcome

After the hardening work, the payment workflow provides stronger guarantees around:

- Authorized payment review
- Atomic financial updates
- Concurrent approval protection
- Duplicate protection
- Accurate balance calculation
- Controlled corrections
- Historical traceability

The main improvement was moving from:

```text
Update records until the workflow works
```

towards:

```text
Design the financial state transitions first,
then implement the workflow around them.
```

---

# Related Documentation

- [System Architecture](../architecture.md)
- [Core Workflows](../workflows.md)
- [Reliability & Security](../reliability-and-security.md)

## Related Case Studies

- [Platform Hardening](./platform-hardening.md)
- [Registration Integrity](./registration-integrity.md)

---

## Visual Placeholders

```text
docs/assets/
└── diagrams/
    ├── payment-workflow.png
    ├── financial-model.png
    ├── payment-locking.png
    └── payment-reversal.png
```

<!-- Delete this section once final visuals are added. -->