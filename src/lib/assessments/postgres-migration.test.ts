import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { realTestUrl } from "./local-test-db";

// Must run alone against an EMPTY disposable loopback database, never production.
test("real PostgreSQL upgrade preservation and migration failure safety",{skip:!realTestUrl()},async t=>{
  const pool=new Pool({connectionString:realTestUrl()!,max:1});
  const db=new PrismaClient({adapter:new PrismaPg(pool)});
  try {
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'")).rows[0].n,0,"Use a new empty test database");
    const names=fs.readdirSync("prisma/migrations").filter(n=>fs.existsSync(path.join("prisma/migrations",n,"migration.sql"))).sort();
    const migrationName="20260907130000_add_assessment_foundation";
    const lifecycleMigration="20260908120000_enable_objective_assessment_lifecycle";
    const baseline=names.filter(n=>n!==migrationName && n!==lifecycleMigration);
    assert.ok(names.includes(lifecycleMigration));
    assert.equal(baseline.length,20); // Original 19 plus baseline reconciliation; A0 remains isolated.
    for(const n of baseline) await pool.query(fs.readFileSync(path.join("prisma/migrations",n,"migration.sql"),"utf8"));
    await db.user.createMany({data:[{id:"teacher",role:"TEACHER",name:"Synthetic teacher"},{id:"student",role:"STUDENT",name:"Synthetic student"},{id:"admin",role:"SUPER_ADMIN"}]});
    await db.workspace.create({data:{id:"ws",ownerId:"teacher",name:"Synthetic workspace",slug:"synthetic",status:"ACTIVE"}});
    await db.board.create({data:{id:"board",name:"test",title:"Test"}});
    await db.qualification.create({data:{id:"qual",boardId:"board",name:"test",title:"Class 12"}});
    await db.subject.create({data:{id:"subject",qualificationId:"qual",name:"IP",slug:"ip"}});
    await db.workspaceAcademicScope.create({data:{workspaceId:"ws",subjectId:"subject",assignedById:"admin"}});
    await db.class.create({data:{id:"class",workspaceId:"ws",subjectId:"subject",qualificationId:"qual",name:"Synthetic class",academicYear:"2026",joinCode:"SYNTHETIC"}});
    await db.classStudent.create({data:{classId:"class",studentId:"student"}});
    await db.savedGeneratedPaper.create({data:{id:"paper",workspaceId:"ws",createdById:"teacher",name:"Synthetic paper",boardId:"board",qualificationId:"qual",subjectId:"subject",
      boardTitleSnapshot:"Test",qualificationTitleSnapshot:"Class 12",subjectNameSnapshot:"IP",totalMarks:1,durationMinutes:30,finalOrderMode:"CHAPTER_WISE",institutionName:"School",examLabel:"Test",courseLine:"IP",paperTitle:"Paper",topicLine:"",dateText:"",classText:"",showStudentName:true,showRollNumber:false,instructions:"Answer."}});
    await db.bankQuestion.create({data:{id:"bank",subjectId:"subject",questionText:"Synthetic MCQ",optionA:"a",optionB:"b",optionC:"c",optionD:"d",correctAnswer:"A"}});
    await db.challenge.create({data:{id:"challenge",workspaceId:"ws",subjectId:"subject",title:"Synthetic practice",isPublished:true}});
    await db.question.create({data:{id:"question",challengeId:"challenge",questionText:"Synthetic MCQ",optionA:"a",optionB:"b",optionC:"c",optionD:"d",correctAnswer:"A"}});
    await db.challengeAttempt.create({data:{id:"attempt",challengeId:"challenge",userId:"student",score:0,totalQuestions:1,percentage:0,answers:'{"question":"B"}'}});
    await db.mistakeEntry.create({data:{id:"mistake",userId:"student",questionId:"question",challengeId:"challenge",studentAnswer:"B",correctAnswer:"A"}});
    await db.workspaceAssignmentBatch.create({data:{id:"batch",workspaceId:"ws",classId:"class",challengeId:"challenge",assignedById:"teacher",audience:"CLASS"}});
    await db.workspaceAssignmentRecipient.create({data:{batchId:"batch",studentId:"student"}});
    const tables=(await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r=>r.tablename as string);
    async function records() {
      const result:Record<string,unknown>={};
      for(const table of tables) {
        assert.match(table,/^[a-z_]+$/);
        result[table]=(await pool.query(`SELECT to_jsonb(t)::text AS row FROM "${table}" t ORDER BY to_jsonb(t)::text`)).rows;
      }
      return result;
    }
    async function structures() {
      return {
        columns:(await pool.query("SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[]) ORDER BY table_name,ordinal_position",[tables])).rows,
        indexes:(await pool.query("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename=ANY($1::text[]) ORDER BY tablename,indexname",[tables])).rows,
        constraints:(await pool.query("SELECT c.relname,p.conname,pg_get_constraintdef(p.oid) AS def FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($1::text[]) ORDER BY c.relname,p.conname",[tables])).rows,
      };
    }
    const before=await records(),schemaBefore=await structures();
    const sql=fs.readFileSync(path.join("prisma/migrations",migrationName,"migration.sql"),"utf8");
    await t.test("mid-migration failure rolls back all A0 DDL and preserves baseline",async()=>{
      assert.match(sql,/BEGIN;/);assert.match(sql,/COMMIT;\s*$/);
      await assert.rejects(pool.query(sql.replace(/COMMIT;\s*$/,"SELECT 1 / 0; COMMIT;")),{code:"22012"});
      await pool.query("ROLLBACK");
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'assessment%'")).rows[0].n,0);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM pg_type WHERE typname LIKE 'Assessment%'")).rows[0].n,0);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM pg_proc WHERE proname LIKE 'assessment_%'")).rows[0].n,0);
      assert.deepEqual(await records(),before);
    });
    await t.test("apply only A0 to populated baseline without rewriting any existing record",async()=>{
      await pool.query(sql);
      assert.deepEqual(await records(),before);
      assert.deepEqual(await structures(),schemaBefore);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'assessment%'")).rows[0].n,9);
    });
    await t.test("existing membership, saved paper, practice and assignment relations remain queryable",async()=>{
      assert.equal((await db.class.findUniqueOrThrow({where:{id:"class"},include:{students:{include:{student:true}},assignmentBatches:{include:{recipients:true}}}})).students[0].student.name,"Synthetic student");
      assert.equal((await db.savedGeneratedPaper.findUniqueOrThrow({where:{id:"paper"},include:{workspace:true}})).workspace?.id,"ws");
      assert.equal((await db.challenge.findUniqueOrThrow({where:{id:"challenge"},include:{attempts:true,questions:true,mistakes:true}})).attempts.length,1);
    });
    await t.test("DDL is not blindly replayable: failed migration requires reviewed resolve then retry",async()=>{
      await assert.rejects(pool.query(sql),{code:"42710"});
      await pool.query("ROLLBACK");
      assert.deepEqual(await records(),before);
    });
  } finally { await db.$disconnect();await pool.end(); }
});
