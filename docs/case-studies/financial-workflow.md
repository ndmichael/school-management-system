# Financial Workflow Hardening

## Context

The payment workflow originally handled the normal path: a receipt could be submitted, reviewed, and approved.

The harder part was protecting the system when the normal path failed.

The key questions became:

- What if two reviewers act on the same payment?
- What if a payment is approved but the account update fails?
- What if an approved payment later needs correction?
- What prevents unauthorized staff from reviewing payments?
- How do we keep balances consistent with payment history?

The goal was not just to store payments. It was to make financial state predictable, auditable, and recoverable.

---

## Financial Model

Financial state is tied to a student's academic-session registration:

```text
Student
   ↓
Student Registration
   ↓
Student Fee Account
   ↓
Payment Receipts
```

The fee account stores the annual fee, approved amount paid, outstanding balance, and payment status.

Approved payment records remain the underlying source of truth.

![Payment Processing Flow](../assets/diagrams/payment-processing-flow.png)

---

## Hardening the Approval Workflow

Payment approval is treated as one financial operation rather than a sequence of unrelated updates.

The workflow validates that:

- the payment is still pending
- the reviewer is authorized
- the related fee account exists
- the submitted amount is valid
- the payment does not exceed the remaining balance

The critical database work then runs transactionally:

```text
Validate State
     ↓
Lock Payment / Account
     ↓
Approve Payment
     ↓
Recalculate Approved Total
     ↓
Recalculate Balance
     ↓
Update Payment Status
     ↓
Write Audit Information
```

If any required step fails, the transaction rolls back.

This avoids inconsistent states such as:

```text
Payment Approved
Account Balance Not Updated
```

For these operations, PostgreSQL RPCs were chosen over several independent application-layer database calls because atomicity and concurrency protection mattered more than keeping all business logic in TypeScript.

---

## Concurrency Protection

Payment review can involve multiple authorized users.

Without protection, two reviewers could read the same pending payment and account balance before either transaction updates them.

The workflow uses PostgreSQL row locking with `FOR UPDATE` so one transaction completes before another can modify the same shared state.

```text
Reviewer A                     Reviewer B
    │                              │
    ▼                              ▼
Lock Payment / Account       Request Same State
    │                              │
    ▼                              ▼
Validate + Approve                 Wait
    │                              │
    ▼                              │
Recalculate Account                │
    │                              │
    ▼                              │
Commit / Release Lock ─────────────┘
                                   ↓
                           Re-read Current State
```

![Payment Concurrency Control](../assets/diagrams/payment-concurrency-control.png)

Row locking was chosen over optimistic concurrency because payment review is relatively low-volume and correctness matters more than maximizing write throughput.

---

## Recalculation Instead of Incremental Totals

The account summary is recalculated from payments that remain in the approved state.

```text
Approved Payments
       ↓
SUM(approved amounts)
       ↓
Approved Paid
       ↓
Annual Fee - Approved Paid
       ↓
Balance Due
```

This performs more database work than simply adding the latest payment to a stored total, but it reduces the risk of the account summary drifting away from the actual payment history.

For this workflow, that trade-off is worth it.

---

## Reversal Instead of Editing History

An approved payment is not corrected by silently changing or deleting the original record.

Instead:

```text
Approved Payment
       ↓
Reversal Requested
       ↓
Validate + Lock
       ↓
Mark Reversed
       ↓
Recalculate Account
       ↓
Store Reversal Audit
```

The original approval remains visible.

The reversal records:

- who reversed the payment
- when it was reversed
- why it was reversed

This adds more state to manage, but preserves a reliable financial history.

---

## Overpayment Decision

The current model rejects a payment that exceeds the remaining balance.

Supporting overpayment correctly would require additional concepts such as:

- credit balances
- refunds
- carry-forward rules
- allocation rules

The platform currently focuses on fee settlement rather than a full accounting ledger, so unsupported overpayment is rejected instead of introducing incomplete credit behaviour.

---

## Authorization and Auditability

Payment review is restricted to administrators and authorized bursary personnel.

The acting reviewer is derived from the authenticated server-side user rather than trusted from the browser request.

Important financial actions preserve audit information such as:

- reviewer identity
- review timestamp
- rejection reason
- reversal actor
- reversal timestamp
- reversal reason

This makes financial decisions traceable without depending on the final status alone.

---

## Idempotency

The current platform uses uniqueness and state validation to protect repeated logical operations.

If an external payment gateway is added later, a unique provider transaction or event identifier should also be stored so retried webhook events cannot create duplicate financial processing.

That is a future integration requirement, not part of the current receipt-review implementation.

---

## Outcome

The hardened workflow now provides stronger guarantees around:

- authorized payment review
- atomic financial updates
- concurrent approval protection
- balance consistency
- controlled reversal
- overpayment protection
- financial auditability

The biggest shift was moving from:

```text
Update the records needed for the happy path
```

to:

```text
Define valid financial state transitions first,
then protect those transitions at the database boundary.
```

---

## Related Documentation

- [System Architecture](../architecture.md)
- [Core Workflows](../workflows.md)
- [Reliability & Security](../reliability-and-security.md)
