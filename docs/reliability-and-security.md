# Reliability & Security

This document covers the cross-cutting decisions I made while hardening the Institutional Management Platform.

The individual workflows are documented separately in [`workflows.md`](./workflows.md). This document focuses on the rules and protections that apply across those workflows.

As I reviewed the platform, I stopped treating reliability as something that could be added at the end.

A feature can work perfectly during normal testing and still fail when:

- the same request is submitted twice
- two users act on the same record at the same time
- one database write succeeds and another fails
- an authenticated user performs an operation they should not have access to
- related configuration is missing
- a financial transaction needs correction
- invalid state is sent directly to the backend

The hardening work therefore focused on protecting the system at multiple layers.

---

# Security Model

The platform does not rely on a single security mechanism.

Different layers protect different things:

```text
User
 ↓
Authentication
 ↓
Authorization
 ↓
API Validation
 ↓
Business Rules
 ↓
Database Constraints
 ↓
Transactional Operations
 ↓
Audit History
```

<!-- IMAGE PLACEHOLDER -->

![Security and Reliability Layers](./assets/diagrams/security-layers.png)

The main idea is that no single layer should be expected to solve every problem.

---

# Authentication and Authorization

One of the important distinctions I made during the review was separating **authentication** from **authorization**.

## Authentication

Authentication answers:

> Who is making this request?

The platform uses Supabase Auth to identify the current user.

For protected server operations, the authenticated identity is resolved from the session rather than trusting an identity supplied by the frontend.

For example, a financial-review request should not accept this as the source of truth:

```json
{
  "reviewer_id": "some-profile-id"
}
```

A malicious client could change that value.

Instead:

```text
Request
   ↓
Authenticated Session
   ↓
Server resolves user ID
   ↓
User ID used for audit information
```

The server therefore controls the identity associated with sensitive actions.

---

## Authorization

Authorization answers a different question:

> Is this authenticated user allowed to perform this action?

A broad role is not always enough.

For example, the original financial-review authorization allowed any non-academic staff member to access the workflow.

That was too broad.

The authorization flow was tightened to consider institutional responsibility:

```text
Authenticated User
        ↓
Profile
        ↓
Main Role
        ↓
Staff Record
        ↓
Unit / Responsibility
        ↓
Allowed Operation
```

For payment review, the relevant user must be:

```text
Administrator

or

Non-Academic Staff
        +
Bursary Unit
```

This means:

```text
Logged in ≠ Authorized
```

and:

```text
Staff ≠ Authorized for every staff operation
```

<!-- IMAGE PLACEHOLDER: authorization guard -->

![Authorization Guard](./assets/screenshots/authorization-guard.png)

---

## 401 vs 403

I also keep authentication and authorization failures distinct.

### 401 Unauthorized

The system cannot establish a valid authenticated identity.

```text
Who are you?
→ Unknown
```

### 403 Forbidden

The system knows who the user is, but they are not allowed to perform the requested operation.

```text
Who are you?
→ Known

Can you do this?
→ No
```

That distinction makes both the API behaviour and debugging clearer.

---

# Validation at Multiple Layers

Validation exists at several levels.

Each level has a different purpose.

## Frontend Validation

Frontend validation exists mainly for user experience.

Examples:

```text
Required field missing
Invalid input format
Empty reversal reason
```

The goal is to give the user immediate feedback.

However, frontend validation is never treated as the final authority.

A client can be modified or bypassed.

---

## API Validation

The API validates the shape and intent of the request.

Examples include:

- UUID format
- allowed actions
- required rejection reasons
- required reversal reasons
- request-body structure

The API can therefore reject malformed requests before they reach sensitive database logic.

---

## Database Validation

The database protects the final state.

Examples include:

- unique registrations
- valid payment states
- valid financial amounts
- required foreign-key relationships
- one fee account per student registration

The model I use is:

```text
Frontend
→ Friendly validation

API
→ Request and authorization validation

Database
→ Final integrity protection
```

---

# Database Constraints

One of the biggest changes in my thinking during the project was treating database constraints as part of application design.

The database is not just where the application stores information.

It can also guarantee that certain invalid states cannot exist.

---

## Unique Constraints

Unique constraints are used where a business record should logically exist only once.

Examples include:

### Application uniqueness

```text
Applicant Identity
+
Programme
+
Academic Session
```

This protects against duplicate applications for the same logical admission request.

---

### Student session registration

```text
Student
+
Academic Session
```

A student should not be registered twice for the same academic year.

---

### Student fee account

```text
Student Registration
→ One Fee Account
```

A unique constraint on the registration relationship protects against duplicate fee accounts.

---

### Course enrolment

The same student should not be enrolled repeatedly into the same course offering.

---

## Check Constraints

Check constraints protect valid state inside individual records.

For financial records, examples include:

```text
amount > 0
```

and restricting status values to known states such as:

```text
pending
approved
rejected
reversed
```

They can also protect state-specific rules.

For example:

```text
Approved
→ approved amount must exist
→ verifier must exist
→ verified timestamp must exist
```

while:

```text
Rejected
→ approved amount must not exist
→ rejection audit data must exist
```

This prevents impossible combinations from being stored accidentally.

---

# Transactional Operations

Some workflows involve several database changes that together represent **one business operation**.

These should not be handled as unrelated requests.

For example, approving a payment can involve:

```text
Update payment
+
Recalculate approved total
+
Update balance
+
Update payment status
+
Record reviewer information
```

If these happen independently, this failure is possible:

```text
Payment marked approved ✅

Account balance update fails ❌
```

The database is now inconsistent.

---

## Atomicity

Critical workflows are therefore handled transactionally.

Conceptually:

```text
BEGIN

Validate current state

Lock required records

Perform related changes

Recalculate dependent values

Write audit information

COMMIT
```

If any required step fails:

```text
ROLLBACK
```

The business operation either completes or does not happen.

That is atomicity.

---

## PostgreSQL Functions / RPCs

For workflows requiring strong transactional behaviour, important logic is placed inside PostgreSQL functions.

Examples include:

- applicant conversion
- session registration
- fee-account creation
- payment review
- payment reversal

The API remains responsible for:

```text
Authentication
Authorization
Request validation
Calling the operation
Returning an HTTP response
```

while the database function controls the atomic data changes.

This avoids implementing one financial operation as several independent database calls.

---

# Race Condition Protection

Transactions alone do not automatically solve every concurrency problem.

A race condition occurs when multiple operations interact with the same state at nearly the same time and the result depends on execution order.

For example:

```text
Remaining Balance = 1,000
```

Two reviewers process financial events at almost the same moment.

Both could read:

```text
Balance = 1,000
```

before either one updates it.

Without concurrency protection, they could each calculate a new balance from the same old value.

---

## Row Locking

For important shared state, PostgreSQL row locking is used:

```sql
SELECT ...
FOR UPDATE;
```

This means:

```text
Transaction A
→ locks row

Transaction B
→ attempts same row
→ waits

Transaction A
→ completes

Transaction B
→ continues using the new state
```

This became particularly important in payment review.

The workflow can lock:

- the payment record
- the related fee account

before changing financial state.

<!-- IMAGE PLACEHOLDER -->

![Row Locking](./assets/diagrams/row-locking.png)

---

## Why the Lock Happens Inside the Database

Trying to solve this only in the frontend would not be enough.

For example:

```text
Disable Approve Button
```

might stop one user from clicking twice.

It does not stop:

```text
Reviewer A on Computer 1

and

Reviewer B on Computer 2
```

from submitting at nearly the same time.

Concurrency protection therefore belongs closer to the shared state itself.

---

# Idempotency

Idempotency is related to concurrency but solves a different problem.

Race-condition protection asks:

> What happens when multiple operations happen at the same time?

Idempotency asks:

> What happens when the same logical operation happens more than once?

For example:

```text
User submits request
        ↓
Network timeout
        ↓
User retries
```

The system may receive the same logical request twice.

---

## Database Uniqueness as Idempotency Protection

Several platform workflows use business-level uniqueness to prevent repeated logical operations from creating duplicate records.

Examples include:

```text
Applicant + Programme + Session
```

```text
Student + Academic Session
```

```text
Student + Course Offering
```

The database therefore protects the logical identity of the operation.

---

## Payment Gateway Idempotency

For payment-gateway integrations, the same principle would normally be applied using a unique provider transaction or event identifier.

Conceptually:

```text
Gateway Event
     ↓
Transaction Reference
     ↓
Already Processed?
   ↙          ↘
 Yes          No
 ↓            ↓
Return       Process
Existing     Payment
Result
```

A unique gateway reference prevents the same external financial event from being processed twice.

This becomes especially important because payment providers can legitimately retry webhook delivery.

---

# Race Conditions vs Idempotency

The difference can be summarized as:

| Problem | Race Condition | Idempotency |
|---|---|---|
| Main concern | Concurrent operations | Repeated operation |
| Example | Two reviewers approve simultaneously | Same payment webhook arrives twice |
| Risk | Incorrect shared state | Duplicate processing |
| Typical protection | Locks / concurrency control | Unique keys / idempotency keys |
| Can happen together? | Yes | Yes |

A reliable system may need both protections for the same workflow.

---

# Financial State as Derived Data

Another important decision was not blindly trusting stored financial totals.

Approved payment records represent the underlying financial events.

Values such as:

```text
total_paid_approved
balance_due
payment_status
```

are summaries of that underlying state.

For important payment operations, approved totals can be recalculated from the currently approved payments rather than simply doing:

```text
old_total + new_payment
```

This provides stronger protection against stale or inconsistent summary values.

Conceptually:

```text
Approved Payments
       ↓
SUM(approved_amount)
       ↓
Approved Total
       ↓
Annual Fee - Approved Total
       ↓
Balance Due
```

The transaction records remain the stronger source of truth.

---

# Overpayment Protection

The current financial workflow does not allow an approved payment to exceed the remaining balance.

For example:

```text
Balance Due = 20,000

Submitted Payment = 25,000
```

The approval is rejected.

Supporting overpayment properly would require additional business concepts such as:

- credit balances
- refunds
- carry-forward rules
- allocation rules

Rather than silently introducing those behaviours, the current workflow rejects the unsupported state.

This is a deliberate scope decision.

---

# Auditability

Important workflows need more than a final status.

For sensitive actions, the system should be able to answer:

```text
Who performed this?

When?

Why?

What happened before?

Was it later corrected?
```

Financial records therefore preserve audit information such as:

- `verified_by`
- `verified_at`
- `rejected_by`
- `rejected_at`
- review remarks
- `reversed_by`
- `reversed_at`
- reversal reason

The authenticated server-side user identity is used for these audit fields.

---

# Controlled Reversal Instead of Deletion

One of the strongest financial rules introduced during the hardening work was distinguishing between:

```text
Deleting an invalid record
```

and:

```text
Correcting historical financial state
```

An approved payment should not simply disappear because someone made a mistake.

Instead:

```text
Approved
   ↓
Correction Required
   ↓
Reversed
```

The original payment remains.

The original approval remains.

The reversal adds new history.

---

## Reversal Flow

```text
Approved Payment
       ↓
Validate Current State
       ↓
Require Reversal Reason
       ↓
Lock Payment / Account
       ↓
Mark Payment Reversed
       ↓
Recalculate Approved Total
       ↓
Recalculate Balance
       ↓
Store Reversal Audit
```

<!-- IMAGE PLACEHOLDER -->

![Controlled Reversal](./assets/diagrams/payment-reversal.png)

---

## Deletion Rules

Financial states are treated differently.

```text
Pending
→ deletion can be allowed

Rejected
→ deletion can be allowed

Approved
→ ordinary deletion blocked

Reversed
→ ordinary deletion blocked
```

Approved and reversed records form part of the financial history.

---

# State Transitions

Another hardening principle is that not every state should be able to transition to every other state.

For payment records:

```text
Pending
  ├────────→ Approved
  │
  └────────→ Rejected

Approved
  ↓
Reversed
```

Invalid operations are rejected.

For example:

```text
Approved → Approved again
```

is not a valid review operation.

Neither is:

```text
Reversed → Reversed again
```

The database functions validate the current state before performing the transition.

---

# Server-Side Administrative Access

Sensitive administrative operations use server-side database access.

The Supabase service-role client is kept on the server and is never exposed through browser code or public environment variables.

This matters because service-role access can bypass normal Row Level Security restrictions.

The principle is:

```text
Browser
→ User-scoped access

Server
→ Privileged access where explicitly required
```

Privileged server access must therefore be protected by authentication and authorization guards.

---

# Row Level Security

Row Level Security provides another database-level access boundary.

RLS answers questions such as:

> Which rows can this authenticated user read or modify?

For example, a student-facing policy could conceptually restrict financial data to:

```text
Authenticated Student
        ↓
Own Student Record
        ↓
Own Registration
        ↓
Own Fee Account
```

rather than allowing access to every fee account.

---

## Why RLS Should Not Be Enabled Blindly

Enabling RLS without designing the policies first can immediately block legitimate application access.

Likewise, enabling RLS while a client-side workflow still depends on unrestricted database access can break the application.

The approach is therefore:

```text
Understand Current Access
        ↓
Move Sensitive Writes Behind Server APIs
        ↓
Define Policies
        ↓
Enable RLS
        ↓
Test Every Role
```

RLS complements API authorization.

It does not replace it.

---

# Storage Security

Uploaded institutional documents can also contain sensitive information.

The same access principles applied to database records should apply to files.

For example:

```text
Application Document
Financial Evidence
Institutional Record
```

should not automatically become publicly accessible simply because a file URL exists.

For sensitive files, the preferred direction is:

```text
Private Bucket
      ↓
Authorized Request
      ↓
Signed / Controlled Access
```

rather than permanent unrestricted public URLs.

---

# Service Role Safety

The service-role key is highly privileged.

It should never appear in:

```text
NEXT_PUBLIC_...
```

or any client-side bundle.

Service-role operations belong on the server.

A server route using privileged access should first perform:

```text
Authenticate
     ↓
Authorize
     ↓
Validate
     ↓
Privileged Database Operation
```

Privileged database access without authorization would simply move the security problem from the browser to the server.

---

# Failure Cases Considered

During the hardening review, I deliberately looked beyond the normal success path.

Some examples include:

## Duplicate application

```text
Same applicant
Same programme
Same session
→ duplicate rejected
```

---

## Duplicate session registration

```text
Same student
Same academic session
→ duplicate rejected
```

---

## Missing fee plan during single registration

```text
Fee plan missing
→ registration fails
→ incomplete fee state avoided
```

---

## Missing fee plan during bulk registration

```text
Student skipped
→ reason recorded
→ remaining valid students continue
```

---

## Partial payment approval failure

```text
Receipt update succeeds
Account update fails
```

Prevented by making the workflow transactional.

---

## Concurrent payment review

```text
Reviewer A
+
Reviewer B
→ same payment
```

Protected through database row locking and state validation.

---

## Repeated approval

```text
Approved payment
→ approve again
```

Rejected because only pending records can be reviewed.

---

## Unsupported overpayment

```text
Submitted payment
>
remaining balance
```

Rejected.

---

## Financial correction

```text
Approved payment was wrong
```

Handled through controlled reversal rather than deletion.

---

# Security Boundaries

The final model can be summarized as:

```text
                    USER
                      │
                      ▼
                Authentication
                      │
                      ▼
                 Authorization
                      │
                      ▼
                  API Validation
                      │
                      ▼
             Transactional Workflow
                      │
                      ▼
                Database Rules
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   Constraints    Row Locks      Audit Data
```

<!-- IMAGE PLACEHOLDER -->

![Security Boundaries](./assets/diagrams/security-boundaries.png)

Each layer exists because the previous layer cannot guarantee everything.

---

# Trade-offs

The hardening work was not about moving every rule into PostgreSQL.

That would make the application harder to understand and maintain.

Likewise, leaving every rule in React or API routes would make important invariants easier to bypass.

The architecture therefore divides responsibility deliberately:

```text
Frontend
→ User experience

API
→ Authentication, authorization and request validation

Database Constraints
→ Permanent data invariants

Transactional RPCs
→ Multi-step operations requiring atomicity

Row Locks
→ Shared-state concurrency protection

Audit Fields
→ Historical accountability
```

The trade-off is slightly more architectural complexity in exchange for stronger guarantees around important workflows.

---

# Remaining Security Considerations

Hardening a system is not a one-time event.

Some areas should continue to be reviewed as the platform evolves.

These include:

- Full RLS policy coverage for user-facing data access
- Private storage and controlled file access
- Rate limiting on sensitive endpoints
- Gateway webhook authentication and idempotency
- Automated security and database tests
- Monitoring and alerting
- Structured audit/event logging
- Backup and recovery procedures
- Secret rotation
- Dependency/security scanning

These are especially important if the platform moves from institutional use toward broader production deployment.

---

# Key Lessons

The main lessons I took from the reliability and security review were:

1. Authentication does not automatically mean authorization.
2. Frontend validation cannot protect the database by itself.
3. Database constraints are part of application design.
4. Transactions protect business operations from partial failure.
5. Race conditions and idempotency solve different problems.
6. Concurrency needs to be handled where shared state actually lives.
7. Financial summaries should be derived from trustworthy underlying records.
8. Important actions need an audit trail.
9. Financial corrections should preserve history.
10. Security should exist in layers rather than depending on one mechanism.

---

# Related Documentation

For the overall system design:

[Architecture →](./architecture.md)

For the actual business workflows:

[Core Workflows →](./workflows.md)

For deeper engineering examples:

- [Platform Hardening Case Study](./case-studies/platform-hardening.md)
- [Registration Integrity Case Study](./case-studies/registration-integrity.md)
- [Financial Workflow Case Study](./case-studies/financial-workflow.md)

---

## Visual Placeholders

The visuals referenced in this document can be added under:

```text
docs/
└── assets/
    ├── diagrams/
    │   ├── security-layers.png
    │   ├── row-locking.png
    │   ├── payment-reversal.png
    │   └── security-boundaries.png
    │
    └── screenshots/
        └── authorization-guard.png
```

<!-- Delete this section once the final visuals are in place. -->