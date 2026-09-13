/* eslint-disable @typescript-eslint/no-require-imports */
// Opt-in exact Prisma migration matrix on an EMPTY, loopback-only PostgreSQL DB.
// Never reads the application DATABASE_URL or .env.
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { Pool } = require("pg");
const { parse: parsePgConnectionString } = require("pg-connection-string");

const root = process.cwd();
const migration = "20260913120000_add_fill_blank_and_match_question_structures";
const supplied = process.env.ASSESSMENT_B1_TEST_URL;
const mode = process.env.ASSESSMENT_B1_TEST_MODE;

function validatedLoopbackUrl(connectionString) {
  const url = new URL(connectionString);
  assert.equal(url.protocol, "postgresql:");
  // Query parameters can override pg's effective host (or Prisma's target).
  // This disposable test accepts only explicit TCP localhost/127.0.0.1 URLs.
  assert.equal(url.search, "", "Connection parameters are not allowed in the disposable test URL");
  assert.equal(url.hash, "", "URL fragments are not allowed in the disposable test URL");
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname), "An explicit loopback TCP host is required");
  assert.ok(url.port, "An explicit TCP port is required");
  const effective = parsePgConnectionString(connectionString);
  assert.equal(effective.host, url.hostname, "The effective PostgreSQL host must match the validated loopback host");
  assert.equal(effective.port, url.port, "The effective PostgreSQL port must match the validated TCP port");
  return connectionString;
}

function checkedUrl() {
  if (!supplied) return null;
  const connectionString = validatedLoopbackUrl(supplied);
  const url = new URL(connectionString);
  assert.match(url.pathname, /^\/vexa_b1_[a-z0-9_]+$/);
  assert.ok(["clean", "upgrade"].includes(mode));
  return connectionString;
}

test("B1-A migration target validation rejects effective-host overrides", () => {
  for (const host of ["127.0.0.1", "localhost"]) {
    const url = `postgresql://user:pass@${host}:5432/test_db`;
    assert.equal(validatedLoopbackUrl(url), url);
    assert.equal(parsePgConnectionString(url).host, host);
  }
  const redirected = "postgresql://user:pass@127.0.0.1:5432/test_db?host=example.com";
  assert.equal(new URL(redirected).hostname, "127.0.0.1");
  assert.equal(parsePgConnectionString(redirected).host, "example.com");
  for (const url of [
    "postgresql://user:pass@example.com:5432/test_db",
    redirected,
    "postgresql://user:pass@127.0.0.1:5432/test_db?hostaddr=example.com",
    "postgresql://user:pass@127.0.0.1:5432/test_db?service=remote",
    "postgresql:///test_db",
    "postgresql://user:pass@127.0.0.1/test_db",
    "postgresql://user:pass@127.0.0.1:5432/test_db#remote",
    "postgresql://user:pass@[::1]:5432/test_db",
  ]) assert.throws(() => validatedLoopbackUrl(url));
});

function withMigrationSubset(connectionString, count, args) {
  const source = path.join(root, "prisma/migrations");
  const names = fs.readdirSync(source).filter((name) =>
    fs.existsSync(path.join(source, name, "migration.sql"))).sort();
  assert.equal(names.length, 23);
  assert.equal(names[22], migration);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vexa-b1-prisma-"));
  try {
    for (const name of names.slice(0, count)) {
      fs.mkdirSync(path.join(directory, name));
      fs.copyFileSync(path.join(source, name, "migration.sql"), path.join(directory, name, "migration.sql"));
    }
    fs.writeFileSync(path.join(directory, "migration_lock.toml"), 'provider = "postgresql"\n');
    const config = path.join(directory, "prisma.config.ts");
    fs.writeFileSync(config, `export default ${JSON.stringify({
      schema: path.join(root, "prisma/schema.prisma"),
      migrations: { path: directory }, datasource: { url: connectionString },
    })}`);
    return execFileSync(process.execPath,
      [path.join(root, "node_modules/prisma/build/index.js"), ...args, "--config", config],
      { cwd: root, env: { ...process.env, DATABASE_URL: connectionString }, encoding: "utf8", timeout: 180_000 });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

async function count(pool) {
  return Number((await pool.query("SELECT count(*) AS n FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL")).rows[0].n);
}
async function rows(pool, table) {
  assert.ok(["bank_questions", "saved_generated_paper_questions", "assessment_questions", "assessment_responses", "assessment_attempts"].includes(table));
  const result = await pool.query(`SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY id`);
  return result.rows.map(({ row }) => row);
}
async function seedLegacy(pool) {
  await pool.query(`
    INSERT INTO users(id,role) VALUES ('b1-teacher','TEACHER'),('b1-student','STUDENT'),('b1-admin','SUPER_ADMIN');
    INSERT INTO boards(id,name,title) VALUES ('b1-board','b1-board','B1 Board');
    INSERT INTO qualifications(id,board_id,name,title) VALUES ('b1-qual','b1-board','b1-qual','Class 12');
    INSERT INTO subjects(id,qualification_id,name,slug) VALUES ('b1-subject','b1-qual','IP','b1-ip');
    INSERT INTO workspaces(id,owner_id,name,slug,status,updated_at)
      VALUES ('b1-ws','b1-teacher','B1 Workspace','b1-ws','ACTIVE',now());
    INSERT INTO classes(id,workspace_id,subject_id,qualification_id,name,academic_year,join_code)
      VALUES ('b1-class','b1-ws','b1-subject','b1-qual','Class','2026','B1TEST');
    INSERT INTO class_students(id,class_id,student_id) VALUES ('b1-member','b1-class','b1-student');
    INSERT INTO bank_questions(id,subject_id,question_type,question_text,option_a,option_b,option_c,option_d,correct_answer,updated_at)
      VALUES
      ('b1-mcq','b1-subject','MCQ','MCQ?','a','b','c','d','A',now()),
      ('b1-tf','b1-subject','TRUE_FALSE','True?',NULL,NULL,NULL,NULL,'TRUE',now()),
      ('b1-ar','b1-subject','ASSERTION_REASON','Assertion?','a','b','c','d','B',now()),
      ('b1-fill','b1-subject','FILL_BLANK','The ____ processes data.',NULL,NULL,NULL,NULL,'CPU',now());
    INSERT INTO saved_generated_papers
      (id,workspace_id,name,board_id,board_title_snapshot,qualification_id,qualification_title_snapshot,
       subject_id,subject_name_snapshot,total_marks,duration_minutes,final_order_mode,institution_name,
       exam_label,course_line,paper_title,topic_line,date_text,class_text,show_student_name,
       show_roll_number,instructions,created_by_id,updated_at)
      VALUES ('b1-paper','b1-ws','Legacy paper','b1-board','B1 Board','b1-qual','Class 12',
       'b1-subject','IP',1,30,'CHAPTER_WISE','School','Test','IP','Paper','','','',true,false,
       'Answer all.','b1-teacher',now());
    INSERT INTO saved_generated_paper_sections(id,saved_paper_id,label,question_type,question_count,marks_per_question,sort_order)
      VALUES ('b1-paper-section','b1-paper','Fill','FILL_BLANK',1,1,0);
    INSERT INTO saved_generated_paper_questions
      (id,saved_paper_id,section_id,original_bank_question_id,question_type,marks,difficulty,sort_order,
       final_question_number,question_text,correct_answer)
      VALUES ('b1-saved-fill','b1-paper','b1-paper-section','b1-fill','FILL_BLANK',1,'easy',0,1,
       'The ____ processes data.','CPU');
    INSERT INTO assessments(id,workspace_id,created_by_id,subject_id,source_saved_paper_id,title)
      VALUES ('b1-assessment','b1-ws','b1-teacher','b1-subject','b1-paper','Legacy assessment');
    INSERT INTO assessment_versions(id,assessment_id,version_number,title,header,total_marks,duration_minutes)
      VALUES ('b1-version','b1-assessment',1,'Legacy assessment','{}',2,30);
    INSERT INTO assessment_sections(id,version_id,label,sort_order)
      VALUES ('b1-section','b1-version','Objective',0);
    INSERT INTO assessment_questions(id,version_id,section_id,source_question_id,question_number,question_type,
      question_text,options,marks,difficulty,correct_answer)
      VALUES
      ('b1-a-mcq','b1-version','b1-section','b1-mcq',1,'MCQ','MCQ?','{"A":"a","B":"b","C":"c","D":"d"}',1,'easy','A'),
      ('b1-a-tf','b1-version','b1-section','b1-tf',2,'TRUE_FALSE','True?','{}',1,'easy','TRUE');
    UPDATE assessment_versions SET published_at=(clock_timestamp() AT TIME ZONE 'UTC') WHERE id='b1-version';
    INSERT INTO assessment_assignments(id,version_id,class_id,assigned_by_id,audience,assigned_at,opens_at,
      closes_at,duration_minutes,attempt_limit)
      SELECT 'b1-assignment','b1-version','b1-class','b1-teacher','CLASS',t.ts,t.ts-interval '1 minute',
        t.ts+interval '1 hour',30,1 FROM (SELECT clock_timestamp() AT TIME ZONE 'UTC' AS ts) t;
    INSERT INTO assessment_recipients(id,assignment_id,student_id) VALUES ('b1-recipient','b1-assignment','b1-student');
    INSERT INTO assessment_attempts(id,recipient_id,assignment_id,version_id,attempt_number,started_at,expires_at)
      SELECT 'b1-attempt','b1-recipient','b1-assignment','b1-version',1,t.ts,t.ts+interval '30 minutes'
      FROM (SELECT clock_timestamp() AT TIME ZONE 'UTC' AS ts) t;
    INSERT INTO assessment_responses(id,attempt_id,version_id,question_id,state,value,revision,updated_at)
      VALUES
      ('b1-response-choice','b1-attempt','b1-version','b1-a-mcq','ANSWERED','{"kind":"choice","value":"A"}',1,now()),
      ('b1-response-boolean','b1-attempt','b1-version','b1-a-tf','ANSWERED','{"kind":"boolean","value":true}',1,now());
    UPDATE assessment_attempts SET status='SUBMITTED',submitted_at=(clock_timestamp() AT TIME ZONE 'UTC') WHERE id='b1-attempt';
    UPDATE assessment_attempts SET status='GRADED',graded_at=(clock_timestamp() AT TIME ZONE 'UTC'),awarded_marks=2 WHERE id='b1-attempt';
    UPDATE assessment_attempts SET status='RELEASED',released_at=(clock_timestamp() AT TIME ZONE 'UTC') WHERE id='b1-attempt';
  `);
}

test("B1-A exact Prisma migration matrix on real disposable PostgreSQL", { skip: !checkedUrl() }, async (t) => {
  const url = checkedUrl();
  const pool = new Pool({ connectionString: url, max: 2 });
  try {
    assert.equal(Number((await pool.query("SELECT count(*) AS n FROM pg_tables WHERE schemaname='public'")).rows[0].n), 0,
      "Use a new empty disposable database");
    if (mode === "upgrade") {
      await t.test("baseline 1–22, legacy evidence, then exact #23", async () => {
        withMigrationSubset(url, 22, ["migrate", "deploy"]);
        assert.equal(await count(pool), 22);
        await seedLegacy(pool);
        const lifecycleBefore = (await pool.query(`SELECT p.oid::text AS function_oid,
          pg_get_functiondef(p.oid) AS body,t.oid::text AS trigger_oid,t.tgtype,t.tgenabled
          FROM pg_proc p JOIN pg_trigger t ON t.tgfoid=p.oid
          WHERE p.proname='assessment_attempt_guard' AND t.tgrelid='assessment_attempts'::regclass`)).rows;
        const before = {};
        for (const table of ["bank_questions", "saved_generated_paper_questions", "assessment_questions", "assessment_responses", "assessment_attempts"]) before[table] = await rows(pool, table);
        assert.match(withMigrationSubset(url, 23, ["migrate", "deploy"]), new RegExp(migration));
        assert.equal(await count(pool), 23);
        const lifecycleAfter = (await pool.query(`SELECT p.oid::text AS function_oid,
          pg_get_functiondef(p.oid) AS body,t.oid::text AS trigger_oid,t.tgtype,t.tgenabled
          FROM pg_proc p JOIN pg_trigger t ON t.tgfoid=p.oid
          WHERE p.proname='assessment_attempt_guard' AND t.tgrelid='assessment_attempts'::regclass`)).rows;
        assert.deepEqual(lifecycleAfter, lifecycleBefore, "Lifecycle trigger/function must be exactly unchanged");
        for (const table of Object.keys(before)) {
          const after = (await rows(pool, table)).map((row) => {
            if (["bank_questions", "saved_generated_paper_questions", "assessment_questions"].includes(table)) {
              assert.equal(row.structured_content, null);
              assert.equal(row.grading_data, null);
              delete row.structured_content;
              delete row.grading_data;
            }
            return row;
          });
          assert.deepEqual(after, before[table], `${table} legacy evidence changed`);
        }
      });
    } else {
      await t.test("clean migration chain 1–23", () => {
        assert.match(withMigrationSubset(url, 23, ["migrate", "deploy"]), new RegExp(migration));
      });
    }
    await t.test("status, idempotency, enum and trigger identity", async () => {
      assert.equal(await count(pool), 23);
      assert.match(withMigrationSubset(url, 23, ["migrate", "status"]), /up to date/i);
      assert.match(withMigrationSubset(url, 23, ["migrate", "deploy"]), /No pending migrations/i);
      const enums = await pool.query("SELECT enumlabel FROM pg_enum WHERE enumtypid='\"BankQuestionType\"'::regtype AND enumlabel='MATCH_THE_FOLLOWING'");
      assert.equal(enums.rowCount, 1);
      const funcs = await pool.query("SELECT proname,pg_get_functiondef(oid) AS body FROM pg_proc WHERE proname IN ('assessment_seal_version','assessment_response_guard','assessment_attempt_guard') ORDER BY proname");
      assert.equal(funcs.rowCount, 3);
      assert.match(funcs.rows.find((row) => row.proname === "assessment_response_guard").body, /MATCH_THE_FOLLOWING/);
      assert.match(funcs.rows.find((row) => row.proname === "assessment_seal_version").body, /Incomplete B1 assessment question snapshot/);
      const trigger = await pool.query("SELECT tgname,tgenabled FROM pg_trigger WHERE tgrelid='assessment_attempts'::regclass AND NOT tgisinternal");
      assert.deepEqual(trigger.rows, [{ tgname: "assessment_attempt_guard", tgenabled: "O" }]);
    });
    if (mode === "upgrade") {
      await t.test("new Fill seal and Match response guard reject malformed evidence", async () => {
        const matchContent = {
          version: 1, type: "MATCH_THE_FOLLOWING",
          leftItems: [{ id: "L1", text: "HTML" }, { id: "L2", text: "CSS" }],
          rightItems: [{ id: "R1", text: "Styling" }, { id: "R2", text: "Structure" }],
          rightDisplayOrder: ["R2", "R1"],
        };
        const matchGrade = {
          version: 1, type: "MATCH_THE_FOLLOWING", scoring: "PER_PAIR_INTEGER",
          correctPairs: [{ leftId: "L1", rightId: "R2" }, { leftId: "L2", rightId: "R1" }],
        };
        await pool.query(`INSERT INTO bank_questions(id,subject_id,question_type,question_text,structured_content,grading_data,marks,updated_at)
          VALUES ('b1-match','b1-subject','MATCH_THE_FOLLOWING','Match the terms',$1,$2,2,now())`,
        [JSON.stringify({ ...matchContent, rightDisplayOrder: undefined }), JSON.stringify(matchGrade)]);
        await pool.query(`INSERT INTO saved_generated_paper_questions
          (id,saved_paper_id,section_id,original_bank_question_id,question_type,marks,difficulty,sort_order,
           final_question_number,question_text,structured_content,grading_data)
          VALUES ('b1-saved-match','b1-paper','b1-paper-section','b1-match','MATCH_THE_FOLLOWING',2,'easy',1,2,
           'Match the terms',$1,$2)`, [JSON.stringify(matchContent), JSON.stringify(matchGrade)]);
        assert.equal((await pool.query("SELECT correct_answer FROM bank_questions WHERE id='b1-match'")).rows[0].correct_answer, null);

        await pool.query(`INSERT INTO assessment_versions(id,assessment_id,version_number,title,header,total_marks,duration_minutes)
          VALUES ('b1-match-version','b1-assessment',2,'Match version','{}',2,30);
          INSERT INTO assessment_sections(id,version_id,label,sort_order) VALUES ('b1-match-section','b1-match-version','Match',0);
          INSERT INTO assessment_questions(id,version_id,section_id,source_question_id,question_number,question_type,
            question_text,options,marks,difficulty,structured_content,grading_data)
          VALUES ('b1-match-q','b1-match-version','b1-match-section','b1-saved-match',1,
            'MATCH_THE_FOLLOWING','Match the terms','{}',2,'easy','{}','{}');`);
        await assert.rejects(pool.query("UPDATE assessment_versions SET published_at=(clock_timestamp() AT TIME ZONE 'UTC') WHERE id='b1-match-version'"),
          { code: "P0001", message: "Incomplete B1 assessment question snapshot" });
        await pool.query("UPDATE assessment_questions SET structured_content=$1,grading_data=$2 WHERE id='b1-match-q'",
          [JSON.stringify({ ...matchContent, rightDisplayOrder: [] }), JSON.stringify(matchGrade)]);
        await assert.rejects(pool.query("UPDATE assessment_versions SET published_at=(clock_timestamp() AT TIME ZONE 'UTC') WHERE id='b1-match-version'"),
          { code: "P0001", message: "Incomplete B1 assessment question snapshot" });
        await pool.query("UPDATE assessment_questions SET structured_content=$1,grading_data=$2 WHERE id='b1-match-q'",
          [JSON.stringify(matchContent), JSON.stringify(matchGrade)]);
        await pool.query("UPDATE assessment_versions SET published_at=(clock_timestamp() AT TIME ZONE 'UTC') WHERE id='b1-match-version'");

        await pool.query(`INSERT INTO assessment_versions(id,assessment_id,version_number,title,header,total_marks,duration_minutes)
          VALUES ('b1-fill-version','b1-assessment',3,'Fill version','{}',1,30);
          INSERT INTO assessment_sections(id,version_id,label,sort_order) VALUES ('b1-fill-section','b1-fill-version','Fill',0);
          INSERT INTO assessment_questions(id,version_id,section_id,source_question_id,question_number,question_type,
            question_text,options,marks,difficulty,correct_answer,structured_content)
          VALUES ('b1-fill-q','b1-fill-version','b1-fill-section','b1-saved-fill',1,
            'FILL_BLANK','The ____ processes data.','{}',1,'easy','CPU','{}');`);
        await assert.rejects(pool.query("UPDATE assessment_versions SET published_at=(clock_timestamp() AT TIME ZONE 'UTC') WHERE id='b1-fill-version'"),
          { code: "P0001", message: "Incomplete B1 assessment question snapshot" });
        await pool.query("UPDATE assessment_questions SET grading_data=$1 WHERE id='b1-fill-q'",
          [JSON.stringify({ version: 1, type: "FILL_BLANK", acceptedAnswers: [] })]);
        await assert.rejects(pool.query("UPDATE assessment_versions SET published_at=(clock_timestamp() AT TIME ZONE 'UTC') WHERE id='b1-fill-version'"),
          { code: "P0001", message: "Incomplete B1 assessment question snapshot" });
        await pool.query("UPDATE assessment_questions SET grading_data=$1 WHERE id='b1-fill-q'", [JSON.stringify({
          version: 1, type: "FILL_BLANK", acceptedAnswers: ["CPU"],
          normalization: { unicode: "NFKC", trim: true, caseInsensitive: true, collapseWhitespace: true, punctuation: "EXACT" },
        })]);
        await pool.query("UPDATE assessment_versions SET published_at=(clock_timestamp() AT TIME ZONE 'UTC') WHERE id='b1-fill-version'");

        await pool.query(`INSERT INTO assessment_assignments(id,version_id,class_id,assigned_by_id,audience,assigned_at,opens_at,
          closes_at,duration_minutes,attempt_limit)
          SELECT 'b1-match-assignment','b1-match-version','b1-class','b1-teacher','CLASS',t.ts,
            t.ts-interval '1 minute',t.ts+interval '1 hour',30,1 FROM (SELECT clock_timestamp() AT TIME ZONE 'UTC' AS ts) t;
          INSERT INTO assessment_recipients(id,assignment_id,student_id)
            VALUES ('b1-match-recipient','b1-match-assignment','b1-student');
          INSERT INTO assessment_attempts(id,recipient_id,assignment_id,version_id,attempt_number,started_at,expires_at)
            SELECT 'b1-match-attempt','b1-match-recipient','b1-match-assignment','b1-match-version',1,
              t.ts,t.ts+interval '30 minutes' FROM (SELECT clock_timestamp() AT TIME ZONE 'UTC' AS ts) t;`);
        for (const [index, response] of [
          { kind: "text", value: "L1:R2" },
          { kind: "matching", value: [{ leftId: "L9", rightId: "R1" }] },
          { kind: "matching", value: [{ leftId: "L1", rightId: "R9" }] },
          { kind: "matching", value: [{ leftId: "L1", rightId: "R1" }, { leftId: "L1", rightId: "R2" }] },
          { kind: "matching", value: [{ leftId: "L1", rightId: "R1" }], extra: true },
        ].entries()) {
          await assert.rejects(pool.query(`INSERT INTO assessment_responses
            (id,attempt_id,version_id,question_id,state,value,revision,updated_at)
            VALUES ($1,'b1-match-attempt','b1-match-version','b1-match-q','ANSWERED',$2,1,now())`,
          [`b1-invalid-${index}`, JSON.stringify(response)]), { code: "P0001", message: "Invalid matching response" });
        }
        await pool.query(`INSERT INTO assessment_responses
          (id,attempt_id,version_id,question_id,state,value,revision,updated_at)
          VALUES ('b1-valid-match','b1-match-attempt','b1-match-version','b1-match-q','ANSWERED',$1,1,now())`,
        [JSON.stringify({ kind: "matching", value: [{ leftId: "L1", rightId: "R2" }] })]);
        assert.equal((await pool.query("SELECT value->'value' AS pairs FROM assessment_responses WHERE id='b1-valid-match'")).rows[0].pairs.length, 1);
      });
    }
  } finally {
    await pool.end();
  }
});
