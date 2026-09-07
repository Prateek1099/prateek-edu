# Baseline reconciliation before Assessment A0

## Cause and boundary

Baseline: `6253899b88e00fbc5e8d640f6b487d09ecc38112`.
The original 19 migrations omit ten Course columns and slug uniqueness added to
Prisma by `30ac566a67331134e0f6dd18a48df436097ccc21`. The exact historical database
update command is unknown. A read-only metadata audit found these objects already
present in production and all 19 migration checksums matching Git. This is not
drift introduced by Assessment A0. Never rewrite those historical SQL files.

Order now:

1. Original 19 migrations, byte-for-byte unchanged.
2. `20260907120000_reconcile_baseline_schema` — guarded baseline repair.
3. `20260907130000_add_assessment_foundation` — unchanged A0 SQL, renamed from the
   uncommitted/unapplied `20260906120000_add_assessment_foundation`.

## Repair contract

The repair is an explicit BEGIN/COMMIT transaction. It briefly takes an exclusive
Course table lock so writers cannot race its catalog/empty-table checks. Production
release should allow for lock contention; this is not a claim of zero locking.

For each column, add it if absent, retain it if its type, nullability, default and
ordinary (non-generated/non-identity) definition match, otherwise fail closed:

| SQL column | Definition |
| --- | --- |
| image_url | TEXT NULL |
| instructor_name | TEXT NULL |
| is_published | BOOLEAN NOT NULL DEFAULT false |
| language | TEXT NULL DEFAULT 'English' |
| learning_outcomes | TEXT NULL |
| level | TEXT NULL |
| requirements | TEXT NULL |
| short_description | TEXT NULL |
| slug | TEXT NOT NULL, no default |
| target_audience | TEXT NULL |

Defaults are checked via PostgreSQL's parsed expression representation against
the audited constant defaults. Arbitrary expressions that happen to produce the
same value are not silently accepted. No existing Course values are rewritten.

If slug is absent and the table is empty, add it NOT NULL. If the table contains
rows, stop with an **approved slug backfill required** error. Never invent slugs,
make them nullable, publish records, deduplicate, or delete Course rows.

Preserve an existing valid, ready, immediate, nonpartial/nonexpression btree unique
index on slug with the column's collation and standard text comparison, regardless
of its name. Included columns do not change its uniqueness contract. If none
exists, reject duplicate data explicitly before creating `courses_slug_key`.
A conflicting object at that name is an error, not permission to replace it.
Partial or differently defined indexes are not equivalent and are not dropped.

## Existing default and physical index names

`WorkspaceAcademicScope.updatedAt` now declares `@default(now()) @updatedAt`.
This reflects the CURRENT_TIMESTAMP insert default already present in both
migration replay and production. No timestamp-default DDL is necessary.

Ten `map:` declarations preserve the stable physical index names created by
PostgreSQL's identifier truncation. Their columns, order, uniqueness and other
semantics remain unchanged. No index renaming, rebuilding or duplication occurs.
One header-template contract assertion is mechanically updated to expect its
explicit preserved map name; no teacher behavior or permissions change.

## Reproducible local validation

`scripts/baseline-reconciliation.test.cjs` runs only when explicitly given
`BASELINE_RECONCILIATION_TEST_URL=postgresql://...@127.0.0.1:PORT/vexa_a0_NAME`.
It never reads application DATABASE_URL or dotenv files. It creates uniquely
named disposable databases and removes only those it created. Configs/logs remain
outside Git. Run with `node --test scripts/baseline-reconciliation.test.cjs`.

The harness applies original migrations with Prisma migrate deploy (not fake
ledger inserts), then validates:

- Clean 19 → 20 → 21 replay and Prisma migrate status.
- Production-shaped schema built independently of the repair, with synthetic
  Course values; preservation of all values, IDs/timestamps, index OIDs and table
  relfilenode across repair and A0; safe repeated raw repair.
- Hostile nullable slug, wrong publication type/default, incompatible language
  default, duplicate slugs, populated slug-less table and conflicting index.
- Equivalent differently named unique constraints and non-equivalent partial
  indexes, without cosmetic rebuilds.
- Injected division-by-zero immediately before COMMIT; complete DDL/data rollback.
- Prisma Course create/edit/read, publication eligibility, slug uniqueness and
  synthetic enrollment/payment relation queries. No payment gateway is called.

Prisma's final diff must contain ONLY the six deliberate SQL-only A0 compound
foreign keys as proposed drops. These constraints are required safety additions,
not defects: NEVER execute that diff. The final database otherwise matches the
Prisma schema; A0's checks/triggers/partial unique index are separately exercised
by foundation and concurrency tests.

A0 runtime source is unchanged. Its upgrade test only changes the migration name
and prerequisite count from 19 to 20. Existing docs retain their earlier review as
a clearly labeled historical record. A0 foundation, races, populated upgrade,
complete repository tests, TypeScript, lint and build must all pass again.

## Production simulation and release boundary

Based solely on the previously audited metadata, #20 would take the table lock,
verify matching Course definitions/uniqueness, leave all existing objects and
values intact, and let Prisma record successful application. It would not rebuild
an index or modify a timestamp default. #21 then creates the new A0 objects.

Unexpected state must abort. Any actual legacy populated database without slugs
requires a separate approved data decision. Custom equivalent default expressions
or nonstandard uniqueness definitions also require review rather than automatic
normalization. A failed transaction must be inspected before any release retry;
no `migrate resolve` or `db push` is part of this implementation.

No production connection/mutation, commit, push, merge or deployment is authorized
by this implementation task. Obtain approval after the final validation report.

## Validation record — 7 September 2026

| Check | Result |
| --- | --- |
| Prisma format / validate / generate | Passed; unrelated format-only churn restored |
| Real PostgreSQL reconciliation suite | 15 passed, 0 failed (14 scenarios plus parent) |
| Clean / production-shaped normal Prisma replay | Original 19 → repair → A0 passed |
| Course preservation | All values, IDs, timestamps, index OIDs and table relfilenode unchanged |
| Hostile schemas / injected rollback | All expected rejections passed; no partial changes |
| Schema comparison | No baseline differences; only six intentional SQL-only A0 FKs beyond Prisma |
| Real PostgreSQL A0 foundation/security | 52 passed |
| Real PostgreSQL A0 races | 6 passed including parent; all five simultaneous-connection races passed |
| Real PostgreSQL A0 populated upgrade / rollback | 5 passed including parent |
| Complete repository suite | 480 passed, 0 failed; 3 opt-in real-PG entries skipped here and run separately above |
| TypeScript / targeted ESLint / whitespace checks | Passed |
| Production build | Passed with DATABASE_URL explicitly set to disposable localhost PostgreSQL |
| Local Prisma migrate status | 21 migrations applied; database schema is up to date |

The first test attempt exposed a missing optional migration-lock fixture; that
fixture is now generated outside Git. A later direct replay found the empty old
A0 directory left by file removal; it was removed before final validation. The
initial repository test failure was the exact-name header index assertion,
updated to the approved map metadata. No A0 runtime regression was found.

The build still logs existing cookie-based dynamic-render diagnostics, but exits
successfully. This is not a live browser or production health certification.

A0 migration SQL before/after SHA-256:
`373d92582ac90b8de117a84f59a12d86c4f48c8c94187ae781772c297589298d`.
The engine, rules, service, student DTO, foundation test, concurrency test, local
test adapter and test loader retain their original byte hashes. Only schema
declarations, documented migration-name/count references and documentation changed
within the pre-existing A0 files. All original 19 migration hashes also match Git.

Changed by this task (not a list of all pre-existing uncommitted A0 files):

- `prisma/schema.prisma` — one reflected default and ten physical index mappings.
- `prisma/migrations/20260907120000_reconcile_baseline_schema/migration.sql` — new.
- `prisma/migrations/20260907130000_add_assessment_foundation/migration.sql` — rename only.
- `scripts/baseline-reconciliation.test.cjs` — new isolated real-PG tests.
- `src/lib/assessments/postgres-migration.test.ts` — name/prerequisite count only.
- `src/lib/assessments/README.md` — ordering documentation.
- `src/lib/assessments/PRE_COMMIT_REVIEW.md` — historical-review banner and filename.
- `src/lib/teacher-header-template-contract.test.ts` — exact mapped-index assertion.
- `docs/BASELINE_RECONCILIATION.md` — this record.

Decision: **READY FOR COMMIT / PRODUCTION MIGRATION APPROVAL**. No such action has
been taken. Workspace remains deliberately uncommitted on the A0 feature branch.
