# System Architecture

This document describes how the Institutional Management Platform is structured, how its major domains interact, and where critical business rules are enforced.

The platform covers several connected domains:

- Admissions and application review
- Applicant-to-student conversion
- Student records
- Academic sessions and registrations
- Programmes and courses
- Course offerings and course registration
- Staff and access control
- Finance and payment operations

Although these appear as separate modules in the interface, they share the same application, authentication, authorization, database, and storage infrastructure.

The main architectural goal is to keep business rules close to the layer that can enforce them reliably.

---

## Architecture Overview

At a high level:

```text
Users
  │
  ▼
Next.js Application
  │
  ├── UI / Dashboards
  │
  ├── API Routes / Server-side Operations
  │
  └── Supabase Client Access where appropriate
          │
          ▼
Authentication / Authorization
          │
          ▼
Business Workflows
          │
   ┌──────┼───────────────┐
   ▼      ▼               ▼
PostgreSQL / Supabase   Supabase Auth   Supabase Storage
   │
   ├── Constraints
   ├── Indexes
   ├── Functions / RPCs
   ├── Transactions
   ├── Row Locks
   └── Audit Fields
```

![System Architecture](./assets/diagrams/system-architecture.png)

The application does not rely on one layer for every concern.

- The frontend handles interaction and immediate feedback.
- The server handles sensitive request boundaries and authorization.
- PostgreSQL protects data invariants and multi-step transactional operations.
- Supabase Auth provides authenticated user identity.
- Storage holds uploaded documents and payment evidence.

---

# Frontend Layer

The frontend is built with:

- Next.js 15
- React
- TypeScript
- Tailwind CSS

It provides interfaces for applicants, students, staff, reviewers, administrators, and finance personnel.

Its responsibilities include:

- Rendering role-specific dashboards
- Collecting and validating user input
- Loading workflow data
- Submitting actions to server endpoints
- Displaying validation errors and workflow outcomes

The frontend is not treated as the final security boundary.

For example, hiding an **Approve Payment** button from an unauthorized user improves the interface, but it does not secure the operation. The server and database still need to reject an unauthorized request.

---

# Application and API Layer

Sensitive administrative and financial operations are handled through server-side application boundaries such as Next.js API routes.

A protected request typically follows this path:

```text
Request
   ↓
Validate Input
   ↓
Authenticate User
   ↓
Authorize Operation
   ↓
Execute Business Workflow
   ↓
Return Controlled Result
```

The API layer is responsible for:

- Request validation
- Authentication checks
- Authorization checks
- Input normalization
- Calling database queries or RPCs
- Mapping database failures into controlled responses

Simple reads or low-risk operations do not always require a PostgreSQL function.

Multi-step operations that must succeed or fail as one unit are delegated to transactional PostgreSQL functions.

Examples include:

- Applicant-to-student conversion
- Student registration with fee-account creation
- Payment review
- Payment reversal

Some client-side Supabase access still exists in the application. Sensitive operations should not depend on browser-supplied identity or browser-only authorization checks.

---

# Authentication

Authentication is handled through Supabase Auth.

Authentication answers:

> Who is making this request?

For sensitive operations, the application derives the acting user from the authenticated session instead of trusting an ID supplied by the browser.

For example, a payment review request should not be able to decide its own reviewer:

```json
{
  "reviewer_id": "user-controlled-value"
}
```

Instead:

```text
Authenticated Session
        ↓
Server Resolves User
        ↓
Reviewer Identity Passed to Database Operation
```

This prevents the client from impersonating another reviewer simply by changing a request payload.

---

# Authorization

Authentication and authorization are separate concerns.

Authentication answers:

> Who are you?

Authorization answers:

> Are you allowed to perform this operation?

Authorization can depend on more than the user's broad role.

For financial review, the relevant logic distinguishes between:

```text
Authenticated User
        ↓
Profile Role
        ↓
Staff Record
        ↓
Institutional Unit
        ↓
Allowed Operation
```

For example, payment review is restricted to administrators or authorized bursary personnel rather than every non-academic staff member.

The server returns different outcomes for different failures:

```text
Not authenticated → 401
Authenticated but not allowed → 403
```

More detail is covered in:

[Reliability & Security →](./reliability-and-security.md)

---

# Major Domain Boundaries

## Admissions

The admissions domain handles:

- Applications
- Applicant information
- Supporting documents
- Application review
- Admission decisions
- Duplicate-application protection

An applicant remains separate from the active student domain until conversion occurs.

A duplicate application is protected by the logical combination:

```text
NIN
+
Programme
+
Academic Session
```

---

## Student Lifecycle

The student domain begins after an accepted application is converted.

It includes:

- Student record
- Programme relationship
- Matriculation information
- Academic-session registrations
- Registration history

The important distinction is:

```text
Applicant ≠ Student
```

and:

```text
Student ≠ Student Session Registration
```

A student is a long-lived institutional record.

A student registration represents that student's participation in one academic session.

---

## Academic Operations

The academic domain includes:

- Academic sessions
- Semester state
- Programmes
- Courses
- Course offerings
- Lecturer assignment
- Publication state
- Student course enrolment

Two distinctions are especially important.

### Session vs Semester

One `sessions` record represents the full academic year.

```text
2025/2026
   │
   ├── First Semester
   └── Second Semester
```

A student registers once for the session.

Course offerings remain semester-specific.

### Course vs Course Offering

```text
Course ≠ Course Offering
```

A course is the permanent academic definition.

A course offering represents that course being made available for a specific:

- Session
- Semester
- Programme
- Level
- Lecturer assignment

This prevents the course catalogue from being duplicated every time the same course is taught again.

---

## Staff and Access Control

The staff domain contains the institutional information used by authorization rules.

This includes:

- Academic staff
- Non-academic staff
- Roles
- Units
- Operational responsibility

A broad role alone is not always enough to authorize a sensitive operation.

For example:

```text
non_academic_staff
```

does not automatically mean:

```text
can review payments
```

The staff member's institutional unit is also checked where required.

---

## Finance

The finance domain includes:

- Programme fee plans
- Student fee accounts
- Payment receipts
- Payment review
- Rejection
- Reversal
- Balance recalculation
- Financial audit fields

Financial state is tied to the student's academic registration.

```text
Student
   ↓
Student Registration
   ↓
Student Fee Account
   ↓
Payment Receipts
```

This keeps fees for different academic sessions separate instead of maintaining one lifetime student balance.

---

# Database Layer

PostgreSQL, accessed through Supabase, is the main source of truth for institutional data.

The database is used for more than persistence.

It also enforces business invariants through:

- Primary keys
- Foreign keys
- Unique constraints
- Check constraints
- Indexes
- PostgreSQL functions
- Transactions
- Row locking
- Audit fields

The guiding rule is:

> If breaking a rule would leave the platform in an invalid state, that rule should not depend only on the frontend.

---

# Database Constraints

Application validation helps return useful messages.

Database constraints provide final protection against invalid state.

Examples include:

### Student registration

```text
Student ID
+
Session ID
```

must be unique.

### Course enrolment

```text
Student ID
+
Course Offering ID
```

must be unique.

### Fee account

A fee account belongs to a student registration and must not be duplicated for the same registration.

### Application

The same applicant should not create the same programme/session application more than once.

```text
NIN
+
Programme
+
Session
```

The pattern is:

```text
Application Validation
        +
Database Enforcement
```

The application explains the failure.

The database guarantees the invariant.

---

# Transactional PostgreSQL Functions

Some business operations touch several related records.

Those operations are implemented as one database transaction when partial success would create an invalid state.

The general pattern is:

```text
BEGIN

Validate Current State
        ↓
Lock Shared State if Required
        ↓
Perform Related Inserts / Updates
        ↓
Recalculate Dependent State
        ↓
Write Audit Information

COMMIT
```

If a required step fails:

```text
ROLLBACK
```

## Applicant-to-Student Conversion

The conversion workflow creates or connects:

```text
Accepted Application
        ↓
Profile
        ↓
Student
        ↓
Initial Student Registration
        ↓
Student Fee Account
```

![Applicant to Student Conversion](./assets/diagrams/application-to-student-flow.png)

These records represent one business action and should not be created independently in a way that leaves the applicant only partially converted.

## Student Session Registration

For an existing student:

```text
Student
   ↓
Target Session
   ↓
Validate No Existing Registration
   ↓
Find Programme Fee Plan
   ↓
Create Registration
   ↓
Create Fee Account
```

The registration and fee account belong to the same logical operation.

![Registration Data Model](./assets/diagrams/registration-data-model.png)

---

# Concurrency Control

Concurrency becomes important when two users can act on the same shared state at nearly the same time.

Payment review is the clearest example.

The payment review function uses PostgreSQL row locking:

```sql
SELECT ...
FOR UPDATE;
```

Conceptually:

```text
Reviewer A                     Reviewer B
    │                              │
    ▼                              ▼
Lock Payment Row            Request Same Row
    │                              │
    ▼                              ▼
Validate + Approve               Wait
    │                              │
    ▼                              │
Recalculate Account               │
    │                              │
    ▼                              │
Commit / Release Lock ────────────┘
                                   ↓
                           Re-read Current State
```

![Payment Concurrency Control](./assets/diagrams/payment-concurrency-control.png)

This prevents two reviewers from independently approving the same payment based on the same stale account state.

---

# Idempotency and Duplicate Protection

Concurrency and idempotency address different failure modes.

Concurrency asks:

> What happens when operations overlap in time?

Idempotency asks:

> What happens when the same logical operation is repeated?

The platform protects repeated operations through database uniqueness and state validation.

Examples include:

```text
NIN + Programme + Session
```

for applications, and:

```text
Student + Session
```

for academic registration.

For future external payment-gateway integration, a provider transaction or event identifier should also be stored uniquely so a retried webhook cannot create the same financial event twice.

---

# Financial State and Recalculation

The platform does not treat the fee-account totals as blindly incremented counters.

When a payment is approved or reversed, the approved financial total is recalculated from payment records that remain in the approved state.

```text
Approved Payment Records
        ↓
SUM(approved amounts)
        ↓
Approved Paid
        ↓
Outstanding Balance
        ↓
Payment Status
```

This reduces the risk of account totals drifting away from the underlying payment history.

The current workflow also rejects overpayment rather than introducing a credit balance.

Supporting credits, refunds, or carry-forward balances would require a broader financial model.

![Payment Processing Flow](./assets/diagrams/payment-processing-flow.png)

---

# Payment Reversal and Auditability

Approved financial history is not corrected by deleting or rewriting the original approval.

Instead:

```text
Approved Payment
       ↓
Reversal Requested
       ↓
Record Reversal Actor / Time / Reason
       ↓
Mark Payment Reversed
       ↓
Recalculate Approved Total
       ↓
Recalculate Balance
```

The original approval remains visible in the audit history.

This makes the correction traceable and preserves the sequence of financial decisions.

---

# Storage

Supabase Storage is used for uploaded files such as:

- Application documents
- Supporting documents
- Payment receipt evidence

Sensitive file access should not rely only on possession of a public URL.

Server-controlled access and storage policies are the preferred direction for documents that contain private institutional information.

Storage access remains an area where access policy should be reviewed carefully when hardening the platform.

---

# Redis

Redis is a supporting infrastructure component rather than a source of truth.

PostgreSQL remains authoritative for academic, student, and financial records.

Redis is appropriate for temporary or performance-oriented concerns such as:

- Caching
- Short-lived state
- Rate limiting
- Queue coordination
- Background-job coordination

Important institutional records should not depend on Redis for permanent correctness.

---

# Where Business Rules Live

The platform uses different layers for different kinds of rules.

| Layer | Primary Responsibility |
|---|---|
| Frontend | Interaction, feedback, basic input validation |
| API / Server | Request validation, authentication, authorization |
| Database | Data integrity, relationships, uniqueness, invariants |
| Transactional RPC | Multi-step operations that require atomicity or row locking |
| Storage Policy | File-access boundaries |

Examples:

### Frontend

```text
"This field is required."
```

### API / Server

```text
"This user is not authorized to review payments."
```

### Database Constraint

```text
"A student cannot have two registrations for the same session."
```

### Transactional RPC

```text
"Approve the payment and update the related financial state as one operation."
```

The purpose is not to move every rule into PostgreSQL.

The purpose is to place each rule in the layer that can enforce it reliably.

---

# Architectural Principles

## 1. Model the workflow before changing the implementation

A technically clean implementation can still encode the wrong institutional rule.

## 2. Separate permanent records from period-specific records

Examples:

```text
Course
vs
Course Offering
```

and:

```text
Student
vs
Student Session Registration
```

## 3. Protect critical invariants at the database level

Frontend validation is useful, but it should not be the only protection against invalid data.

## 4. Use transactions for operations the business considers atomic

If several database writes represent one business action, partial success should not be an acceptable result.

## 5. Treat authorization as a business concern

Being authenticated is not the same as being allowed to perform an institutional action.

## 6. Design explicitly for failure paths

The system should have defined behaviour when:

- A request is repeated
- A record already exists
- Required configuration is missing
- Two users act concurrently
- A multi-step operation fails
- An approved financial action needs correction

## 7. Preserve important history

Especially in financial and approval workflows, correcting a mistake should not require destroying the record of what originally happened.

---

# Architecture Trade-offs

The architecture does not move every business rule into PostgreSQL.

Doing so would make ordinary application logic unnecessarily difficult to maintain.

It also does not keep every rule inside React or API routes, because application-layer checks alone cannot guarantee database consistency.

The responsibility is split deliberately:

```text
Frontend
→ interaction and immediate feedback

API / Server
→ application boundaries and authorization

PostgreSQL
→ data integrity and invariants

Transactional RPCs
→ atomic multi-step operations and concurrency control
```

This adds some architectural complexity.

The trade-off is accepted because the platform gains stronger consistency, clearer ownership of critical rules, and more predictable behaviour when operations fail or overlap.

---

# Related Documentation

For the business workflows:

[Core Workflows →](./workflows.md)

For security, concurrency, idempotency, transactions, and auditability:

[Reliability & Security →](./reliability-and-security.md)

For deeper engineering examples:

- [Platform Hardening Case Study](./case-studies/platform-hardening.md)
- [Registration Integrity Case Study](./case-studies/registration-integrity.md)
- [Financial Workflow Case Study](./case-studies/financial-workflow.md)
