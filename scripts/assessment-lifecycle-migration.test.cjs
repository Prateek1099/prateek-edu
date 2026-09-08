/* eslint-disable @typescript-eslint/no-require-imports */
// Opt-in, real-PostgreSQL migration test. It never reads DATABASE_URL or .env.
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const MIGRATION = "20260908120000_enable_objective_assessment_lifecycle";
const input = process.env.ASSESSMENT_LIFECYCLE_TEST_URL;
const root = process.cwd();

function checkedUrl() {
  if (!input) return null;
  const url = new URL(input);
  assert.equal(url.protocol, "postgresql:");
  assert.equal(url.hostname, "127.0.0.1");
  assert.match(url.pathname, /^\/vexa_a0_[a-z0-9_]+$/);
  return url.href;
}

function migrationsConfig(connectionString, count) {
  const source = path.join(root, "prisma/migrations");
  const names = fs
    .readdirSync(source)
    .filter((name) => fs.existsSync(path.join(source, name, "migration.sql")))
    .sort();
  assert.equal(names.length, 22);
  assert.equal(names[21], MIGRATION);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), `vexa-lifecycle-${count}-`));
  for (const name of names.slice(0, count)) {
    fs.mkdirSync(path.join(directory, name));
    fs.copyFileSync(
      path.join(source, name, "migration.sql"),
      path.join(directory, name, "migration.sql"),
    );
  }
  fs.writeFileSync(path.join(directory, "migration_lock.toml"), 'provider = "postgresql"\n');
  const config = path.join(directory, "prisma.config.ts");
  fs.writeFileSync(
    config,
    `export default ${JSON.stringify({
      schema: path.join(root, "prisma/schema.prisma"),
      migrations: { path: directory },
      datasource: { url: connectionString },
    })}`,
  );
  return { config, directory };
}

function prisma(connectionString, count, args) {
  const { config, directory } = migrationsConfig(connectionString, count);
  try {
    return execFileSync(
      process.execPath,
      [path.join(root, "node_modules/prisma/build/index.js"), ...args, "--config", config],
      {
        cwd: root,
        env: { ...process.env, DATABASE_URL: connectionString },
        encoding: "utf8",
        timeout: 180_000,
      },
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

class LifecycleConflict extends Error {
  constructor(message) {
    super(message);
    this.name = "LifecycleConflict";
  }
}

async function idempotentTransition(pool, attemptId, target, trace = { reads: [], retries: 0 }) {
  for (let retry = 0; retry < 4; retry += 1) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
      const current = (
        await client.query(
          "SELECT status FROM assessment_attempts WHERE id = $1 FOR UPDATE",
          [attemptId],
        )
      ).rows[0]?.status;
      trace.reads.push(current);
      if (!current) throw new LifecycleConflict("Attempt not found");

      if (
        current === target ||
        (target === "SUBMITTED" && ["GRADED", "RELEASED"].includes(current)) ||
        (target === "GRADED" && current === "RELEASED")
      ) {
        await client.query("COMMIT");
        return current;
      }

      if (target === "SUBMITTED" && current === "IN_PROGRESS") {
        await client.query(
          "UPDATE assessment_attempts SET status = 'SUBMITTED', submitted_at = (clock_timestamp() AT TIME ZONE 'UTC') WHERE id = $1",
          [attemptId],
        );
      } else if (target === "GRADED" && current === "SUBMITTED") {
        await client.query(
          "UPDATE assessment_attempts SET status = 'GRADED', graded_at = (clock_timestamp() AT TIME ZONE 'UTC'), awarded_marks = 3 WHERE id = $1",
          [attemptId],
        );
      } else if (target === "RELEASED" && current === "GRADED") {
        await client.query(
          "UPDATE assessment_attempts SET status = 'RELEASED', released_at = (clock_timestamp() AT TIME ZONE 'UTC') WHERE id = $1",
          [attemptId],
        );
      } else {
        throw new LifecycleConflict(`Cannot move ${current} to ${target}`);
      }
      await client.query("COMMIT");
      return target;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      if (["40001", "40P01"].includes(error.code)) {
        trace.retries += 1;
        if (retry < 3) continue;
        throw new LifecycleConflict("Lifecycle update remained concurrent");
      }
      // Unexpected SQL failures must fail the test, not masquerade as conflicts.
      throw error;
    } finally {
      client.release();
    }
  }
  throw new LifecycleConflict("Lifecycle update remained concurrent");
}

test(
  "objective assessment lifecycle migration on exact 21-migration baseline",
  { skip: !checkedUrl() },
  async (t) => {
    const connectionString = checkedUrl();
    const pool = new Pool({ connectionString, max: 8 });
    const db = new PrismaClient({ adapter: new PrismaPg(pool) });
    try {
      assert.equal(
        (
          await pool.query(
            "SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public'",
          )
        ).rows[0].n,
        0,
        "Use a new empty disposable database",
      );

      prisma(connectionString, 21, ["migrate", "deploy"]);
      assert.equal(
        (
          await pool.query(
            "SELECT count(*)::int AS n FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL",
          )
        ).rows[0].n,
        21,
      );
      const checkBefore = (
        await pool.query(
          "SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid = 'assessment_attempts'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%graded_at%'",
        )
      ).rows[0].definition;
      const triggerQuery = "SELECT oid::text, tgfoid::text, tgtype, tgenabled, pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgrelid = 'assessment_attempts'::regclass AND NOT tgisinternal";
      const triggerBefore = (await pool.query(triggerQuery)).rows;
      assert.equal(triggerBefore.length, 1);

      await t.test("migration applies normally and changes only the trigger function", () => {
        const output = prisma(connectionString, 22, ["migrate", "deploy"]);
        assert.match(output, new RegExp(MIGRATION));
      });
      assert.equal(
        (
          await pool.query(
            "SELECT count(*)::int AS n FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL",
          )
        ).rows[0].n,
        22,
      );
      const checkAfter = (
        await pool.query(
          "SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid = 'assessment_attempts'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%graded_at%'",
        )
      ).rows[0].definition;
      assert.equal(checkAfter, checkBefore, "The existing attempt-state check must remain byte-identical");
      assert.deepEqual((await pool.query(triggerQuery)).rows, triggerBefore, "Trigger OID, function OID, timing, events and enabled state must not change");
      assert.match(prisma(connectionString, 22, ["migrate", "status"]), /up to date/i);

      await db.user.createMany({
        data: [
          { id: "teacher", role: "TEACHER" },
          { id: "student", role: "STUDENT" },
          { id: "admin", role: "SUPER_ADMIN" },
        ],
      });
      await db.workspace.create({
        data: { id: "ws", ownerId: "teacher", name: "Lifecycle", slug: "lifecycle", status: "ACTIVE" },
      });
      await db.board.create({ data: { id: "board", name: "test", title: "Test" } });
      await db.qualification.create({
        data: { id: "qualification", boardId: "board", name: "test", title: "Class 12" },
      });
      await db.subject.create({
        data: { id: "subject", qualificationId: "qualification", name: "IP", slug: "ip" },
      });
      await db.workspaceAcademicScope.create({
        data: { workspaceId: "ws", subjectId: "subject", assignedById: "admin" },
      });
      await db.class.create({
        data: {
          id: "class",
          workspaceId: "ws",
          subjectId: "subject",
          qualificationId: "qualification",
          name: "Class",
          academicYear: "2026",
          joinCode: "LIFE01",
        },
      });
      await db.classStudent.create({ data: { classId: "class", studentId: "student" } });
      await db.assessment.create({
        data: {
          id: "assessment",
          workspaceId: "ws",
          createdById: "teacher",
          subjectId: "subject",
          sourceSavedPaperId: "synthetic-paper",
          title: "Lifecycle assessment",
        },
      });
      await db.assessmentVersion.create({
        data: {
          id: "version",
          assessmentId: "assessment",
          versionNumber: 1,
          title: "Lifecycle assessment",
          header: {},
          totalMarks: 5,
          durationMinutes: 30,
        },
      });
      await db.assessmentSection.create({
        data: { id: "section", versionId: "version", label: "Section A", sortOrder: 0 },
      });
      await db.assessmentQuestion.create({
        data: {
          id: "question",
          versionId: "version",
          sectionId: "section",
          sourceQuestionId: "source-question",
          questionNumber: 1,
          questionType: "MCQ",
          questionText: "Question",
          options: { A: "a", B: "b", C: "c", D: "d" },
          marks: 5,
          difficulty: "easy",
          correctAnswer: "A",
        },
      });
      await db.assessmentVersion.update({
        where: { id: "version" },
        data: { publishedAt: new Date() },
      });

      let sequence = 0;
      async function freshAttempt(ageHours = 0, versionId = "version") {
        sequence += 1;
        const assignedAt = (await pool.query("SELECT date_trunc('milliseconds', clock_timestamp()) - $1 * interval '1 hour' AS clock", [ageHours])).rows[0].clock;
        const opensAt = new Date(assignedAt.getTime() - 60_000);
        const closesAt = new Date(assignedAt.getTime() + 3_600_000);
        const assignmentId = `assignment-${sequence}`;
        const recipientId = `recipient-${sequence}`;
        const attemptId = `attempt-${sequence}`;
        await db.assessmentAssignment.create({
          data: {
            id: assignmentId,
            versionId,
            classId: "class",
            assignedById: "teacher",
            audience: "SELECTED_STUDENTS",
            assignedAt,
            opensAt,
            closesAt,
            durationMinutes: 30,
            attemptLimit: 1,
          },
        });
        await db.assessmentRecipient.create({
          data: { id: recipientId, assignmentId, studentId: "student", assignedAt },
        });
        const startedAt = assignedAt;
        await db.assessmentAttempt.create({
          data: {
            id: attemptId,
            recipientId,
            assignmentId,
            versionId,
            attemptNumber: 1,
            startedAt,
            expiresAt: new Date(startedAt.getTime() + 30 * 60_000),
          },
        });
        return attemptId;
      }

      async function submit(id) {
        return pool.query(
          "UPDATE assessment_attempts SET status = 'SUBMITTED', submitted_at = (clock_timestamp() AT TIME ZONE 'UTC') WHERE id = $1",
          [id],
        );
      }
      async function grade(id, fields = "graded_at = (clock_timestamp() AT TIME ZONE 'UTC'), awarded_marks = 3") {
        return pool.query(
          `UPDATE assessment_attempts SET status = 'GRADED', ${fields} WHERE id = $1`,
          [id],
        );
      }
      async function release(id, fields = "released_at = (clock_timestamp() AT TIME ZONE 'UTC')") {
        return pool.query(
          `UPDATE assessment_attempts SET status = 'RELEASED', ${fields} WHERE id = $1`,
          [id],
        );
      }
      async function status(id) {
        return (await db.assessmentAttempt.findUniqueOrThrow({ where: { id } })).status;
      }

      await t.test("approved forward lifecycle succeeds", async () => {
        const id = await freshAttempt();
        await submit(id);
        assert.equal(await status(id), "SUBMITTED");
        await grade(id);
        assert.equal(await status(id), "GRADED");
        await release(id);
        assert.equal(await status(id), "RELEASED");
      });

      await t.test("the existing A0 submit update remains valid without grading fields", async () => {
        const id = await freshAttempt();
        await submit(id);
        const row = await db.assessmentAttempt.findUniqueOrThrow({ where: { id } });
        assert.equal(row.status, "SUBMITTED");
        assert.ok(row.submittedAt);
        assert.equal(row.gradedAt, null);
        assert.equal(row.releasedAt, null);
        assert.equal(row.awardedMarks, null);
      });

      const snapshot = async (id) => (await pool.query(
        "SELECT to_jsonb(a) AS row FROM assessment_attempts a WHERE id=$1", [id],
      )).rows[0].row;
      async function rejected(id, operation, message) {
        const before = await snapshot(id);
        await assert.rejects(operation(), { code: "P0001", message });
        assert.deepEqual(await snapshot(id), before, "Rejected mutation must preserve all evidence");
      }
      const errors = {
        submit: "Invalid assessment submission transition",
        grade: "Invalid objective grading transition",
        release: "Invalid assessment release transition",
        identity: "Attempt identity and timing are immutable",
        transition: "Unsupported assessment attempt transition",
      };
      // Complete destination evidence prevents unrelated CHECK failures from
      // masquerading as lifecycle rejection.
      const destination = {
        IN_PROGRESS: "submitted_at=NULL, graded_at=NULL, awarded_marks=NULL, released_at=NULL",
        SUBMITTED: "submitted_at=started_at, graded_at=NULL, awarded_marks=NULL, released_at=NULL",
        NEEDS_REVIEW: "submitted_at=started_at, graded_at=NULL, awarded_marks=NULL, released_at=NULL",
        GRADED: "submitted_at=started_at, graded_at=started_at, awarded_marks=3, released_at=NULL",
        RELEASED: "submitted_at=started_at, graded_at=started_at, awarded_marks=3, released_at=started_at",
      };
      async function advance(id, target) {
        if (target !== "IN_PROGRESS") await submit(id);
        if (["GRADED", "RELEASED"].includes(target)) await grade(id);
        if (target === "RELEASED") await release(id);
      }
      const allowed = { IN_PROGRESS: "SUBMITTED", SUBMITTED: "GRADED", GRADED: "RELEASED" };
      for (const from of ["IN_PROGRESS", "SUBMITTED", "GRADED", "RELEASED"]) {
        for (const to of Object.keys(destination)) {
          if (allowed[from] === to) continue;
          await t.test(from + " to " + to + " rejected by lifecycle guard", async () => {
            const id = await freshAttempt();
            await advance(id, from);
            const fields = from === to ? "" : ", " + destination[to];
            await rejected(id, () => pool.query(
              "UPDATE assessment_attempts SET status='" + to + "'" + fields + " WHERE id=$1", [id],
            ), errors.transition);
          });
        }
      }
      for (const [label, value] of [
        ["missing timestamp", "NULL"],
        ["before start", "started_at - interval '1 second'"],
        ["future timestamp", "(clock_timestamp() AT TIME ZONE 'UTC') + interval '100 years'"],
        ["infinity", "'infinity'::timestamp"],
        ["negative infinity", "'-infinity'::timestamp"],
      ]) {
        await t.test("submission rejects " + label, async () => {
          const id = await freshAttempt();
          await rejected(id, () => pool.query(
            "UPDATE assessment_attempts SET status='SUBMITTED', submitted_at=" + value + " WHERE id=$1", [id],
          ), errors.submit);
        });
      }
      for (const stage of ["grade", "release"]) {
        const field = stage === "grade" ? "graded_at" : "released_at";
        const prior = stage === "grade" ? "submitted_at" : "graded_at";
        for (const [label, value] of [
          ["missing timestamp", "NULL"],
          ["backward timestamp", prior + " - interval '1 second'"],
          ["future timestamp", "(clock_timestamp() AT TIME ZONE 'UTC') + interval '100 years'"],
          ["infinity", "'infinity'::timestamp"],
          ["negative infinity", "'-infinity'::timestamp"],
        ]) {
          await t.test(stage + " rejects " + label, async () => {
            const id = await freshAttempt();
            await advance(id, stage === "grade" ? "SUBMITTED" : "GRADED");
            await rejected(id, () => stage === "grade"
              ? grade(id, field + "=" + value + ", awarded_marks=3")
              : release(id, field + "=" + value), errors[stage]);
          });
        }
      }
      await t.test("equal lifecycle timestamps are valid", async () => {
        const id = await freshAttempt();
        await pool.query("UPDATE assessment_attempts SET status='SUBMITTED', submitted_at=started_at WHERE id=$1", [id]);
        await grade(id, "graded_at=submitted_at, awarded_marks=3");
        await release(id, "released_at=graded_at");
        const row = await snapshot(id);
        assert.equal(row.started_at, row.submitted_at);
        assert.equal(row.submitted_at, row.graded_at);
        assert.equal(row.graded_at, row.released_at);
      });
      await t.test("expired frozen evidence can submit, grade and release with valid past timestamps", async () => {
        const id = await freshAttempt(72);
        await pool.query("UPDATE assessment_attempts SET status='SUBMITTED', submitted_at=started_at+interval '2 hours' WHERE id=$1", [id]);
        await grade(id, "graded_at=submitted_at+interval '1 day', awarded_marks=3");
        await release(id, "released_at=graded_at+interval '1 day'");
        const row = await snapshot(id);
        assert.ok(row.submitted_at > row.expires_at);
        assert.equal(row.status, "RELEASED");
      });
      await t.test("clock uses operation time rather than transaction start", async () => {
        const id = await freshAttempt();
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          await client.query("SELECT pg_sleep(0.025)");
          await client.query("UPDATE assessment_attempts SET status='SUBMITTED', submitted_at=clock_timestamp() AT TIME ZONE 'UTC' WHERE id=$1", [id]);
          const row = (await client.query("SELECT submitted_at > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AS after_start FROM assessment_attempts WHERE id=$1", [id])).rows[0];
          assert.equal(row.after_start, true);
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally { client.release(); }
      });
      // Synthetic corruption ONLY in the verified empty loopback test database.
      // This is not migration SQL or production repair. Re-enable the named guard
      // in the same fixture transaction before testing any behavior.
      async function malformedFixture(id, fields) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          await client.query("ALTER TABLE assessment_attempts DISABLE TRIGGER assessment_attempt_guard");
          await client.query("UPDATE assessment_attempts SET " + fields + " WHERE id=$1", [id]);
          await client.query("ALTER TABLE assessment_attempts ENABLE TRIGGER assessment_attempt_guard");
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally { client.release(); }
        assert.deepEqual((await pool.query(triggerQuery)).rows, triggerBefore);
      }
      const histories = [
        ["start is negative infinity", "started_at='-infinity'::timestamp"],
        ["submission before start", "submitted_at=started_at-interval '1 second'"],
        ["submission is infinity", "submitted_at='infinity'::timestamp"],
        ["submission is negative infinity", "submitted_at='-infinity'::timestamp"],
      ];
      for (const stage of ["grade", "release"]) {
        for (const [label, fields] of histories) {
          await t.test(stage + " rejects inherited history: " + label, async () => {
            const id = await freshAttempt();
            await advance(id, stage === "grade" ? "SUBMITTED" : "GRADED");
            await malformedFixture(id, fields);
            await rejected(id, () => stage === "grade" ? grade(id) : release(id), errors[stage]);
          });
        }
      }
      for (const value of ["submitted_at-interval '1 second'", "'infinity'::timestamp", "'-infinity'::timestamp"]) {
        await t.test("release rejects inherited graded_at=" + value, async () => {
          const id = await freshAttempt();
          await advance(id, "GRADED");
          await malformedFixture(id, "graded_at=" + value);
          await rejected(id, () => release(id), errors.release);
        });
      }
      await t.test("submission rejects inherited non-finite start", async () => {
        const id = await freshAttempt();
        await malformedFixture(id, "started_at='-infinity'::timestamp");
        await rejected(id, () => submit(id), errors.submit);
      });
      for (const marks of ["NULL", "-1", "5.01", "'NaN'::numeric"]) {
        await t.test("grading rejects awarded_marks=" + marks, async () => {
          const id = await freshAttempt();
          await submit(id);
          await rejected(id, () => grade(id, "graded_at=submitted_at, awarded_marks=" + marks), errors.grade);
        });
      }
      for (const marks of [0, 2.5, 5]) {
        await t.test("grading accepts exact numeric marks " + marks, async () => {
          const id = await freshAttempt();
          await submit(id);
          await grade(id, "graded_at=submitted_at, awarded_marks=" + marks);
          assert.equal(Number((await snapshot(id)).awarded_marks), marks);
        });
      }
      await t.test("submission evidence is immutable during legal grading", async () => {
        const id = await freshAttempt(2);
        await submit(id);
        await rejected(id, () => grade(id, "submitted_at=submitted_at-interval '1 second', graded_at=clock_timestamp() AT TIME ZONE 'UTC', awarded_marks=3"), errors.grade);
      });
      for (const fields of [
        "submitted_at=submitted_at-interval '1 second'",
        "graded_at=graded_at-interval '1 second'",
        "awarded_marks=4",
      ]) {
        await t.test("release cannot change established evidence: " + fields, async () => {
          const id = await freshAttempt(2);
          await advance(id, "GRADED");
          await rejected(id, () => release(id, "released_at=clock_timestamp() AT TIME ZONE 'UTC', " + fields), errors.release);
        });
      }
      // Alternate references exist. Mutate exactly one identity field per case
      // and require this guard's P0001 message, never accepting an FK/CHECK error.
      const version = await db.assessmentVersion.findUniqueOrThrow({ where: { id: "version" } });
      await db.assessmentVersion.create({ data: { ...version, id: "version-other", versionNumber: 2, publishedAt: null } });
      await db.assessmentSection.create({ data: { id: "section-other", versionId: "version-other", label: "Section A", sortOrder: 0 } });
      const question = await db.assessmentQuestion.findUniqueOrThrow({ where: { id: "question" } });
      await db.assessmentQuestion.create({ data: { ...question, id: "question-other", versionId: "version-other", sectionId: "section-other" } });
      await db.assessmentVersion.update({ where: { id: "version-other" }, data: { publishedAt: new Date() } });
      for (const field of ["id", "recipient_id", "assignment_id", "version_id", "attempt_number", "started_at", "expires_at"]) {
        await t.test("immutable " + field + " rejected DURING valid submission", async () => {
          const id = await freshAttempt(2);
          const alternate = await snapshot(await freshAttempt(2, field === "version_id" ? "version-other" : "version"));
          const fields = {
            id: "id=id||'-new'",
            recipient_id: "recipient_id='" + alternate.recipient_id + "'",
            assignment_id: "assignment_id='" + alternate.assignment_id + "'",
            version_id: "version_id='version-other'",
            attempt_number: "attempt_number=2",
            started_at: "started_at=started_at+interval '1 second'",
            expires_at: "expires_at=expires_at+interval '1 second'",
          };
          await rejected(id, () => pool.query(
            "UPDATE assessment_attempts SET status='SUBMITTED', submitted_at=clock_timestamp() AT TIME ZONE 'UTC', " + fields[field] + " WHERE id=$1", [id],
          ), errors.identity);
        });
      }
      async function contended(id, leftTarget, rightTarget) {
        const a = new Pool({ connectionString, max: 1 });
        const b = new Pool({ connectionString, max: 1 });
        const control = await pool.connect();
        const traces = [{ reads: [], retries: 0 }, { reads: [], retries: 0 }];
        let pending;
        try {
          const pids = await Promise.all([a, b].map(async p => (await p.query("SELECT pg_backend_pid() AS pid")).rows[0].pid));
          assert.equal(new Set(pids).size, 2);
          await control.query("BEGIN");
          await control.query("SELECT id FROM assessment_attempts WHERE id=$1 FOR UPDATE", [id]);
          pending = Promise.allSettled([
            idempotentTransition(a, id, leftTarget, traces[0]),
            idempotentTransition(b, id, rightTarget, traces[1]),
          ]);
          let waiting = 0;
          try {
            for (let n = 0; n < 150; n += 1) {
              waiting = (await control.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE pid=ANY($1::int[]) AND wait_event_type='Lock'", [pids])).rows[0].n;
              if (waiting === 2) break;
              await new Promise(resolve => setTimeout(resolve, 20));
            }
            assert.equal(waiting, 2, "Both independent connections must actually contend");
          } finally { await control.query("COMMIT"); }
          return { results: await pending, traces };
        } finally {
          await control.query("ROLLBACK").catch(() => undefined);
          if (pending) await pending;
          control.release();
          await Promise.all([a.end(), b.end()]);
        }
      }
      for (const target of ["SUBMITTED", "GRADED", "RELEASED"]) {
        await t.test("forced contention: duplicate " + target + " retries and rereads final evidence", async () => {
          const id = await freshAttempt();
          await advance(id, target === "SUBMITTED" ? "IN_PROGRESS" : target === "GRADED" ? "SUBMITTED" : "GRADED");
          const { results, traces } = await contended(id, target, target);
          assert.ok(results.every(r => r.status === "fulfilled"), JSON.stringify(results));
          assert.ok(results.every(r => r.value === target));
          assert.ok(traces.some(trace => trace.retries > 0 && trace.reads.includes(target)), JSON.stringify(traces));
          assert.equal(await status(id), target);
          const before = await snapshot(id);
          assert.equal(await idempotentTransition(pool, id, target), target);
          assert.deepEqual(await snapshot(id), before);
          if (target === "SUBMITTED") {
            await idempotentTransition(pool, id, "GRADED");
            assert.equal((await snapshot(id)).submitted_at, before.submitted_at);
          }
        });
      }
      await t.test("forced contention: grade versus release preserves one consistent history", async () => {
        const id = await freshAttempt();
        await submit(id);
        const before = await snapshot(id);
        const { results } = await contended(id, "GRADED", "RELEASED");
        assert.equal(results[0].status, "fulfilled");
        if (results[1].status === "rejected") assert.ok(results[1].reason instanceof LifecycleConflict);
        let row = await snapshot(id);
        assert.ok(["GRADED", "RELEASED"].includes(row.status));
        assert.equal(row.submitted_at, before.submitted_at);
        assert.equal(Number(row.awarded_marks), 3);
        await idempotentTransition(pool, id, "RELEASED");
        row = await snapshot(id);
        assert.equal(row.status, "RELEASED");
        assert.ok(row.started_at <= row.submitted_at && row.submitted_at <= row.graded_at && row.graded_at <= row.released_at);
      });
    } finally {
      await db.$disconnect();
      await pool.end();
    }
  },
);
