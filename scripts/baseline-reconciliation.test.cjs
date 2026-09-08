/* eslint-disable @typescript-eslint/no-require-imports */
// Opt-in real PostgreSQL only. Never reads DATABASE_URL or application .env files.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const REPAIR = '20260907120000_reconcile_baseline_schema';
const A0 = '20260907130000_add_assessment_foundation';
const OBJECTIVE_LIFECYCLE = '20260908120000_enable_objective_assessment_lifecycle';
const input = process.env.BASELINE_RECONCILIATION_TEST_URL;
const root = process.cwd();
const migrations = path.join(root, 'prisma/migrations');
const cli = path.join(root, 'node_modules/prisma/build/index.js');
const sql = fs.readFileSync(path.join(migrations, REPAIR, 'migration.sql'), 'utf8');
// Independent fixture of the audited production Course shape, not generated
// from the repair under test. Contains only synthetic records.
const productionColumns = `ALTER TABLE public.courses
 ADD COLUMN image_url TEXT, ADD COLUMN instructor_name TEXT,
 ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN language TEXT DEFAULT 'English', ADD COLUMN learning_outcomes TEXT,
 ADD COLUMN level TEXT, ADD COLUMN requirements TEXT, ADD COLUMN short_description TEXT,
 ADD COLUMN slug TEXT NOT NULL, ADD COLUMN target_audience TEXT;`;
const scopeFixture = `INSERT INTO boards(id,name,title) VALUES ('qa-board','QA','QA');
 INSERT INTO qualifications(id,board_id,name,title) VALUES ('qa-class','qa-board','qa','QA');
 INSERT INTO subjects(id,qualification_id,name,slug) VALUES ('qa-subject','qa-class','QA','qa');`;

test('baseline reconciliation: clean replay, production shape and hostile drift', { skip: !input }, async t => {
  const url = new URL(input);
  assert.equal(url.protocol, 'postgresql:');
  assert.equal(url.hostname, '127.0.0.1');
  assert.match(url.pathname, /^\/vexa_a0_[a-z0-9_]+$/);
  const admin = new Pool({ connectionString: input, max: 1 });
  const prefix = `vexa_a0_reconcile_${process.pid}`;
  const created = [];
  const configs = fs.mkdtempSync(path.join(os.tmpdir(), 'vexa-reconcile-tests-'));
  const names = fs.readdirSync(migrations).filter(n => fs.existsSync(path.join(migrations, n, 'migration.sql'))).sort();
  assert.equal(names.length, 22);
  assert.equal(names[19], REPAIR);
  assert.equal(names[20], A0);
  assert.equal(names[21], OBJECTIVE_LIFECYCLE);

  function config(database, count) {
    const target = new URL(input); target.pathname = '/' + database;
    const dir = path.join(configs, database + '-' + count);
    fs.mkdirSync(dir, { recursive: true });
    for (const name of names.slice(0, count)) {
      fs.mkdirSync(path.join(dir, name), { recursive: true });
      fs.copyFileSync(path.join(migrations, name, 'migration.sql'), path.join(dir, name, 'migration.sql'));
    }
    // The historical repository has no lock file; declare the same provider in
    // this disposable migration fixture without introducing a repository file.
    fs.writeFileSync(path.join(dir, 'migration_lock.toml'), 'provider = "postgresql"\n');
    const file = path.join(configs, database + '-' + count + '.ts');
    fs.writeFileSync(file, 'export default ' + JSON.stringify({ schema: path.join(root, 'prisma/schema.prisma'), migrations: { path: dir }, datasource: { url: target.href } }));
    return { file, target: target.href };
  }
  function prisma(database, count, args) {
    const c = config(database, count);
    const output = execFileSync(process.execPath, [cli, ...args, '--config', c.file], {
      cwd: root, env: { ...process.env, DATABASE_URL: c.target }, encoding: 'utf8', timeout: 120000,
    });
    return output;
  }
  async function database(label, template) {
    const name = prefix + '_' + label;
    assert.match(name, /^vexa_a0_[a-z0-9_]+$/);
    await admin.query(`CREATE DATABASE "${name}"${template ? ` TEMPLATE "${template}"` : ''}`);
    created.push(name);
    const target = new URL(input); target.pathname = '/' + name;
    return { name, pool: new Pool({ connectionString: target.href, max: 1 }) };
  }
  async function snapshot(pool) {
    return {
      rows: (await pool.query('SELECT to_jsonb(c)::text AS row FROM public.courses c ORDER BY id')).rows,
      columns: (await pool.query("SELECT attname,atttypid,atttypmod,attnotnull,attidentity,attgenerated,pg_get_expr(d.adbin,d.adrelid) AS def FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid='public.courses'::regclass AND a.attnum>0 AND NOT a.attisdropped ORDER BY attnum")).rows,
      indexes: (await pool.query("SELECT i.indexrelid,i.indisvalid,i.indisready,pg_get_indexdef(i.indexrelid) AS def FROM pg_index i WHERE i.indrelid='public.courses'::regclass ORDER BY i.indexrelid")).rows,
      storage: (await pool.query("SELECT oid,relfilenode FROM pg_class WHERE oid='public.courses'::regclass")).rows,
    };
  }
  async function rejected(pool, query, message) {
    const before = await snapshot(pool);
    await assert.rejects(pool.query(query), message);
    await pool.query('ROLLBACK');
    assert.deepEqual(await snapshot(pool), before, 'Failure must preserve all columns, indexes, physical storage and rows');
  }
  async function scenario(name, fn) {
    const d = await database(name, prefix + '_baseline');
    try { await fn(d.pool, d.name); } finally { await d.pool.end(); }
  }
  try {
    const base = await database('baseline');
    await base.pool.end();
    prisma(base.name, 19, ['migrate', 'deploy']);
    await t.test('original 19 SQL files remain byte-identical to audited Git baseline', () => {
      for (const name of names.slice(0, 19)) {
        const original = execFileSync('git', ['show', `6253899b88e00fbc5e8d640f6b487d09ecc38112:prisma/migrations/${name}/migration.sql`]);
        assert.equal(createHash('sha256').update(fs.readFileSync(path.join(migrations, name, 'migration.sql'))).digest('hex'), createHash('sha256').update(original).digest('hex'));
      }
    });
    await t.test('clean replay: 22 normal Prisma migrations and semantic schema equivalence', () => scenario('clean', async (pool, name) => {
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name='courses' AND column_name='slug'")).rows[0].n, 0);
      prisma(name, 22, ['migrate', 'deploy']);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')).rows[0].n, 22);
      assert.equal((await pool.query("SELECT column_default FROM information_schema.columns WHERE table_name='workspace_academic_scopes' AND column_name='updated_at'")).rows[0].column_default, 'CURRENT_TIMESTAMP');
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'assessment%'")).rows[0].n, 9);
      const diff = prisma(name, 22, ['migrate', 'diff', '--from-config-datasource', '--to-schema', path.join(root, 'prisma/schema.prisma'), '--script']);
      // Prisma cannot represent these deliberate SQL-only cross-identity FKs.
      // Nothing else (column/default/index/ordinary FK) may differ.
      const allowed = [
        'assessment_question_section_version_fk',
        'assessment_attempt_recipient_assignment_fk',
        'assessment_attempt_assignment_version_fk',
        'assessment_response_attempt_version_fk',
        'assessment_response_question_version_fk',
        'assessment_event_attempt_assignment_fk',
      ];
      const statements = diff.split('\n').filter(l => l.trim() && !l.startsWith('--'));
      assert.equal(statements.length, 6, diff);
      for (const constraint of allowed) assert.ok(statements.some(s => s.endsWith(`DROP CONSTRAINT "${constraint}";`)), diff);
      for (const statement of statements) assert.match(statement, /^ALTER TABLE "assessment_[a-z_]+" DROP CONSTRAINT "assessment_[a-z_]+";$/);
      fs.writeFileSync(path.join(configs, 'final-semantic-diff.sql'), diff);
      assert.match(prisma(name, 22, ['migrate', 'status']), /up to date/i);
    }));
    await t.test('production-shaped normal migration preserves every Course value, index OID and table relfilenode; A0 follows', () => scenario('production', async (pool, name) => {
      await pool.query(productionColumns + 'CREATE UNIQUE INDEX courses_slug_key ON public.courses(slug);' + scopeFixture);
      await pool.query(`INSERT INTO courses(id,title,slug,description,short_description,image_url,price,is_published,level,language,instructor_name,learning_outcomes,requirements,target_audience,subject_id,created_at)
        VALUES ('qa-course','Synthetic course','existing-public-url','Description','Summary','https://example.invalid/image.png',19.5,true,'Advanced','Hindi','QA Instructor','Outcomes','Requirements','Teachers','qa-subject','2026-01-02 03:04:05.123');`);
      const before = await snapshot(pool);
      prisma(name, 20, ['migrate', 'deploy']);
      assert.deepEqual(await snapshot(pool), before);
      await pool.query(sql); // Guarded reconciliation is also safe to repeat.
      assert.deepEqual(await snapshot(pool), before);
      prisma(name, 22, ['migrate', 'deploy']);
      assert.deepEqual(await snapshot(pool), before);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM _prisma_migrations WHERE finished_at IS NOT NULL')).rows[0].n, 22);
    }));
    await t.test('nullable slug fails closed', () => scenario('nullable', async pool => {
      await pool.query('ALTER TABLE courses ADD COLUMN slug TEXT');
      await rejected(pool, sql, /unexpected definition for courses.slug/);
    }));
    await t.test('Course Prisma reads/writes, published eligibility, enrollment and payment relations work after repair', () => scenario('courseorm', async pool => {
      await pool.query(sql + scopeFixture);
      const db = new PrismaClient({ adapter: new PrismaPg(pool) });
      try {
        const draft = await db.course.create({ data: { id: 'qa-draft', title: 'Draft', slug: 'qa-draft', subjectId: 'qa-subject' } });
        assert.equal(draft.isPublished, false); assert.equal(draft.language, 'English');
        assert.equal(await db.course.findFirst({ where: { id: draft.id, isPublished: true } }), null);
        const fields = { imageUrl: 'https://example.invalid/qa.png', instructorName: 'QA', isPublished: true, language: 'Hindi', learningOutcomes: 'Outcomes', level: 'Advanced', requirements: 'Requirements', shortDescription: 'Summary', slug: 'qa-published', targetAudience: 'Teachers' };
        await db.course.update({ where: { id: draft.id }, data: { ...fields, price: 20 } });
        const course = await db.course.findUniqueOrThrow({ where: { slug: fields.slug }, include: { subject: true } });
        for (const [key, value] of Object.entries(fields)) assert.equal(course[key], value);
        assert.equal(course.subject.id, 'qa-subject');
        assert.equal((await db.course.findMany({ where: { isPublished: true } })).length, 1);
        assert.deepEqual(await db.course.findFirst({ where: { id: course.id, isPublished: true }, select: { id: true, price: true } }), { id: course.id, price: 20 });
        await db.user.create({ data: { id: 'qa-student', role: 'STUDENT' } });
        await db.enrollment.create({ data: { userId: 'qa-student', courseId: course.id, paymentStatus: 'completed' } });
        await db.payment.create({ data: { userId: 'qa-student', courseId: course.id, amount: 20, status: 'successful', razorpayOrderId: 'synthetic-only' } });
        const linked = await db.course.findUniqueOrThrow({ where: { id: course.id }, include: { payments: true, enrollments: true } });
        assert.equal(linked.payments.length, 1); assert.equal(linked.enrollments.length, 1);
        assert.equal((await db.enrollment.findUniqueOrThrow({ where: { userId_courseId: { userId: 'qa-student', courseId: course.id } } })).paymentStatus, 'completed');
        await assert.rejects(db.course.create({ data: { title: 'Duplicate', slug: fields.slug, subjectId: 'qa-subject' } }), { code: 'P2002' });
      } finally { await db.$disconnect(); }
    }));
    await t.test('wrong is_published type fails closed', () => scenario('type', async pool => {
      await pool.query('ALTER TABLE courses ADD COLUMN is_published TEXT NOT NULL DEFAULT \'false\'');
      await rejected(pool, sql, /unexpected definition for courses.is_published/);
    }));
    await t.test('incompatible language default fails closed', () => scenario('default', async pool => {
      await pool.query("ALTER TABLE courses ADD COLUMN language TEXT DEFAULT 'French'");
      await rejected(pool, sql, /unexpected definition for courses.language/);
    }));
    await t.test('wrong publication default fails rather than publishing anything', () => scenario('publishdefault', async pool => {
      await pool.query('ALTER TABLE courses ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT true');
      await rejected(pool, sql, /unexpected definition for courses.is_published/);
    }));
    await t.test('duplicate slugs fail without deduplication', () => scenario('duplicates', async pool => {
      await pool.query(productionColumns + scopeFixture);
      await pool.query("INSERT INTO courses(id,title,slug,subject_id) VALUES ('qa-a','A','duplicate','qa-subject'),('qa-b','B','duplicate','qa-subject')");
      await rejected(pool, sql, /duplicate Course slugs/);
    }));
    await t.test('populated slug-less database requires approved backfill', () => scenario('backfill', async pool => {
      await pool.query(scopeFixture + "INSERT INTO courses(id,title,subject_id) VALUES ('qa-a','A','qa-subject')");
      await rejected(pool, sql, /approved slug backfill strategy/);
    }));
    await t.test('injected failure immediately before commit rolls back the entire reconciliation', () => scenario('rollback', async pool => {
      assert.match(sql, /BEGIN;/); assert.match(sql, /COMMIT;\s*$/);
      await rejected(pool, sql.replace(/COMMIT;\s*$/, 'SELECT 1 / 0; COMMIT;'), { code: '22012' });
    }));
    await t.test('equivalent uniquely constrained slug under another name is preserved', () => scenario('altname', async pool => {
      await pool.query(productionColumns + 'ALTER TABLE courses ADD CONSTRAINT existing_slug_unique UNIQUE(slug)');
      const before = await snapshot(pool);
      await pool.query(sql);
      assert.deepEqual(await snapshot(pool), before);
      assert.equal((await pool.query("SELECT to_regclass('public.courses_slug_key') AS id")).rows[0].id, null);
    }));
    await t.test('wrong expected index definition fails rather than replacing it', () => scenario('badindex', async pool => {
      await pool.query(productionColumns + 'CREATE INDEX courses_slug_key ON courses(slug)');
      await rejected(pool, sql, /unexpected definition; no index was replaced/);
    }));
    await t.test('partial unique index does not substitute for whole-column uniqueness', () => scenario('partial', async pool => {
      await pool.query(productionColumns + 'CREATE UNIQUE INDEX partial_slug_unique ON courses(slug) WHERE is_published');
      await pool.query(sql);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM pg_index WHERE indrelid='courses'::regclass AND indisunique AND indpred IS NULL AND indexrelid='courses_slug_key'::regclass")).rows[0].n, 1);
    }));
    console.log('Reconciliation evidence directory:', configs);
  } finally {
    // Only databases created by this test process are eligible for cleanup.
    for (const name of [...created].reverse()) await admin.query(`DROP DATABASE "${name}"`);
    await admin.end();
  }
});
