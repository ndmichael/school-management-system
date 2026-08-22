# Registration & Academic Data Integrity

## Context

Registration looks simple from the interface.

Select a student, choose an academic session, click register.

But once I followed the workflow deeper into the system, I realised registration sits at the centre of several other records.

A successful registration determines things such as:

- Which academic session the student belongs to
- Which programme context applies
- Which courses can later become available
- Which fee plan applies
- Which student fee account should exist

That meant a registration could not be treated as an isolated insert.

The main question became:

> What records must always remain consistent when a student is registered?

---

## The Registration Model

A student exists independently from an academic registration.

The student represents the person.

The registration represents that student's participation in a particular academic year.

```text
Student
   ↓
Student Registration
   ├── Academic Session
   ├── Programme
   └── Financial Account
```

This distinction is important because the same student can move through several academic sessions without creating a new student record each year.

<!-- IMAGE PLACEHOLDER -->

![Registration Model](../assets/diagrams/registration-model.png)

---

# One Registration per Academic Session

One of the main integrity rules is:

> A student should only have one registration for the same academic session.

The logical identity of the registration is therefore:

```text
Student
+
Academic Session
```

This rule is protected with a database uniqueness constraint.

Conceptually:

```sql
UNIQUE(student_id, session_id)
```

The frontend can check whether the student is already registered, but that is not enough.

Two requests could still reach the server at almost the same time.

The database therefore remains the final authority.

---

# Why the Academic Session Represents the Full Year

The platform treats one academic session as the complete academic year.

For example:

```text
2025 / 2026
```

The first and second semesters exist inside that session.

```text
2025 / 2026
     ↓
 ┌───┴───┐
 ↓       ↓
First   Second
```

Because of this, a student registers once for the academic year rather than creating a new student registration for every semester.

Semester-specific behaviour belongs to other records such as course offerings.

This keeps the model clear:

```text
Student Registration
→ Academic year

Course Offering
→ Academic year + semester
```

---

# Initial Registration During Applicant Conversion

The first registration can be created when an accepted applicant is converted into a student.

The workflow is approximately:

```text
Accepted Application
        ↓
Create / Connect Profile
        ↓
Create Student
        ↓
Create Student Registration
        ↓
Find Programme Fee Plan
        ↓
Create Student Fee Account
```

This already created the financial account required for the student's first academic session.

The issue appeared later when existing students were registered into another academic session.

---

# Problem Identified

The single and bulk session-registration workflows originally created:

```text
Student Registration
```

but did not create:

```text
Student Fee Account
```

The applicant-conversion workflow handled fee-account creation, but that function only runs when an applicant first becomes a student.

An existing student moving into a new academic session does not go through applicant conversion again.

That could produce:

```text
Student
   ↓
New Session Registration ✅
   ↓
Fee Account ❌
```

The academic record existed, but the expected financial record did not.

That was a cross-workflow integrity problem.

The individual features worked independently, but together they could produce incomplete state.

---

# The Fix

I updated both the single and bulk registration workflows so a successful registration also creates the corresponding student fee account.

The account is based on the programme fee plan for the target academic session.

```text
Student
   ↓
Target Academic Session
   ↓
Programme
   ↓
Programme Fee Plan
   ↓
Student Registration
   ↓
Student Fee Account
```

The fee account starts with:

```text
Annual Fee
→ value from programme fee plan

Approved Paid
→ 0

Balance Due
→ annual fee

Payment Status
→ unpaid
```

---

# One Fee Account per Registration

A fee account belongs to a specific student registration.

The relationship is protected so the same registration cannot accidentally receive multiple fee accounts.

Conceptually:

```sql
UNIQUE(student_registration_id)
```

This gives the database another important invariant:

```text
One Student Registration
        ↓
At Most One Fee Account
```

The application can attempt to behave correctly.

The database guarantees the relationship.

---

# Single Session Registration

## Goal

Single registration processes one specific student.

The workflow became:

```text
Student Selected
      ↓
Target Session Selected
      ↓
Validate Student
      ↓
Validate Session
      ↓
Check Existing Registration
      ↓
Find Programme Fee Plan
      ↓
Create Registration
      ↓
Create Fee Account
      ↓
Return Result
```

<!-- IMAGE PLACEHOLDER -->

![Single Registration](../assets/screenshots/single-session-registration.png)

---

## Missing Fee Plan

For single registration, a missing programme fee plan causes the operation to fail.

For example:

```text
Student Programme
       ↓
Target Session
       ↓
No Fee Plan
       ↓
Registration Fails
```

The reason is that the expected state after a successful registration is:

```text
Registration
+
Fee Account
```

Creating only one would leave an incomplete workflow.

---

# Bulk Session Registration

Bulk registration has a different business requirement.

The system may be asked to process many students at once.

For example:

```text
25 students
```

If one student cannot be registered correctly, failing all 25 may not be the best operational behaviour.

The bulk workflow therefore processes each selected student individually.

```text
Selected Students
       ↓
Process Student
       ↓
 ┌─────┴─────────────┐
 ↓                   ↓
Valid               Invalid
 ↓                   ↓
Create              Skip
Registration         Student
 ↓                   ↓
Create              Record Reason
Fee Account           ↓
 ↓                   Continue
Continue
```

<!-- IMAGE PLACEHOLDER -->

![Bulk Registration](../assets/screenshots/bulk-session-registration.png)

---

## Missing Fee Plan During Bulk Registration

If a student's programme does not have a fee plan configured for the target academic session:

```text
Student
   ↓
Fee Plan Missing
   ↓
Skip Student
   ↓
Return Reason
```

The remaining valid students continue processing.

An example returned reason is:

> No fee plan is configured for the student's programme and target session.

This is intentional behaviour rather than simply ignoring an error.

---

# Single vs Bulk Behaviour

The two workflows perform similar work but have different failure semantics.

| Single Registration | Bulk Registration |
|---|---|
| Processes one student | Processes many students |
| Missing required configuration fails the request | Invalid student can be skipped |
| Caller expects one clear outcome | Caller expects a result for each student |
| All-or-nothing for that student | Partial batch success is allowed |

This was one of the more useful design lessons from the module.

Two workflows can share most of their underlying logic while still needing different business behaviour.

---

# Atomic Registration

For one student, registration and fee-account creation represent one logical operation.

The valid outcomes are:

```text
Registration Created
+
Fee Account Created
```

or:

```text
Neither Created
```

The invalid outcome is:

```text
Registration Created
+
Fee Account Missing
```

The database function handles these related writes within the same transaction.

If a required insert fails, the operation rolls back.

This protects the workflow from partial state.

---

# Concurrency Protection

Registration can also be affected by concurrent requests.

Imagine two requests attempt to register the same student into the same academic session at almost the same time.

Both might initially observe:

```text
No Registration Found
```

and then both attempt to insert.

The unique constraint on:

```text
student_id + session_id
```

provides the final database protection.

The workflows also use database locking where appropriate while processing important source records.

The important lesson was:

> Checking first does not replace enforcing the rule.

A query like:

```text
Does this registration already exist?
```

is useful for application behaviour.

The uniqueness constraint is what guarantees correctness.

---

# Idempotency

Registration also introduced an important idempotency concept.

If the same logical request is repeated:

```text
Register Student A
for Session 2026/2027
```

the system should not create:

```text
Registration 1

Registration 2

Registration 3
```

The logical operation has one valid business result.

Database uniqueness helps make repeated attempts safe.

This is different from a race condition.

A repeated request may happen seconds or minutes later.

A race condition involves overlapping operations.

The registration model needs protection against both.

---

# Course Registration Integrity

The same reasoning applies later when students register for courses.

A student should not be enrolled into the same course offering multiple times.

The logical relationship is:

```text
Student
+
Course Offering
```

The platform therefore treats course enrolment as another business relationship that needs duplicate protection.

---

# Why Course Offerings Matter

Course-registration integrity also depends on keeping courses and offerings separate.

A course tells the system:

```text
What is this subject?
```

A course offering tells the system:

```text
Is this subject actually available
for this programme,
session,
semester,
and level?
```

The student's available courses should therefore come from valid offerings rather than simply returning every course in the catalogue.

This protects academic context as well as duplicate enrolment.

---

# Integrity Across Workflows

One of the bigger lessons from the review was that integrity problems often exist **between modules**, not inside one module.

For example:

```text
Applicant Conversion
→ correctly creates fee account
```

while:

```text
New Session Registration
→ originally did not
```

Both individual features could appear to work.

The inconsistency only becomes visible when the full student lifecycle is followed.

That is why I started reviewing workflows end-to-end rather than evaluating pages independently.

---

# Where the Rules Are Enforced

The registration workflow uses several layers.

## Frontend

Helps the user choose valid students and sessions and displays useful errors.

## API

Validates the request and protects the operation.

## PostgreSQL Function

Coordinates the related registration operation.

## Database Constraints

Protect permanent invariants such as:

```text
One registration per student/session
```

and:

```text
One fee account per registration
```

The combination is stronger than depending on one layer alone.

---

# Failure Cases Considered

## Duplicate Session Registration

```text
Student already registered
        ↓
Second registration prevented
```

---

## Missing Fee Plan — Single Registration

```text
Required fee plan missing
        ↓
Operation fails
        ↓
No incomplete registration
```

---

## Missing Fee Plan — Bulk Registration

```text
Required fee plan missing
        ↓
Student skipped
        ↓
Reason returned
        ↓
Other students continue
```

---

## Duplicate Fee Account

```text
Registration already has fee account
        ↓
Second fee account prevented
```

---

## Concurrent Registration

```text
Two requests
Same student
Same session
        ↓
Database uniqueness protects final state
```

---

## Duplicate Course Enrolment

```text
Student already enrolled
in offering
        ↓
Duplicate prevented
```

---

# Trade-offs

The final design was not the only possible design.

Several decisions involved choosing one behaviour over another.

### Fail single registration when fee configuration is missing

This gives stronger consistency, but it also means registration depends on finance configuration being ready.

### Allow partial success during bulk registration

This makes large administrative operations more practical, but callers need a clear result showing which students succeeded and which were skipped.

### Store the applicable annual fee on the student fee account

This preserves the fee that applied when the account was created, but changes to the programme fee plan do not automatically rewrite historical student accounts.

### Enforce uniqueness in PostgreSQL

This gives strong protection against duplicate records, but corrections and exceptional migrations need to respect those constraints deliberately.

### Use database functions for multi-step registration

This improves atomicity and integrity, but moves some business logic out of the application code and into PostgreSQL.

These were intentional trade-offs rather than accidental limitations.

---

# Outcome

After the changes, the registration model became more consistent across the student's lifecycle.

The system now has stronger guarantees around:

- Application uniqueness
- Student session uniqueness
- Fee-account creation
- Fee-account uniqueness
- Single registration
- Bulk registration
- Missing fee configuration
- Course-enrolment uniqueness
- Concurrent registration attempts

The biggest lesson was that data integrity is rarely about one table.

It comes from understanding the relationships between business records and deciding which combinations must always remain valid.

---

# What I Learned

This review changed the way I think about registration workflows.

The important questions became:

```text
What record are we creating?

What other records must exist with it?

What makes this record unique?

Can the request happen twice?

Can two requests happen simultaneously?

What happens when configuration is missing?

Should one failure stop the entire operation?

Which layer should guarantee the rule?
```

Those questions made the implementation much easier to reason about than simply adding more validation to the UI.

---

# Related Documentation

- [System Architecture](../architecture.md)
- [Core Workflows](../workflows.md)
- [Reliability & Security](../reliability-and-security.md)

## Related Case Studies

- [Platform Hardening](./platform-hardening.md)
- [Financial Workflow Hardening](./financial-workflow.md)

---

## Visual Placeholders

```text
docs/assets/
├── diagrams/
│   └── registration-model.png
│
└── screenshots/
    ├── single-session-registration.png
    └── bulk-session-registration.png
```

<!-- Delete this section once the final visuals are added. -->