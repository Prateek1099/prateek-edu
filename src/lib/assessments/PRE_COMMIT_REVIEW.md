# A0 final pre-commit review

> Historical review, before baseline reconciliation. Its baseline-drift blocker
> is addressed separately in `docs/BASELINE_RECONCILIATION.md`; the evidence below
> describes the earlier run, not the latest validation. The A0 migration filename
> has been updated mechanically; its SQL and runtime implementation are unchanged.

Decision: **BLOCKED on pre-existing migration/schema equivalence**, not on A0
record preservation or its now-passing concurrency behavior. No commit, push,
production database connection, migration, merge or deployment occurred in this
review. Local PostgreSQL 17.10 was built from checksum-verified official source
in a disposable directory; no project dependency was added.

## Existing-schema comparison

Baseline: `6253899b88e00fbc5e8d640f6b487d09ecc38112`.
The actual final schema diff is **+228/-0**, not the earlier approximate +290/-71.
Prisma formatting was run, but unrelated formatting changes were restored to keep
the business-schema diff focused. No removed lines remain to classify. There is
no relocation, replacement of existing relations, or unexplained structural removal.
An independent whitespace-normalized comparison of all 61 existing model/enum
definitions found zero removed/changed existing field or directive lines.

Only these inverse relation lists were added:

| Existing model | Additions |
| --- | --- |
| User | assessmentsCreated, assessmentAssignments, assessmentRecipients, assessmentEvents |
| Workspace | assessments |
| Subject | assessments |
| Class | assessmentAssignments |

The actual membership model is ClassStudent; WorkspaceClass/WorkspaceMembership
are not model names in this repository. ClassStudent, WorkspaceAcademicScope,
BankQuestion, SavedGeneratedPaper, WorkspaceAssignmentBatch/Recipient, Challenge,
ChallengeAttempt and MistakeEntry have no structural changes. No existing scalar,
enum, default, nullability, index, unique constraint or delete action was changed.
Inverse lists do not create columns on existing tables.

## Nine-model review

All primary keys are `id String @id @default(cuid())`. All foreign keys are
required unless explicitly marked optional. All deletion actions are RESTRICT.
There are no additional single-column unique fields beyond primary keys.

| Model | Foreign keys and rationale | Compound unique keys | Non-unique indexes | Lifecycle, time, immutability |
| --- | --- | --- | --- | --- |
| Assessment | workspaceId→Workspace (tenant); createdById→User (author); subjectId→Subject (scope) | None | workspaceId/archivedAt/createdAt; createdById; subjectId | createdAt, archivedAt; all fields except archive timestamp immutable |
| AssessmentVersion | assessmentId→Assessment (owner through parent) | assessmentId/versionNumber | Unique index also supports parent lookup | createdAt, publishedAt; published row cannot update/delete; header/title/total/duration frozen |
| AssessmentSection | versionId→Version (exact deliverable) | versionId/sortOrder; id/versionId | Unique version/order prefix supports lookup | No timestamps/status; label/order and child set sealed on publication |
| AssessmentQuestion | versionId→Version; sectionId→Section (membership in deliverable) | versionId/questionNumber; id/versionId | sectionId | No timestamps/status; text/type/options/marks/answers/provenance sealed on publication |
| AssessmentAssignment | versionId→Version (delivered content); classId→Class (audience scope); assignedById→User (actor) | id/versionId | classId/cancelledAt/opensAt; versionId; assignedById | assignedAt, opensAt, closesAt, cancelledAt; audience/duration/limit/identity immutable; cancellation irreversible |
| AssessmentRecipient | assignmentId→Assignment; studentId→User (exact recipient) | assignmentId/studentId; id/assignmentId | studentId/revokedAt | assignedAt, revokedAt; identity immutable; revocation irreversible |
| AssessmentAttempt | recipientId→Recipient; assignmentId→Assignment; versionId→Version (unambiguous attribution) | recipientId/attemptNumber; id/versionId; id/assignmentId | assignmentId/status; versionId; partial unique recipientId where IN_PROGRESS | startedAt, expiresAt, submittedAt, gradedAt, releasedAt; identity/deadline immutable; A0 only permits IN_PROGRESS→SUBMITTED |
| AssessmentResponse | attemptId→Attempt; questionId→Question; composite version links described below | attemptId/questionId | questionId | savedAt, updatedAt, revision, answered state; no delete; revision +1 required; no saves after submit/expiry |
| AssessmentEvent | assignmentId→Assignment; optional attemptId→Attempt; actorId→User | None | assignmentId/createdAt; attemptId/createdAt; actorId | createdAt; event type; append-only, cannot update/delete |

`sourceSavedPaperId`, `sourceQuestionId`, optional `originalBankQuestionId` and
optional `topicIdSnapshot` are scalar provenance, not foreign keys. Optional answer
fields and awardedMarks are not foreign keys. AssessmentEvent.attemptId is the
only nullable new FK.

Six SQL compound FKs supplement Prisma's simple relations:

1. Question(sectionId, versionId) → Section(id, versionId)
2. Attempt(recipientId, assignmentId) → Recipient(id, assignmentId)
3. Attempt(assignmentId, versionId) → Assignment(id, versionId)
4. Response(attemptId, versionId) → Attempt(id, versionId)
5. Response(questionId, versionId) → Question(id, versionId)
6. Event(attemptId, assignmentId) → Attempt(id, assignmentId)

Membership validity is a current-state service policy, not a permanent membership
FK that would prevent removing a student. A raw database writer is privileged:
role/active-membership authorization is enforced by the authenticated service.
Assignment class/workspace/subject consistency also has a database trigger.

## Complete delete/cascade matrix

| Deletion/action | Effect on A0 history |
| --- | --- |
| Teacher User delete | Blocked while author/assigner/event references exist; any existing cascade runs in the same failed deletion transaction |
| Student User delete | Blocked by Recipient/Event references |
| Workspace delete | Blocked by Assessment ownership FK |
| Class delete | Blocked by AssessmentAssignment FK |
| Membership removed/deleted | History retained; student start/delivery/save/submit authorization denied |
| Source saved paper deleted/archived | Scalar provenance only; independent published snapshots and attempts survive |
| Source BankQuestion deleted/edited | Scalar provenance only; assessment content/answers remain unchanged |
| Assessment archived | Blocks new assignment; already-assigned recipients retain access subject to current authorization; archive is not cancellation |
| Assessment deleted | Blocked when versions exist; no delete service; an empty unreferenced shell has no historical evidence |
| Published Version deleted/edited | Blocked by publication trigger and restrictive descendants, including submitted attempts |
| Section/Question deleted after publication | Blocked by seal trigger; response references also restrict question deletion |
| Assignment/Recipient/Attempt deleted with evidence | Blocked by dependent restrictive FKs; events/responses cannot be deleted |

All 20 simple FKs plus six compound FKs use **ON DELETE RESTRICT**.
New ON DELETE Cascade: **0**. SetNull: **0**. NoAction: **0**.
The simple Prisma FKs use ON UPDATE CASCADE; compound identity FKs use ON UPDATE
RESTRICT. Update cascade is not deletion cascade, and immutable identity triggers
prevent rewriting historical assessment identities. Existing unrelated delete
policies were not changed.

## Migration review and real database results

`20260907130000_add_assessment_foundation` adds nine tables, four enums, their
indexes/FKs/checks, and A0 triggers/functions. Every ALTER target is a newly created
assessment table. ALTER against an existing business table: **none**. No DROP,
type/nullability/default change, index removal, existing-FK replacement, data
rewrite or backfill occurs.

The migration now explicitly wraps its DDL in BEGIN/COMMIT. An injected division
by zero before COMMIT on real PostgreSQL rolled back all A0 tables, enum types and
functions, while every baseline row remained unchanged. No new FK requires data
backfill: new tables start empty. No nontransactional DDL is present. Individual
CREATE statements are not replayable: a second raw replay correctly fails on an
existing enum. After an actual Prisma failure, inspect the database and migration
tracking record, confirm rollback, resolve the failed migration as rolled back,
then retry only the corrected cause. Do not blindly mark it applied.

**Scenario A:** Prisma migrate deploy applied all 20 migrations to a clean local
PostgreSQL database. Local migrate status reports up to date. Status checks only
migration history, not schema equivalence.

**Scenario B:** Applied 19 baseline migrations, inserted synthetic users,
workspace, academic scope, class/membership, saved paper, bank question, Challenge,
Question, ChallengeAttempt, MistakeEntry, assignment batch and recipient. Applying
only A0 preserved every existing table's complete row values, column definitions,
indexes and constraints. Existing relation queries still work.

**Schema-equivalence blocker:** the exact pre-A0 baseline also differs from its
19 replayed migrations. The same non-A0 diff exists after A0:

- Course columns missing from migration replay: image_url, instructor_name,
  is_published, language, learning_outcomes, level, requirements,
  short_description, slug, target_audience; courses_slug_key also missing.
- workspace_academic_scopes.updated_at has a SQL default not represented in Prisma.
- Ten existing index names differ (PostgreSQL truncation versus Prisma naming).

No attempt was made to reconcile these unrelated differences, inspect production,
or append Course fixes to A0. Six extra A0 compound FKs appear as proposed drops
in a Prisma-only schema diff because they are SQL-only; those are intentional and
must not be dropped. No other new A0 field/default/index drift was found.

## Concurrency, timing, DTO and historical evidence

Real PostgreSQL service/constraint testing covers duplicate recipients/attempts/
responses, required ownership FK, class/version mismatch, cross-version responses,
restricted deletion, immutable versions, image rejection and rollback.

Three distinct backend PIDs and a control row lock prove simultaneous contention:

| Race | Result after the narrow retry fix |
| --- | --- |
| Same-recipient same-number start | Same attempt ID for both callers; one attempt and one start event |
| Start 1 versus start 2 with limit 1 | Exactly one persisted attempt; other caller gets a domain rejection |
| Two saves at revision N | One save, one STALE_RESPONSE; winning value persists at N+1 |
| Submit versus autosave | No post-finalization overwrite; a late saver gets LOCKED |
| Double submission | Identical final summary/timestamp; exactly one submit event |

The initial real race run exposed P2010 wrapping SQLSTATE 40001 on raw FOR UPDATE,
which the P2034-only retry classification missed. No corrupted evidence was seen.
Only the error classifier was extended: serialization/deadlock errors retry the
whole transaction up to the existing bound; exhausted retries return LOCKED.
Other raw-query errors are not masked or retried. No uniqueness/locking guard was
weakened to make tests pass.

UTC instant/deadline and event-default tests pass with session timezone
Asia/Kolkata. Start/expiry use database time; no client elapsed-time input exists.
Expired attempts reject response saves while allowing explicit submission of
already-saved evidence.

DTO construction is a whitelist throughout; no raw Prisma spread is returned to a
student. Tests inject nested correctAnswer/correctOption/modelAnswer,
acceptedAnswers, markingScheme, teacherNotes, gradingMetadata, private server
configuration and Blob URLs. None survives serialization. Current question media
and embedded-delivery references reject the whole authoritative source before
insertion. No image stripping, subset assessment, or partial rows are created.

Publication triggers prohibit ordinary Prisma update/delete/append operations.
Source edits/archive/deletion and a second version under the SAME assessment do
not change the old version or attempt. Question/response linkage remains exact.

## Harness, scope and remaining gate

Test source has no developer-specific absolute path, credential or temporary
database artifact. The baseline schema copy, downloaded PostgreSQL source/binaries,
database files and execution logs live outside Git in a disposable temporary
directory. No package changes or production runtime import of the test adapters
was added. Existing Paper Builder, student/teacher workspace, practice, scoring,
assignments, auth and image/print/DOCX code is unchanged.

README distinguishes implemented A0 from planned A, A0.5, B and separately scoped
C. There is no full student assessment runner or grading/release UI.

Next decision: authorize a separate baseline migration-history investigation or
provide the approved explanation/reconciliation for the historical drift. Do not
silently repair it in this A0 migration. This review does not approve release.

## Final validation record

| Check | Result |
| --- | --- |
| Prisma format / validate / generate | Passed; unrelated formatting restored |
| TypeScript / targeted ESLint | Passed |
| Real PostgreSQL foundation and constraint suite | 52/52 passed |
| Real PostgreSQL concurrency suite | 6/6 including parent; all five required races passed |
| Real PostgreSQL upgrade/failure-safety suite | 5/5 including parent |
| Complete repository suite, embedded default | 480 passed, 0 failed, 2 explicitly skipped real-PG entry points |
| Production build | Passed, with DATABASE_URL overridden to disposable local PostgreSQL |
| git diff / new-file whitespace checks | Passed |
| Local Prisma migration status | All 20 migrations applied; up to date |
| Prisma schema equivalence | Blocked by proven pre-existing baseline drift |

The two skipped real-PG entry points were both run separately and passed as shown
above; their parent counts are not extra distinct business scenarios. Existing
cookie-based dynamic-render diagnostic messages still appear during the successful
build. The temporary PostgreSQL server was stopped after validation; its synthetic
databases and logs remain outside the repository for inspection. Production
migration status was intentionally not queried during this no-production-access
review.
