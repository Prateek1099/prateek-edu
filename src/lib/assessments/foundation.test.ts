import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { assessmentTestDatabase } from "./local-test-db";
import { createAssessmentEngine } from "./engine";
import { buildAssessmentSnapshot, IMAGE_FREE_ERROR, marksSummary, parseResponse, requireReleasable } from "./rules";
import { studentAssessmentDto } from "./student-dto";

// Never reads DATABASE_URL. Defaults to in-memory PostgreSQL-compatible testing;
// an explicit loopback-only disposable URL enables the REAL PostgreSQL review.
test("assessment A0 isolated migration and service contract", async t => {
  const { memory, pool } = await assessmentTestDatabase();
  const db = new PrismaClient({adapter:new PrismaPg(pool)});
  try {
    for(const name of fs.readdirSync("prisma/migrations").sort()) {
      const file=path.join("prisma/migrations",name,"migration.sql");
      if(fs.existsSync(file)) await memory.exec(fs.readFileSync(file,"utf8"));
    }
    await db.user.createMany({data:[
      {id:"teacher",role:"TEACHER"},{id:"teacher2",role:"TEACHER"},{id:"admin",role:"SUPER_ADMIN"},
      {id:"student",role:"STUDENT"},{id:"student2",role:"STUDENT"},{id:"outsider",role:"STUDENT"},
    ]});
    await db.workspace.createMany({data:[
      {id:"ws",ownerId:"teacher",name:"Test",slug:"test",status:"ACTIVE"},
      {id:"ws2",ownerId:"teacher2",name:"Other",slug:"other",status:"ACTIVE"},
    ]});
    await db.board.create({data:{id:"board",name:"test",title:"Test"}});
    await db.qualification.create({data:{id:"qualification",name:"test",title:"Class 12",boardId:"board"}});
    await db.subject.createMany({data:[
      {id:"subject",qualificationId:"qualification",name:"IP",slug:"ip"},
      {id:"subject2",qualificationId:"qualification",name:"CS",slug:"cs"},
    ]});
    await db.workspaceAcademicScope.createMany({data:[
      {workspaceId:"ws",subjectId:"subject",assignedById:"admin"},
      {workspaceId:"ws2",subjectId:"subject",assignedById:"admin"},
    ]});
    await db.class.createMany({data:[
      {id:"class",workspaceId:"ws",subjectId:"subject",qualificationId:"qualification",name:"Test class",academicYear:"2026",joinCode:"TEST1"},
      {id:"class2",workspaceId:"ws2",subjectId:"subject",qualificationId:"qualification",name:"Other",academicYear:"2026",joinCode:"TEST2"},
    ]});
    await db.classStudent.createMany({data:[
      {classId:"class",studentId:"student"},{classId:"class",studentId:"student2"},
    ]});
    await db.bankQuestion.create({data:{id:"bank",subjectId:"subject",questionType:"MCQ",questionText:"Bank original",optionA:"a",optionB:"b",optionC:"c",optionD:"d",correctAnswer:"A"}});
    const source = await db.savedGeneratedPaper.create({data:{
      id:"paper",workspaceId:"ws",createdById:"teacher",name:"Test paper",boardId:"board",qualificationId:"qualification",subjectId:"subject",
      boardTitleSnapshot:"Test",qualificationTitleSnapshot:"Class 12",subjectNameSnapshot:"IP",
      totalMarks:10,durationMinutes:30,finalOrderMode:"CHAPTER_WISE",institutionName:"School",examLabel:"Test",
      courseLine:"IP",paperTitle:"Paper",topicLine:"",dateText:"",classText:"",showStudentName:true,showRollNumber:false,instructions:"Answer all.",
    }});
    const section=await db.savedGeneratedPaperSection.create({data:{savedPaperId:source.id,label:"Section A",questionType:null,questionCount:7,marksPerQuestion:null,isMixedOutput:true,sortOrder:0}});
    const types=["MCQ","TRUE_FALSE","FILL_BLANK","ASSERTION_REASON","VERY_SHORT_ANSWER","SHORT_ANSWER","LONG_ANSWER"] as const;
    await db.savedGeneratedPaperQuestion.createMany({data:types.map((questionType,index)=>({
      id:"sq"+index,savedPaperId:source.id,sectionId:section.id,originalBankQuestionId:index===0?"bank":null,
      questionType,marks:index===6?4:1,difficulty:"easy",sortOrder:index,finalQuestionNumber:index+1,questionText:"Question "+index,
      optionA:["MCQ","ASSERTION_REASON"].includes(questionType)?"alpha":null,
      optionB:["MCQ","ASSERTION_REASON"].includes(questionType)?"beta":null,
      optionC:["MCQ","ASSERTION_REASON"].includes(questionType)?"gamma":null,
      optionD:["MCQ","ASSERTION_REASON"].includes(questionType)?"delta":null,
      correctAnswer:questionType==="TRUE_FALSE"?"TRUE":questionType==="FILL_BLANK"?"canonical":["MCQ","ASSERTION_REASON"].includes(questionType)?"A":null,
      modelAnswer:questionType.includes("ANSWER")?"SECRET_MODEL":null,explanation:"SECRET_EXPLANATION",
    }))});
    const teacher=createAssessmentEngine(db,async()=>({id:"teacher"}));
    const student=createAssessmentEngine(db,async()=>({id:"student"}));
    const other=createAssessmentEngine(db,async()=>({id:"outsider"}));
    const sourceRead=()=>db.savedGeneratedPaper.findUniqueOrThrow({where:{id:"paper"},include:{sections:{include:{questions:true}}}});
    const input=(versionId:string)=>({versionId,classId:"class",audience:"CLASS" as const,opensAt:new Date(Date.now()-60000).toISOString(),
      closesAt:new Date(Date.now()+3600000).toISOString(),durationMinutes:30,attemptLimit:2});
    let created!:Awaited<ReturnType<typeof teacher.createFromSavedPaper>>;
    await t.test("image-free version creation preserves every type, order, marks and context",async()=>{
      created=await teacher.createFromSavedPaper("paper");
      const qs=await db.assessmentQuestion.findMany({where:{versionId:created.versionId},orderBy:{questionNumber:"asc"}});
      assert.deepEqual(qs.map(q=>q.questionType),types);
      assert.deepEqual(qs.map(q=>q.questionNumber),[1,2,3,4,5,6,7]);
      assert.equal(qs.reduce((n,q)=>n+q.marks,0),10);
      assert.equal(qs[6].marks,4);
    });
    const before=()=>Promise.all([db.assessment.count(),db.assessmentVersion.count(),db.assessmentQuestion.count()]);
    await t.test("one image blocks the entire paper before any partial inserts",async()=>{
      const counts=await before();
      await db.savedGeneratedPaperQuestion.update({where:{id:"sq6"},data:{imageUrl:"https://test.public.blob.vercel-storage.com/paper-archive/image.png"}});
      await assert.rejects(teacher.createFromSavedPaper("paper"),{message:IMAGE_FREE_ERROR});
      assert.deepEqual(await before(),counts);
      await db.savedGeneratedPaperQuestion.update({where:{id:"sq6"},data:{imageUrl:null}});
    });
    await t.test("inline option/stimulus media references are rejected; no structured fields exist yet",async()=>{
      const s=await sourceRead();
      for(const field of ["optionA","questionText"] as const) {
        const copy=structuredClone(s);copy.sections[0].questions[0][field]="![diagram](https://example.org/a.png)";
        assert.throws(()=>buildAssessmentSnapshot(copy),{code:"MEDIA_UNSUPPORTED"});
      }
    });
    await t.test("plain caption/alt text without media is not over-blocked",async()=>{
      const s=await sourceRead();s.sections[0].questions[0].imageAlt="An ordinary label";s.sections[0].questions[0].imageCaption="Plain text";
      assert.equal(buildAssessmentSnapshot(s).totalMarks,10);
    });
    await t.test("invalid total is rejected without partial data",async()=>{
      const counts=await before();await db.savedGeneratedPaper.update({where:{id:"paper"},data:{totalMarks:11}});
      await assert.rejects(teacher.createFromSavedPaper("paper"),{code:"INVALID_SOURCE"});
      assert.deepEqual(await before(),counts);await db.savedGeneratedPaper.update({where:{id:"paper"},data:{totalMarks:10}});
    });
    await t.test("a failure after assessment insert rolls back the full transaction",async()=>{
      const counts=await before();
      await assert.rejects(db.$transaction(async tx=>{
        await tx.assessment.create({data:{workspaceId:"ws",createdById:"teacher",subjectId:"subject",sourceSavedPaperId:"paper",title:"ROLLBACK"}});
        throw new Error("Injected downstream failure");
      }));
      assert.deepEqual(await before(),counts);
    });
    await t.test("published version cannot update or delete",async()=>{
      await assert.rejects(db.assessmentVersion.update({where:{id:created.versionId},data:{title:"changed"}}));
      await assert.rejects(db.assessmentVersion.delete({where:{id:created.versionId}}));
    });
    await t.test("published question cannot edit, remove or append",async()=>{
      const q=await db.assessmentQuestion.findFirstOrThrow({where:{versionId:created.versionId}});
      await assert.rejects(db.assessmentQuestion.update({where:{id:q.id},data:{questionText:"changed"}}));
      await assert.rejects(db.assessmentQuestion.delete({where:{id:q.id}}));
      await assert.rejects(db.assessmentQuestion.create({data:{...q,options:q.options as Prisma.InputJsonValue,id:"appended",questionNumber:99}}));
    });
    await t.test("published sections cannot be changed",async()=>{
      const s=await db.assessmentSection.findFirstOrThrow({where:{versionId:created.versionId}});
      await assert.rejects(db.assessmentSection.update({where:{id:s.id},data:{label:"changed"}}));
    });
    await t.test("bank edit/delete and source edit cannot change sealed questions",async()=>{
      await db.bankQuestion.update({where:{id:"bank"},data:{questionText:"new bank text"}});
      await db.bankQuestion.delete({where:{id:"bank"}});
      await db.savedGeneratedPaperQuestion.update({where:{id:"sq0"},data:{questionText:"new saved text"}});
      const q=await db.assessmentQuestion.findFirstOrThrow({where:{versionId:created.versionId,questionNumber:1}});
      assert.equal(q.questionText,"Question 0");assert.equal(q.originalBankQuestionId,"bank");
    });
    await t.test("student DTO explicitly excludes all marking and media data",async()=>{
      const v=await db.assessmentVersion.findUniqueOrThrow({where:{id:created.versionId},include:{sections:{include:{questions:true}}}});
      const poisoned={...v,privateServerConfiguration:{token:"SECRET_CONFIG"},header:{...(v.header as object),teacherNotes:"SECRET_HEADER",imageUrl:"https://test.public.blob.vercel-storage.com/key.png"},
        sections:v.sections.map(s=>({...s,markingScheme:"SECRET_SCHEME",questions:s.questions.map(q=>({...q,correctOption:"SECRET_OPTION",gradingMetadata:{score:99},acceptedAnswers:["SECRET_ACCEPTED"],
          modelAnswer:"https://test.public.blob.vercel-storage.com/marking-image.png",imageUrl:"https://test.public.blob.vercel-storage.com/key.png"}))}))};
      const dto=studentAssessmentDto(poisoned);const json=JSON.stringify(dto);
      for(const forbidden of ["correctAnswer","correctOption","modelAnswer","explanation","acceptedAnswers","markingScheme","teacherNotes","gradingMetadata","privateServerConfiguration","imageUrl","SECRET","blob.vercel"])
        assert.equal(json.includes(forbidden),false,forbidden);
      assert.deepEqual(Object.keys(dto.sections[0].questions[0]).sort(),["id","marks","number","options","text","type"]);
    });
    await t.test("another workspace teacher and SUPER_ADMIN cannot create teacher assessments",async()=>{
      for(const id of ["teacher2","admin","student"])
        await assert.rejects(createAssessmentEngine(db,async()=>({id})).createFromSavedPaper("paper"));
    });
    await t.test("unassigned subject and unpublished hierarchy rejected",async()=>{
      await db.workspaceAcademicScope.updateMany({where:{workspaceId:"ws"},data:{status:"INACTIVE"}});
      await assert.rejects(teacher.assign(input(created.versionId)),{code:"FORBIDDEN"});
      await db.workspaceAcademicScope.updateMany({where:{workspaceId:"ws"},data:{status:"ACTIVE"}});
      await db.subject.update({where:{id:"subject"},data:{status:"DRAFT"}});
      await assert.rejects(teacher.assign(input(created.versionId)),{code:"FORBIDDEN"});
      await db.subject.update({where:{id:"subject"},data:{status:"PUBLISHED"}});
    });
    await t.test("other-workspace class rejected",async()=>{await assert.rejects(teacher.assign({...input(created.versionId),classId:"class2"}));});
    await t.test("selected outsiders and duplicate recipients rejected",async()=>{
      for(const studentIds of [["outsider"],["student","student"]])
        await assert.rejects(teacher.assign({...input(created.versionId),audience:"SELECTED_STUDENTS",studentIds}));
    });
    let assignmentId:string,recipientId:string;
    await t.test("class assignment snapshots unique active students",async()=>{
      const a=await teacher.assign(input(created.versionId));assignmentId=a.assignmentId;
      assert.equal(a.recipientCount,2);
      recipientId=(await db.assessmentRecipient.findUniqueOrThrow({where:{assignmentId_studentId:{assignmentId,studentId:"student"}}})).id;
      await assert.rejects(db.assessmentRecipient.create({data:{assignmentId,studentId:"student"}}));
    });
    await t.test("source archive does not invalidate assigned assessment",async()=>{
      await db.savedGeneratedPaper.update({where:{id:"paper"},data:{archivedAt:new Date()}});
      await assert.rejects(teacher.createFromSavedPaper("paper"));
      assert.equal((await student.start(recipientId,1)).status,"IN_PROGRESS");
      await db.savedGeneratedPaper.update({where:{id:"paper"},data:{archivedAt:null}});
    });
    let attemptId:string;
    await t.test("duplicate concurrent starts return one exact attempt and one event",async()=>{
      const starts=await Promise.all([student.start(recipientId,1),student.start(recipientId,1),student.start(recipientId,1)]);
      assert.equal(new Set(starts.map(s=>s.id)).size,1);attemptId=starts[0].id;
      assert.equal(await db.assessmentAttempt.count({where:{recipientId}}),1);
      assert.equal(await db.assessmentEvent.count({where:{attemptId,type:"ATTEMPT_STARTED"}}),1);
    });
    await t.test("server start and capped deadline are persisted",async()=>{
      const a=await db.assessmentAttempt.findUniqueOrThrow({where:{id:attemptId}});
      assert.equal(a.expiresAt.getTime()-a.startedAt.getTime(),1800000);
      assert.ok(Math.abs(Date.now()-a.startedAt.getTime())<60000);
    });
    await t.test("database timezone cannot shift attempt deadlines or event defaults",async()=>{
      await memory.exec("SET TIME ZONE 'Asia/Kolkata'");
      try {
        const a=await teacher.assign(input(created.versionId));
        const r=await db.assessmentRecipient.findFirstOrThrow({where:{assignmentId:a.assignmentId,studentId:"student"}});
        const started=await student.start(r.id,1);
        assert.ok(Math.abs(Date.now()-new Date(started.startedAt).getTime())<60000);
        assert.equal(new Date(started.expiresAt).getTime()-new Date(started.startedAt).getTime(),1800000);
        const event=await db.assessmentEvent.findFirstOrThrow({where:{attemptId:started.id,type:"ATTEMPT_STARTED"}});
        assert.ok(Math.abs(Date.now()-event.createdAt.getTime())<60000);
        assert.equal((await student.delivery(started.id)).attempt.id,started.id);
        await student.submit(started.id);
      } finally { await memory.exec("SET TIME ZONE 'UTC'"); }
    });
    await t.test("another student cannot start or access recipient/attempt",async()=>{
      await assert.rejects(other.start(recipientId,1));
      await assert.rejects(other.delivery(attemptId));await assert.rejects(other.submit(attemptId));
    });
    await t.test("inactive membership prevents access even with legacy workspaceId",async()=>{
      await db.user.update({where:{id:"student"},data:{workspaceId:"ws"}});
      await db.classStudent.updateMany({where:{classId:"class",studentId:"student"},data:{status:"REMOVED"}});
      await assert.rejects(student.delivery(attemptId));
      await db.classStudent.updateMany({where:{classId:"class",studentId:"student"},data:{status:"ACTIVE"}});
    });
    await t.test("every question starts with durable unanswered evidence",async()=>{
      const r=await db.assessmentResponse.findMany({where:{attemptId}});
      assert.equal(r.length,7);assert.ok(r.every(x=>x.state==="UNANSWERED"&&x.revision===0&&x.value===null));
    });
    const qs=await db.assessmentQuestion.findMany({where:{versionId:created.versionId},orderBy:{questionNumber:"asc"}});
    await t.test("choice autosave succeeds; stale revision cannot overwrite",async()=>{
      assert.equal((await student.saveResponse(attemptId,qs[0].id,0,{kind:"choice",value:"A"})).revision,1);
      await assert.rejects(student.saveResponse(attemptId,qs[0].id,0,{kind:"choice",value:"B"}),{code:"STALE_RESPONSE"});
    });
    await t.test("typed and boolean responses retain exact values",async()=>{
      await student.saveResponse(attemptId,qs[1].id,0,{kind:"boolean",value:false});
      await student.saveResponse(attemptId,qs[6].id,0,{kind:"text",value:"  SQL\nSELECT * FROM t;  "});
      const r=await db.assessmentResponse.findUniqueOrThrow({where:{attemptId_questionId:{attemptId,questionId:qs[6].id}}});
      assert.deepEqual(r.value,{kind:"text",value:"  SQL\nSELECT * FROM t;  "});
    });
    await t.test("another student cannot save a response",async()=>{await assert.rejects(other.saveResponse(attemptId,qs[0].id,1,{kind:"choice",value:"B"}));});
    let secondVersion:string;
    await t.test("later version never changes an old attempt",async()=>{
      // A0 has no version-edit API. Exercise the database's future version model
      // directly, under the SAME assessment, without mutating the sealed version.
      const snapshot=buildAssessmentSnapshot(await sourceRead());
      secondVersion=await db.$transaction(async tx=>{
        const v=await tx.assessmentVersion.create({data:{assessmentId:created.assessmentId,versionNumber:2,
          title:"Later version",header:snapshot.header,totalMarks:snapshot.totalMarks,durationMinutes:snapshot.durationMinutes}});
        for(const section of snapshot.sections) {
          const s=await tx.assessmentSection.create({data:{versionId:v.id,label:section.label,sortOrder:section.sortOrder}});
          await tx.assessmentQuestion.createMany({data:section.questions.map(q=>({...q,
            options:q.options as Prisma.InputJsonValue,versionId:v.id,sectionId:s.id}))});
        }
        await tx.assessmentVersion.update({where:{id:v.id},data:{publishedAt:new Date()}});
        return v.id;
      });
      assert.notEqual(secondVersion,created.versionId);
      assert.equal((await db.assessmentVersion.findUniqueOrThrow({where:{id:secondVersion}})).assessmentId,created.assessmentId);
      assert.equal((await student.delivery(attemptId)).paper.sections[0].questions[0].text,"Question 0");
      assert.equal((await db.assessmentAttempt.findUniqueOrThrow({where:{id:attemptId}})).versionId,created.versionId);
    });
    await t.test("another version question rejected by service and composite FK",async()=>{
      const q=await db.assessmentQuestion.findFirstOrThrow({where:{versionId:secondVersion}});
      await assert.rejects(student.saveResponse(attemptId,q.id,0,{kind:"choice",value:"A"}));
      await assert.rejects(db.assessmentResponse.create({data:{attemptId,versionId:created.versionId,questionId:q.id,value:Prisma.DbNull}}));
    });
    await t.test("clearing an answer preserves a durable unanswered record",async()=>{
      await student.saveResponse(attemptId,qs[0].id,1,null);
      const r=await db.assessmentResponse.findUniqueOrThrow({where:{attemptId_questionId:{attemptId,questionId:qs[0].id}}});
      assert.equal(r.state,"UNANSWERED");assert.equal(r.revision,2);
    });
    await t.test("idempotent submission locks edits and uses server time",async()=>{
      const a=await student.submit(attemptId);const b=await student.submit(attemptId);
      assert.deepEqual(a,b);assert.equal(a.status,"SUBMITTED");assert.ok(a.submittedAt);
      assert.equal(await db.assessmentEvent.count({where:{attemptId,type:"ATTEMPT_SUBMITTED"}}),1);
      await assert.rejects(student.saveResponse(attemptId,qs[0].id,2,{kind:"choice",value:"A"}));
      await assert.rejects(db.assessmentResponse.updateMany({where:{attemptId},data:{revision:{increment:1}}}));
      assert.equal((await student.start(recipientId,1)).status,"SUBMITTED");
    });
    await t.test("submission cannot be reopened or falsely graded/released",async()=>{
      for(const status of ["IN_PROGRESS","GRADED","RELEASED"] as const)
        await assert.rejects(db.assessmentAttempt.update({where:{id:attemptId},data:{status}}));
    });
    await t.test("attempt limits and sequence enforced without inferring attribution",async()=>{
      const a=await student.start(recipientId,2);assert.notEqual(a.id,attemptId);await student.submit(a.id);
      await assert.rejects(student.start(recipientId,3),{code:"ATTEMPT_LIMIT"});
      const another=await teacher.assign(input(created.versionId));
      const r=await db.assessmentRecipient.findUniqueOrThrow({where:{assignmentId_studentId:{assignmentId:another.assignmentId,studentId:"student"}}});
      assert.equal(await db.assessmentAttempt.count({where:{recipientId:r.id}}),0);
      const different=await student.start(r.id,1);assert.notEqual(different.id,attemptId);
    });
    await t.test("closed/opening windows block start",async()=>{
      const future=await teacher.assign({...input(created.versionId),opensAt:new Date(Date.now()+60000).toISOString()});
      const r=await db.assessmentRecipient.findFirstOrThrow({where:{assignmentId:future.assignmentId,studentId:"student"}});
      await assert.rejects(student.start(r.id,1),{code:"WINDOW_CLOSED"});
      await assert.rejects(teacher.assign({...input(created.versionId),closesAt:new Date(Date.now()-1000).toISOString()}));
    });
    await t.test("revocation denies resume, save and submit",async()=>{
      const a=await teacher.assign(input(created.versionId));const r=await db.assessmentRecipient.findFirstOrThrow({where:{assignmentId:a.assignmentId,studentId:"student"}});
      const attempt=await student.start(r.id,1);await teacher.revoke(r.id);
      await assert.rejects(student.delivery(attempt.id));await assert.rejects(student.submit(attempt.id));
    });
    await t.test("cancellation denies recipient access; repeated cancel is idempotent",async()=>{
      await teacher.cancel(assignmentId);await teacher.cancel(assignmentId);
      await assert.rejects(student.start(recipientId,1));await assert.rejects(student.submit(attemptId));
      assert.equal(await db.assessmentEvent.count({where:{assignmentId,type:"CANCELLED"}}),1);
    });
    await t.test("event history and submitted identities cannot be mutated",async()=>{
      const event=await db.assessmentEvent.findFirstOrThrow({where:{attemptId}});
      await assert.rejects(db.assessmentEvent.delete({where:{id:event.id}}));
      await assert.rejects(db.assessmentAttempt.update({where:{id:attemptId},data:{recipientId:"other"}}));
    });
    await t.test("exact recipient/assignment/version composite constraints are installed",async()=>{
      const rows=await memory.query<{conname:string}>("SELECT conname FROM pg_constraint WHERE conname LIKE 'assessment_%_fk'");
      assert.equal(rows.rows.length,6);
    });
    await t.test("database enforces ownership FK and assignment class/version scope independently of service",async()=>{
      await assert.rejects(db.assessment.create({data:{workspaceId:"missing-workspace",createdById:"teacher",subjectId:"subject",sourceSavedPaperId:"paper",title:"Invalid"}}),{code:"P2003"});
      const original=await db.assessmentAssignment.findUniqueOrThrow({where:{id:assignmentId}});
      await assert.rejects(db.assessmentAssignment.create({data:{...original,id:"wrong-class-assignment",classId:"class2",cancelledAt:null}}));
    });
    await t.test("database rejects duplicate durable response identity",async()=>{
      const a=await teacher.assign(input(created.versionId));
      const r=await db.assessmentRecipient.findFirstOrThrow({where:{assignmentId:a.assignmentId,studentId:"student"}});
      const started=await student.start(r.id,1);
      await assert.rejects(db.assessmentResponse.create({data:{attemptId:started.id,versionId:created.versionId,questionId:qs[0].id,value:Prisma.DbNull}}),{code:"P2002"});
    });
    await t.test("assessment owner/source/subject cannot be rewritten",async()=>{
      await assert.rejects(db.assessment.update({where:{id:created.assessmentId},data:{workspaceId:"ws2"}}));
      await assert.rejects(db.assessment.update({where:{id:created.assessmentId},data:{sourceSavedPaperId:"different"}}));
    });
    await t.test("assigned policy and recipient identity cannot change",async()=>{
      await assert.rejects(db.assessmentAssignment.update({where:{id:assignmentId},data:{attemptLimit:10}}));
      await assert.rejects(db.assessmentRecipient.update({where:{id:recipientId},data:{studentId:"outsider"}}));
    });
    await t.test("inactive classes and suspended workspaces deny valid recipients",async()=>{
      const a=await teacher.assign(input(created.versionId));
      const r=await db.assessmentRecipient.findFirstOrThrow({where:{assignmentId:a.assignmentId,studentId:"student"}});
      await db.class.update({where:{id:"class"},data:{status:"ARCHIVED"}});
      await assert.rejects(student.start(r.id,1),{code:"FORBIDDEN"});
      await db.class.update({where:{id:"class"},data:{status:"ACTIVE"}});
      await db.workspace.update({where:{id:"ws"},data:{status:"SUSPENDED"}});
      await assert.rejects(student.start(r.id,1),{code:"FORBIDDEN"});
      await db.workspace.update({where:{id:"ws"},data:{status:"ACTIVE"}});
    });
    await t.test("closing time caps deadline; expired attempts freeze answers but can submit",async()=>{
      const closesAt=new Date(Date.now()+1500).toISOString();
      const a=await teacher.assign({...input(created.versionId),closesAt});
      const r=await db.assessmentRecipient.findFirstOrThrow({where:{assignmentId:a.assignmentId,studentId:"student"}});
      const started=await student.start(r.id,1);
      assert.equal(started.expiresAt,closesAt);
      await new Promise(resolve=>setTimeout(resolve,1550));
      await assert.rejects(student.delivery(started.id),{code:"LOCKED"});
      await assert.rejects(student.saveResponse(started.id,qs[0].id,0,{kind:"choice",value:"A"}),{code:"LOCKED"});
      await assert.rejects(db.assessmentResponse.updateMany({where:{attemptId:started.id},data:{revision:{increment:1}}}));
      assert.equal((await student.submit(started.id)).status,"SUBMITTED");
    });
    await t.test("attempt number uniqueness and cross-assignment attribution reject forged rows",async()=>{
      const original=await db.assessmentAttempt.findUniqueOrThrow({where:{id:attemptId}});
      await assert.rejects(db.assessmentAttempt.create({data:{...original,id:"forged",status:"IN_PROGRESS",submittedAt:null}}));
      const a=await teacher.assign(input(created.versionId));
      await assert.rejects(db.assessmentAttempt.create({data:{...original,id:"forged-other",assignmentId:a.assignmentId,status:"IN_PROGRESS",submittedAt:null}}));
    });
    await t.test("invalid selected-member state produces no partial assignment",async()=>{
      await db.classStudent.updateMany({where:{studentId:"student2"},data:{status:"REMOVED"}});
      const count=await db.assessmentAssignment.count();
      await assert.rejects(teacher.assign({...input(created.versionId),audience:"SELECTED_STUDENTS",studentIds:["student2"]}));
      assert.equal(await db.assessmentAssignment.count(),count);
      await db.classStudent.updateMany({where:{studentId:"student2"},data:{status:"ACTIVE"}});
    });
    await t.test("transaction failure during service snapshot insertion leaves no assessment rows",async()=>{
      const counts=await before();
      await memory.exec("CREATE FUNCTION fail_a0_question() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected failure'; END $$; CREATE TRIGGER fail_a0_question BEFORE INSERT ON assessment_questions FOR EACH ROW EXECUTE FUNCTION fail_a0_question();");
      try { await assert.rejects(teacher.createFromSavedPaper("paper")); assert.deepEqual(await before(),counts); }
      finally { await memory.exec("DROP TRIGGER fail_a0_question ON assessment_questions; DROP FUNCTION fail_a0_question();"); }
    });
    await t.test("source deletion preserves snapshots; user/class deletion cannot erase history",async()=>{
      await db.savedGeneratedPaper.delete({where:{id:"paper"}});
      assert.equal(await db.assessmentQuestion.count({where:{versionId:created.versionId}}),7);
      await assert.rejects(db.class.delete({where:{id:"class"}}));
      await assert.rejects(db.user.delete({where:{id:"student"}}));
    });
    await t.test("existing Challenge/Mistake/Assignment records are never created",async()=>{
      assert.deepEqual(await Promise.all([db.challenge.count(),db.challengeAttempt.count(),db.mistakeEntry.count(),
        db.workspaceAssignmentBatch.count(),db.workspaceAssignmentRecipient.count()]),[0,0,0,0,0]);
    });
  } finally {
    await db.$disconnect();await pool.end();await memory.close();
  }
});
test("marks use 1/5 = 20%, never question-count percentage",()=>{
  assert.deepEqual(marksSummary([{maxMarks:1,awardedMarks:1},{maxMarks:4,awardedMarks:0}]),{maxMarks:5,awardedMarks:1,complete:true,percentage:20});
});
test("partial mixed marks cannot be final or released",()=>{
  const rows=[{maxMarks:1,awardedMarks:1},{maxMarks:4,awardedMarks:null}];
  assert.equal(marksSummary(rows).percentage,null);
  assert.throws(()=>requireReleasable("GRADED",rows));
  assert.throws(()=>requireReleasable("SUBMITTED",[{maxMarks:1,awardedMarks:1}]));
});
test("all typed responses retain Unicode and choice/boolean are not coerced",()=>{
  assert.deepEqual(parseResponse("LONG_ANSWER",{kind:"text",value:"Δ हिंदी"}),{kind:"text",value:"Δ हिंदी"});
  assert.throws(()=>parseResponse("TRUE_FALSE",{kind:"boolean",value:"false"}));
  assert.throws(()=>parseResponse("MCQ",{kind:"choice",value:"Z"}));
  assert.throws(()=>parseResponse("MCQ",{kind:"choice",value:"A",correctAnswer:"A"}));
  assert.equal(parseResponse("FILL_BLANK",{kind:"text",value:"   "}),null);
});
