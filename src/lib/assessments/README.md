# Online Assessment A0 — image-free foundation

This is a backend foundation, not a student exam runner. It adds no route, UI,
Server Action, grading endpoint, release endpoint, or integration into existing
Practice/Challenge assignments. `service.ts` is the session-authenticated entry
point for future server callers. Never expose `engine.ts`'s actor injection to a
client; it exists for isolated service tests.

## Persistence and ownership

Migration: `20260907130000_add_assessment_foundation`.

This is migration #21, after the original 19 and the separate
`20260907120000_reconcile_baseline_schema` repair. The earlier unapplied name was
`20260906120000_add_assessment_foundation`; only its ordering/name changed, not SQL.
See `docs/BASELINE_RECONCILIATION.md` for the independent baseline repair.

| Model | Responsibility / integrity |
| --- | --- |
| Assessment | Immutable teacher/workspace/subject ownership and source provenance; archive timestamp |
| AssessmentVersion | Version-numbered, published immutable paper, header, marks and duration |
| AssessmentSection | Ordered snapshot section belonging to exactly one version |
| AssessmentQuestion | Exact final numbering, type, text, options, marks and server-only answer snapshot |
| AssessmentAssignment | One published version, exact class, audience, opening/closing window, duration and attempt limit |
| AssessmentRecipient | Unique assignment/student pair; irreversible revocation |
| AssessmentAttempt | Exact recipient + assignment + version; attempt number, server times and lifecycle |
| AssessmentResponse | Unique attempt/question, exact version, typed value, revision and save timestamps |
| AssessmentEvent | Append-only assignment/start/submit/cancellation/revocation history |

Enums: `AssessmentAudience`, `AssessmentAttemptStatus`,
`AssessmentResponseState`, `AssessmentEventType`. Grade/result event names and
separate grading/release timestamps reserve lifecycle vocabulary, not working
grading features. No rubric or media models are added.

Only inverse Prisma relations are added to existing User, Workspace, Subject and
Class models. The migration does not add columns to those existing tables, rewrite
data, or backfill Practice history.

All database relationships use **ON DELETE RESTRICT**, not cascade. Deleting a
teacher, student, class, subject or workspace cannot remove assessment evidence.
Published versions and their section/question rows cannot be changed or deleted.
Responses cannot be deleted, and events are append-only. There is no A0 delete
service. Source saved-paper, original bank-question and snapshotted topic IDs are
scalar provenance, deliberately not live foreign keys: deleting or archiving a
source does not erase or mutate the independent snapshot. Source labels are copied.

Indexes cover workspace/archive/date, subject, version, class/cancelled/opening,
student/revoked, assignment/status, response-question and event lookup. Unique
constraints cover assessment/version number, section order, final question
number, assignment/student, recipient/attempt number and attempt/question. Six
additional compound foreign keys prevent cross-version or cross-assignment
attribution. A partial unique index allows only one IN_PROGRESS attempt per
recipient. Keep these custom SQL constraints/triggers in future migration reviews;
Prisma's schema alone does not describe every guard.

## Snapshot and media boundary

`createFromSavedPaper` accepts only an active saved paper in the authenticated
teacher's active workspace and assigned, published academic scope. It checks the
saved board/qualification/subject relationship. It copies the authoritative saved
snapshot, not live BankQuestion content or a client-provided paper object.
All seven existing question types are validated using the shared bank validator.
Section completeness, final numbering, duplicate IDs/normalized text, marks and
duration are revalidated. Creation, child inserts and publication form one
transaction. A0 creates version 1; a future version-creation service must make a
new version, never modify a published one.

Current saved questions have `imageUrl`, `imageAlt` and `imageCaption`. There are
no separate structured option-image, stimulus-image, section-image or answer-image
fields. Any nonblank **imageUrl** rejects the entire source. Standalone alt/caption
text is not delivered and is not treated as an image. The shared validator also
checks delivered header/context text, section labels, questionText and optionA–D
for public Blob URLs, inline Markdown images, image/audio/video data URLs and
HTML media source references. Teacher-only marking fields are never copied into
the student DTO. Do not add a new delivery/media field without extending this
validator and its tests.

Error code: `MEDIA_UNSUPPORTED`.

> This paper contains images and cannot yet be used for an online assessment. Image-enabled assessments will be supported after private assessment media is introduced.

Validation runs before the first insert, with transaction rollback as a second
boundary. One image blocks the **whole** paper: no stripping, skipping questions,
placeholder substitution or partial assessment rows. Existing public Paper Archive
image handling, Question Bank, print and DOCX are untouched.

`studentAssessmentDto` uses an explicit whitelist for header, section and question
delivery. It never serializes raw Prisma objects. Correct/model answers,
explanations, marking schemes, accepted answers, grading metadata, provenance and
teacher-only notes are excluded. A second serialization guard rejects inherited
public Blob or media data URLs. No result/answer-release DTO exists in A0.

## Assignment and authorization

- Teacher identity comes from the session and is rechecked against the database.
  Only TEACHER with an ACTIVE owned workspace is supported; SUPER_ADMIN is not
  silently treated as a teacher.
- Assignment requires an active same-workspace class with the exact subject and
  current WorkspaceAcademicScope / published hierarchy.
- CLASS snapshots the current active STUDENT roster. Late joins are not silently
  added. SELECTED_STUDENTS must be unique active members of that exact class.
- Assignment policy is immutable except irreversible cancellation; recipient
  identity is immutable except irreversible revocation.
- Each student request checks STUDENT role, exact recipient ownership, active
  class/membership/workspace/scope and no cancellation/revocation. User.workspaceId
  never grants student authorization.
- Existing WorkspaceAssignmentBatch/Recipient and Challenge rows are not used.
  No automatic publication of a worksheet or student assignment occurs.

## Attempt, timing and response contracts

`start(recipientId, attemptNumber)` treats the requested exact attempt number as
the retry/idempotency key. It locks the recipient, returns an existing matching
attempt, or creates the next allowed number. Limits are 1–10, duration 1–300
minutes. New attempts require an open assignment window and no in-progress attempt.
Serializable transactions retry serialization/unique conflicts; uniqueness is also
enforced in PostgreSQL. This is not a general request-idempotency framework.

Time comes from the database clock, normalized to UTC and millisecond precision.
The server sets startedAt and `expiresAt = min(start + duration, closesAt)`.
UTC database defaults avoid dependence on the database session timezone. No client
elapsed-time value is accepted. Delivery and writes stop at expiry. An expired
attempt may explicitly submit its already-saved evidence, but cannot add late
answers. There is no automatic expiry job; submit the existing attempt before
starting the next one.

Start creates an UNANSWERED response for every snapshot question. Values are:

- MCQ / assertion-reason: `{ kind: "choice", value: "A" | "B" | "C" | "D" }`
- True/false: `{ kind: "boolean", value: boolean }`
- Fill-blank / written: `{ kind: "text", value: string }`
- Unanswered: `null`

Nonblank text preserves Unicode and whitespace (maximum 20,000 characters).
Empty/whitespace-only text clears an answer without deleting the response.
Autosave requires the expected revision; stale saves fail rather than overwrite
newer work. Attempt row locks serialize response edits and submission. Composite
foreign keys enforce the exact question/version/attempt relationship.

Submit freezes responses, records server submittedAt and one submission event.
Repeating it returns the existing attempt summary. A0 supports only
IN_PROGRESS → SUBMITTED; database triggers deliberately block accidental grading,
release or reopening. Submission accepts no replacement answer payload.

## Marks and future grading

`marksSummary` is marks-based: 1 awarded mark out of 5 = 20%, not one of two
questions = 50%. Incomplete marking returns no final awarded total or percentage.
`requireReleasable` requires GRADED and complete marks. There is no automatic
objective scoring, subjective marking, provisional-result delivery or result
release action in A0. A later reviewed grading migration/service must deliberately
extend the lifecycle trigger and persist marking evidence before enabling release.
Manual release is the only planned policy; no speculative policy enum is added.

## Validation and limits

Run the isolated assessment tests:

```sh
node --require ./scripts/assessment-test-loader.cjs --test src/lib/assessments/foundation.test.ts
```

Run all repository `.test.ts` files:

```sh
node --require ./scripts/assessment-test-loader.cjs --test $(rg --files src | rg '\.test\.ts$')
```

The loader transpiles TypeScript only for tests. By default, `local-test-db.ts`
executes all historical SQL migrations plus A0 in an ephemeral, in-memory
PostgreSQL-compatible PGlite database. PGlite is an existing locked transitive
Prisma development dependency; no package or lockfile changes were made. The
harness never reads DATABASE_URL or environment files and does not connect to Neon.

Real PostgreSQL review is explicitly opt-in through
`ASSESSMENT_TEST_DATABASE_URL`. It accepts only `postgresql://` on `127.0.0.1`
with a `vexa_a0_*` database name. Provision EMPTY disposable local databases first:

1. Run `foundation.test.ts` alone against one empty database. It applies all SQL
   migrations and creates synthetic fixtures.
2. Run `postgres-concurrency.test.ts` against that same database. It uses three
   distinct backend connections and a row-lock barrier, verified in pg_stat_activity,
   so both competing operations actually contend.
3. Run `postgres-migration.test.ts` against a different empty database. It replays
   the 19 baseline migrations, seeds representative existing records, injects an
   A0 migration failure, and verifies rollback and upgrade preservation.

Do not run all opt-in suites concurrently against the same database. The full
repository suite defaults to embedded testing and explicitly skips the two real
PostgreSQL suites; run them separately for the release gate.

Tests execute the real Prisma engine services, SQL constraints and triggers,
including rollback, access denial, immutable snapshots, response revisions,
deadline/expiry, retries, DTO leakage and legacy-table nonmutation. PGlite's
single-connection test harness is not a substitute for the dedicated real
PostgreSQL concurrency suite. Final review on PostgreSQL 17.10 exposed and fixed
Prisma 7 raw-query serialization conflicts (P2010 wrapping SQLSTATE 40001); these
now use the existing bounded whole-transaction retry path. Exhausted retries
return a domain conflict rather than an uncontrolled database error.
No load/stress certification or authenticated visual runner smoke is claimed.

The A0 migration explicitly uses BEGIN/COMMIT. Failure rolls back its DDL; a
Prisma failed-migration tracking row may remain. Do not blindly retry or mark it
applied: inspect the error and rolled-back database state, correct the cause,
use `prisma migrate resolve --rolled-back` only after verification, then retry
`migrate deploy`. CREATE TYPE/TABLE/INDEX/FUNCTION/TRIGGER statements are not
individually idempotent. No concurrent-index or other nontransactional DDL is used.

## Final pre-commit review gate

The real PostgreSQL review found **pre-existing baseline migration/schema drift**:
the 19 baseline SQL migrations do not create ten Course columns/the slug unique
index described in the unchanged baseline Prisma schema, and have an existing
WorkspaceAcademicScope updatedAt default and ten differently named indexes.
The same non-A0 diff exists both before and after A0. No unrelated repair is made
here. Six additional A0 compound foreign keys are intentional SQL-only constraints,
not accidental drift; never apply a generated diff that removes them.

Until the baseline discrepancy is reviewed, the final schema-equivalence gate is
BLOCKED, even though A0 migration execution, preservation and concurrency tests
pass. See PRE_COMMIT_REVIEW.md for the model-by-model and deletion review.

## Migration-first release, only after approval

1. Review the additive migration, SQL guards, source/media policy and code.
2. Approve commit/push of the feature branch; validate the committed artifact.
3. Inspect migration status and production target without exposing credentials.
4. With separate production authorization, take the normal backup/recovery
   precautions, run `prisma migrate deploy`, then confirm `prisma migrate status`.
5. Only after migration succeeds, approve/merge/deploy the matching application.
6. Run authorized smoke with disposable data; never use real student evidence.

No production migration, data mutation, commit, push, merge or deployment is part
of this implementation handoff. Local in-memory SQL validation is not a claim that
`prisma migrate dev` ran against the configured Neon database.

## A0.5 — Private Assessment Media (not implemented)

Add assessment-owned private media copies, opaque IDs instead of public URLs,
authenticated delivery with exact recipient/attempt, window, cancellation and
revocation checks, a student-safe media DTO, independent retention from the source
archive, and preserved historical-attempt media after source deletion. Keep answer
or marking media separate. Require authorization/expiry/revocation and retention
tests. Do not reuse public archive URLs or broadly redesign existing paper media.

## Later phases (not implemented)

- Phase A: student runner/timer/autosave UI, teacher assignment integration,
  objective grading and deliberate result release.
- Phase B: subjective marking and marking evidence/history extensions.
- Phase C: no implementation or committed design in A0; requires separate scope.
- A0.5: private media as described above.

None of these sections means students can already take full online assessments.
