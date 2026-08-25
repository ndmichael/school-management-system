# System Architecture

This document describes the high-level architecture of the Institutional Management Platform, how the major parts of the system interact, and where different types of business rules are enforced.

The platform manages several connected institutional domains:

- Admissions
- Application review
- Applicant-to-student conversion
- Student records
- Academic sessions
- Programmes
- Courses
- Course offerings
- Student registration
- Staff and access control
- Finance and payments

Although these areas appear as separate modules in the interface, they share the same application, authentication, API, and database infrastructure.

The architecture therefore focuses on keeping those workflows connected without allowing business rules to become scattered across the application.

---

## Architecture Overview

At a high level, the platform follows this structure:

```text
                    Users
                      │
                      ▼
             Next.js Application
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
      UI / Pages           Authentication
                                  │
                                  ▼
                           Authorization
                                  │
                                  ▼
                              API Layer
                                  │
                                  ▼
                         Business Workflows
                                  │
             ┌────────────────────┼────────────────────┐
             │                    │                    │
             ▼                    ▼                    ▼
       PostgreSQL /          Supabase Auth       Supabase Storage
         Supabase
             │
      ┌──────┼─────────┐
      │      │         │
      ▼      ▼         ▼
Constraints RPCs    Audit Data
```

<!-- IMAGE PLACEHOLDER -->

![System Architecture](./assets/diagrams/system-architecture.png)

The key idea is that not every rule belongs in the same layer.

Some rules improve the user experience.

Some protect application access.

Others protect the integrity of the data itself.

---

# Frontend Layer

The frontend is built with:

- Next.js 15
- React
- TypeScript
- Tailwind CSS

The frontend provides the different dashboards and workflows used by applicants, students, staff, reviewers, administrators, and finance personnel.

Its main responsibilities include:

- Rendering application state
- Collecting user input
- Performing basic client-side validation
- Displaying role-specific interfaces
- Calling server APIs
- Presenting errors and workflow outcomes

The frontend is intentionally **not treated as the final security or business-rule layer**.

A user hiding a button in the interface does not mean the underlying operation is secure.

Critical rules still need to be enforced by the server or database.

---

# Application and API Layer

Next.js API routes act as the main application boundary between the frontend and sensitive backend operations.

The API layer is responsible for things such as:

- Request validation
- Authentication checks
- Authorization checks
- Input normalization
- Calling database operations
- Calling PostgreSQL RPCs
- Returning controlled HTTP responses

A typical protected workflow looks like:

```text
Frontend Request
       │
       ▼
API Route
       │
       ▼
Validate Input
       │
       ▼
Authenticate User
       │
       ▼
Authorize Operation
       │
       ▼
Execute Business Logic
       │
       ▼
Return Result
```

For simple operations, the API may interact directly with the database.

For operations requiring multiple dependent writes, stronger consistency, or concurrency protection, the API delegates the critical work to PostgreSQL functions.

---

# Authentication

Authentication is handled through Supabase Auth.

Authentication answers:

> Who is making this request?

The application verifies the authenticated user before allowing protected operations.

This prevents the application from trusting user IDs supplied directly by the browser for sensitive actions.

For example, when recording who reviewed a financial transaction, the reviewer identity should come from the authenticated session rather than from:

```json
{
  "reviewer_id": "some-user-id-from-the-browser"
}
```

The server determines the authenticated user and supplies that identity to the database operation.

---

# Authorization

Authentication and authorization are deliberately treated as separate concerns.

Authentication answers:

> Who are you?

Authorization answers:

> Are you allowed to perform this operation?

Authorization can depend on more than a broad user role.

For example:

```text
Authenticated User
        │
        ▼
Profile / Main Role
        │
        ▼
Staff Record
        │
        ▼
Unit / Responsibility
        │
        ▼
Allowed Operation
```

This became important for workflows where a generic staff role would otherwise provide too much access.

For example, financial review can be restricted to administrators and authorized bursary personnel rather than every non-academic staff member.

<!-- IMAGE PLACEHOLDER -->

![Authorization Flow](./assets/diagrams/authorization-flow.png)

More detail is documented in:

[reliability-and-security.md](./reliability-and-security.md)

---

# Major Domain Boundaries

The application is organized around several related business domains.

## Admissions

The admissions domain handles:

- Applications
- Applicant information
- Documents
- Application review
- Admission decisions
- Duplicate-application protection

The applicant remains separate from the active student domain until conversion occurs.

---

## Student Lifecycle

The student domain begins after an accepted applicant has been converted.

It handles:

- Student records
- Matriculation information
- Programme relationships
- Academic-session registration
- Registration history

This separation prevents admissions data and active student data from becoming the same concept.

---

## Academic Operations

The academic domain includes:

- Academic sessions
- Semesters
- Programmes
- Courses
- Course offerings
- Lecturer assignment
- Course publication
- Student course registration

One important architectural distinction is:

```text
Course ≠ Course Offering
```

A course describes the academic subject.

A course offering describes when, where, and for whom that course is available.

---

## Staff & Access

The staff domain contains information required to determine institutional responsibilities.

This includes:

- Academic staff
- Non-academic staff
- Roles
- Units / departments
- Operational permissions

This domain works closely with authorization.

---

## Finance

The finance domain includes:

- Programme fee plans
- Student fee accounts
- Payment records
- Payment review
- Account balances
- Rejections
- Reversals
- Financial audit information

Financial state is connected to the appropriate student academic registration rather than being treated as one lifetime balance.

---

# Database Layer

PostgreSQL, accessed through Supabase, is the main persistence layer.

The database is not treated only as a storage mechanism.

It also protects important business invariants.

The platform uses database features including:

- Primary keys
- Foreign keys
- Unique constraints
- Check constraints
- Indexes
- PostgreSQL functions
- Transactions
- Row locking

The general principle is:

> If breaking a rule would leave the system in an invalid state, that rule should not depend only on the frontend.

---

# Database Constraints

Constraints provide the final line of protection for several important workflows.

Examples include preventing duplicate logical records such as:

```text
Student + Academic Session
```

from appearing more than once.

Similar protection exists for workflows such as:

- Applications
- Student session registrations
- Course enrolments
- Student fee accounts

This gives the application two levels of protection:

```text
Application validation
        +
Database enforcement
```

The API can provide a useful error message.

The database guarantees the invariant.

---

# PostgreSQL RPCs and Transactional Workflows

Some workflows require several related database changes.

Examples include:

- Applicant-to-student conversion
- Student session registration
- Fee-account creation
- Payment review
- Payment reversal

These operations are stronger when executed as one database transaction.

Conceptually:

```text
BEGIN

Validate current state

Lock required records

Perform related inserts / updates

Recalculate dependent state

Write audit information

COMMIT
```

If an important step fails:

```text
ROLLBACK
```

This prevents situations where one half of a business operation succeeds while another fails.

For example:

```text
Student Registration Created ✅
Fee Account Creation Failed ❌
```

should not silently leave the platform in an inconsistent state when those records are expected to exist together.

---

# Concurrency Control

Some workflows can be triggered by multiple users at nearly the same time.

Financial operations are a good example.

Where shared state must be protected, PostgreSQL row locking is used:

```sql
SELECT ...
FOR UPDATE;
```

This allows one transaction to temporarily lock the relevant row while it completes its work.

Another transaction attempting to modify the same state must wait.

This protects against race conditions such as two reviewers independently approving the same payment based on the same previous balance.

Concurrency behaviour is documented more deeply in:

[reliability-and-security.md](./reliability-and-security.md#race-condition-protection)

---

# Idempotency and Duplicate Protection

Concurrency and idempotency solve different problems.

Concurrency asks:

> What happens when multiple operations happen at the same time?

Idempotency asks:

> What happens when the same logical operation happens more than once?

The platform uses uniqueness rules and controlled conflict handling to protect important workflows from duplicate processing.

Examples include:

```text
Applicant + Programme + Session
```

and:

```text
Student + Academic Session
```

The goal is that repeating the same logical operation does not create multiple copies of the same business record.

---

# Storage

Supabase Storage is used for uploaded files associated with platform workflows.

Examples can include:

- Application documents
- Supporting documents
- Financial evidence / receipt files

Storage access should follow the same principle as database access:

> Possessing a URL should not automatically mean someone is allowed to access a sensitive institutional file.

For sensitive files, server-controlled access and appropriate storage policies are preferred over exposing unrestricted public URLs.

---

# Redis

Redis is available as a supporting infrastructure component.

Its role should remain separate from the system's permanent business state.

PostgreSQL remains the source of truth for institutional records.

Redis is better suited to temporary or performance-oriented concerns such as:

- Caching
- Short-lived state
- Background processing coordination
- Rate limiting
- Queue-related workloads

The system should not rely on Redis as the authoritative store for important institutional or financial records.

---

# Where Business Rules Live

One of the most important architectural lessons from this project was deciding **where a rule belongs**.

I generally think about the layers like this:

| Layer | Responsibility |
|---|---|
| Frontend | User experience and immediate feedback |
| API | Request validation, authentication, authorization |
| Database | Data integrity and invariants |
| RPC / Transaction | Multi-step business operations requiring atomicity |
| Storage policies | File-access boundaries |

For example:

### Frontend

```text
"This field is required."
```

### API

```text
"This user is not authorized to review payments."
```

### Database constraint

```text
"A student cannot have two registrations for the same session."
```

### Transactional RPC

```text
"Approve payment and update the financial account as one atomic operation."
```

Keeping these responsibilities clear makes the system easier to reason about.

---

# Example: Applicant → Student Architecture

The applicant-conversion workflow crosses several domains.

```text
Application
     │
     ▼
Admission Decision
     │
     ▼
Conversion Workflow
     │
     ├────────► Profile
     │
     ├────────► Student
     │
     ├────────► Student Registration
     │
     └────────► Fee Account
```

<!-- IMAGE PLACEHOLDER -->

![Applicant Conversion Architecture](./assets/diagrams/applicant-conversion.png)

Because these records are related, conversion should be handled as a business workflow rather than allowing each record to be created independently.

---

# Example: Academic Architecture

The academic structure separates permanent records from period-specific records.

```text
Programme
     │
     ▼
Course
     │
     ▼
Course Offering
     │
     ├── Academic Session
     ├── Semester
     ├── Level
     ├── Programme
     └── Lecturer
             │
             ▼
      Student Course Registration
```

<!-- IMAGE PLACEHOLDER -->

![Academic Architecture](./assets/diagrams/academic-architecture.png)

This separation allows a course to exist independently from the semester in which it is offered.

---

# Example: Financial Architecture

Financial state is connected to the student's academic registration.

```text
Programme Fee Plan
        │
        ▼
Student Registration
        │
        ▼
Student Fee Account
        │
        ▼
Payment Events
        │
        ▼
Validation / Review
        │
        ▼
Approved Financial State
        │
        ├── Balance
        ├── Payment Status
        └── Audit History
```

If an approved financial event needs correction:

```text
Approved Payment
       │
       ▼
Controlled Reversal
       │
       ▼
Account Recalculation
       │
       ▼
History Preserved
```

<!-- IMAGE PLACEHOLDER -->

![Financial Architecture](./assets/diagrams/financial-architecture.png)

---

# Architectural Principles

A few principles became increasingly important while reviewing the platform.

## 1. Understand the workflow before changing the code

A technically clean implementation can still encode the wrong business rule.

---

## 2. Keep permanent concepts separate from period-specific concepts

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

---

## 3. Protect invariants at the database level

The frontend should not be the only thing preventing invalid data.

---

## 4. Use transactions when several writes represent one action

If the business sees several database updates as one operation, the database should usually treat them that way too.

---

## 5. Treat authorization as part of the architecture

Security is not only about whether a user is logged in.

The system also needs to understand their institutional responsibility.

---

## 6. Design for failure paths

The system should have clear behaviour when:

- requests are repeated
- records already exist
- configuration is missing
- concurrent operations occur
- part of an operation fails
- a financial correction is needed

---

## 7. Preserve important history

Especially for financial and approval workflows, correcting a mistake should not require destroying the record of what happened.

---

# Architecture Trade-offs

The platform does not try to move every piece of logic into PostgreSQL.

That would make the application unnecessarily difficult to maintain.

Likewise, keeping every business rule inside React or API routes would leave important invariants too easy to bypass.

The architecture therefore uses a combination:

```text
UI
for interaction

API
for application boundaries and authorization

PostgreSQL
for data integrity

RPCs
for atomic business operations
```

The trade-off is additional architectural complexity, but the benefit is clearer ownership of important rules and stronger protection against inconsistent state.

---

# Related Documentation

For the actual business workflows:

[Core Workflows →](./workflows.md)

For security, concurrency, idempotency, transactions, and auditability:

[Reliability & Security →](./reliability-and-security.md)

For deeper engineering stories:

- [Platform Hardening Case Study](./case-studies/platform-hardening.md)
- [Registration Integrity Case Study](./case-studies/registration-integrity.md)
- [Financial Workflow Case Study](./case-studies/financial-workflow.md)

