import assert from "node:assert/strict";
import { test } from "node:test";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createAssessmentEngine } from "./engine";
import { realTestUrl } from "./local-test-db";

// Run after foundation.test.ts in a fresh, disposable REAL PostgreSQL database.
// Deliberately never reads DATABASE_URL and never runs on the embedded harness.
test("real PostgreSQL multi-connection assessment races", {skip: !realTestUrl()}, async t => {
  const connectionString=realTestUrl()!;
  const a=new Pool({connectionString,max:1,application_name:"vexa-a0-race-a"});
  const b=new Pool({connectionString,max:1,application_name:"vexa-a0-race-b"});
  const control=new Pool({connectionString,max:1,application_name:"vexa-a0-control"});
  const dbA=new PrismaClient({adapter:new PrismaPg(a)});
  const dbB=new PrismaClient({adapter:new PrismaPg(b)});
  const db=new PrismaClient({adapter:new PrismaPg(control)});
  const teacher=createAssessmentEngine(db,async()=>({id:"teacher"}));
  const studentA=createAssessmentEngine(dbA,async()=>({id:"student"}));
  const studentB=createAssessmentEngine(dbB,async()=>({id:"student"}));
  try {
    const ids=await Promise.all([a,b,control].map(pool=>pool.query("SELECT pg_backend_pid() AS id")));
    assert.equal(new Set(ids.map(r=>r.rows[0].id)).size,3);
    const version=await db.assessmentVersion.findFirstOrThrow({where:{publishedAt:{not:null},assessment:{workspaceId:"ws"}},orderBy:{versionNumber:"asc"}});
    const question=await db.assessmentQuestion.findFirstOrThrow({where:{versionId:version.id,questionType:"MCQ"}});
    async function fresh() {
      const assignment=await teacher.assign({versionId:version.id,classId:"class",audience:"SELECTED_STUDENTS",studentIds:["student"],
        opensAt:new Date(Date.now()-60000).toISOString(),closesAt:new Date(Date.now()+3600000).toISOString(),durationMinutes:10,attemptLimit:1});
      return db.assessmentRecipient.findFirstOrThrow({where:{assignmentId:assignment.assignmentId,studentId:"student"}});
    }
    async function race<T>(table:"assessment_recipients"|"assessment_attempts",id:string,left:()=>Promise<T>,right:()=>Promise<T>) {
      // Hold the target row until BOTH independent sessions are waiting on it.
      // This proves contention, not just Promise.all over sequential requests.
      await control.query("BEGIN");
      await control.query(`SELECT id FROM ${table} WHERE id=$1 FOR UPDATE`,[id]);
      const result=Promise.allSettled([left(),right()]);
      try {
        let waiting=0;
        for(let n=0;n<100;n++) {
          const r=await control.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE application_name IN ('vexa-a0-race-a','vexa-a0-race-b') AND wait_event_type='Lock'");
          waiting=r.rows[0].n;
          if(waiting===2) break;
          await new Promise(resolve=>setTimeout(resolve,20));
        }
        assert.equal(waiting,2,"Both real connections must contend before releasing the barrier");
      } finally { await control.query("COMMIT"); }
      return result;
    }
    const successes=<T>(rows:PromiseSettledResult<T>[])=>rows.filter((r):r is PromiseFulfilledResult<T>=>r.status==="fulfilled").map(r=>r.value);
    await t.test("A: same-number start race is idempotent",async()=>{
      const r=await fresh();
      const result=await race("assessment_recipients",r.id,()=>studentA.start(r.id,1),()=>studentB.start(r.id,1));
      assert.equal(successes(result).length,2,JSON.stringify(result));
      assert.equal(new Set(successes(result).map(x=>x.id)).size,1);
      assert.equal(await db.assessmentAttempt.count({where:{recipientId:r.id}}),1);
      assert.equal(await db.assessmentEvent.count({where:{assignmentId:r.assignmentId,type:"ATTEMPT_STARTED"}}),1);
    });
    await t.test("B: attempt limit race cannot create attempts 1 and 2",async()=>{
      const r=await fresh();
      const result=await race("assessment_recipients",r.id,()=>studentA.start(r.id,1),()=>studentB.start(r.id,2));
      assert.equal(successes(result).length,1,JSON.stringify(result));
      const failure=result.find(x=>x.status==="rejected") as PromiseRejectedResult;
      assert.ok(["ATTEMPT_LIMIT","LOCKED"].includes(failure.reason.code),JSON.stringify(result));
      assert.equal(await db.assessmentAttempt.count({where:{recipientId:r.id}}),1);
    });
    await t.test("C: same-revision save race rejects the stale writer",async()=>{
      const r=await fresh();const attempt=await studentA.start(r.id,1);
      const result=await race("assessment_attempts",attempt.id,
        ()=>studentA.saveResponse(attempt.id,question.id,0,{kind:"choice",value:"A"}),
        ()=>studentB.saveResponse(attempt.id,question.id,0,{kind:"choice",value:"B"}));
      assert.equal(successes(result).length,1,JSON.stringify(result));
      const failure=result.find(x=>x.status==="rejected") as PromiseRejectedResult;
      assert.equal(failure.reason.code,"STALE_RESPONSE",JSON.stringify(result));
      const response=await db.assessmentResponse.findUniqueOrThrow({where:{attemptId_questionId:{attemptId:attempt.id,questionId:question.id}}});
      assert.equal(response.revision,1);
      const winner=result[0].status==="fulfilled"?"A":"B";
      assert.deepEqual(response.value,{kind:"choice",value:winner});
    });
    await t.test("D: submit versus autosave cannot change finalized evidence",async()=>{
      const r=await fresh();const attempt=await studentA.start(r.id,1);
      const result=await race<unknown>("assessment_attempts",attempt.id,
        ()=>studentA.submit(attempt.id),()=>studentB.saveResponse(attempt.id,question.id,0,{kind:"choice",value:"A"}));
      assert.equal(result[0].status,"fulfilled",JSON.stringify(result));
      if(result[1].status==="rejected") assert.equal(result[1].reason.code,"LOCKED",JSON.stringify(result));
      const before=await db.assessmentResponse.findMany({where:{attemptId:attempt.id},orderBy:{id:"asc"}});
      await assert.rejects(studentB.saveResponse(attempt.id,question.id,1,{kind:"choice",value:"B"}),{code:"LOCKED"});
      assert.deepEqual(await db.assessmentResponse.findMany({where:{attemptId:attempt.id},orderBy:{id:"asc"}}),before);
      assert.equal((await db.assessmentAttempt.findUniqueOrThrow({where:{id:attempt.id}})).status,"SUBMITTED");
    });
    await t.test("E: double submission has one final timestamp and event",async()=>{
      const r=await fresh();const attempt=await studentA.start(r.id,1);
      const result=await race("assessment_attempts",attempt.id,()=>studentA.submit(attempt.id),()=>studentB.submit(attempt.id));
      assert.equal(successes(result).length,2,JSON.stringify(result));
      assert.deepEqual(successes(result)[0],successes(result)[1]);
      assert.equal(await db.assessmentEvent.count({where:{attemptId:attempt.id,type:"ATTEMPT_SUBMITTED"}}),1);
    });
  } finally {
    await Promise.all([dbA.$disconnect(),dbB.$disconnect(),db.$disconnect()]);
    await Promise.all([a.end(),b.end(),control.end()]);
  }
});
