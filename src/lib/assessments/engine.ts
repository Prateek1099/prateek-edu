import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import { requireWorkspaceSubjectScope } from "@/lib/workspace-academic-scope";
import { AssessmentError, assignmentPolicy, buildAssessmentSnapshot, demand, idInput, parseResponse, serverDeadline } from "./rules";
import { studentAssessmentDto } from "./student-dto";

type Tx = Prisma.TransactionClient;
type Actor = { id:string };
export type AssignAssessmentInput = {
  versionId:string; classId:string; audience:"CLASS"|"SELECTED_STUDENTS"; studentIds?:string[];
  opensAt:string; closesAt:string; durationMinutes:number; attemptLimit:number;
};
const recipientInclude = { assignment:{include:{class:true, version:{include:{assessment:true}}}} } as const;
const versionInclude = {sections:{include:{questions:true}}} as const;

// This factory is internal/server-only. Production always supplies a session actor,
// never an actor/workspace from action arguments. Injection enables isolated DB tests.
export function createAssessmentEngine(db:PrismaClient, authenticatedActor:()=>Promise<Actor>) {
  async function transaction<T>(run:(tx:Tx)=>Promise<T>):Promise<T> {
    for(let retry=0;;retry++) {
      try { return await db.$transaction(run,{isolationLevel:"Serializable",maxWait:10000,timeout:20000}); }
      catch(error) {
        if(error instanceof Prisma.PrismaClientKnownRequestError) {
          // Prisma 7's pg adapter wraps serialization failures from raw FOR UPDATE
          // queries as P2010, while model writes normally report P2034. Both abort
          // the entire transaction, so retry from a fresh snapshot, never mid-tx.
          const adapter=error.meta?.driverAdapterError as {cause?:{originalCode?:string}}|undefined;
          const rawConflict=error.code==="P2010" && ["40001","40P01"].includes(adapter?.cause?.originalCode??"");
          if(["P2034","P2002"].includes(error.code)||rawConflict) {
            if(retry < 3) continue;
            throw new AssessmentError("LOCKED","This assessment changed concurrently. Please retry.");
          }
        }
        throw error;
      }
    }
  }
  async function now(tx:Tx) {
    const rows=await tx.$queryRaw<Array<{now:Date}>>`SELECT date_trunc('milliseconds', clock_timestamp() AT TIME ZONE 'UTC') AS now`;
    const clock = new Date(rows[0].now);
    demand(Number.isFinite(clock.getTime()), "LOCKED", "Assessment clock is unavailable.");
    return clock;
  }
  async function teacher(tx:Tx,actor:Actor) {
    const user=await tx.user.findUnique({where:{id:actor.id},include:{ownedWorkspace:true}});
    demand(user?.role === "TEACHER" && user.ownedWorkspace?.status === "ACTIVE", "FORBIDDEN","An active teacher workspace is required.");
    return {id:user.id,workspaceId:user.ownedWorkspace.id};
  }
  async function scope(tx:Tx,workspaceId:string,subjectId:string) {
    try { await requireWorkspaceSubjectScope(workspaceId,subjectId,tx); }
    catch { throw new AssessmentError("FORBIDDEN","This subject is not assigned to the active workspace."); }
  }
  async function recipient(tx:Tx,actor:Actor,recipientId:string) {
    idInput(recipientId);
    const user=await tx.user.findUnique({where:{id:actor.id},select:{role:true}});
    demand(user?.role === "STUDENT","FORBIDDEN","Only the assigned student may access this assessment.");
    const r=await tx.assessmentRecipient.findUnique({where:{id:recipientId},include:recipientInclude});
    demand(r && r.studentId === actor.id && !r.revokedAt && !r.assignment.cancelledAt,
      "FORBIDDEN","This assessment assignment is not available.");
    const a=r.assignment; const assessment=a.version.assessment;
    demand(a.class.status === "ACTIVE" && a.class.workspaceId === assessment.workspaceId &&
      a.class.subjectId === assessment.subjectId && a.version.publishedAt,
      "FORBIDDEN","The assessment class is not available.");
    const membership=await tx.classStudent.findUnique({where:{classId_studentId:{classId:a.classId,studentId:actor.id}}});
    demand(membership?.status === "ACTIVE","FORBIDDEN","Active class membership is required.");
    await scope(tx,assessment.workspaceId,assessment.subjectId);
    return r;
  }
  async function ownAttempt(tx:Tx,actor:Actor,attemptId:string) {
    idInput(attemptId);
    // Shared row lock serializes autosave/final-submit; the SQL response trigger
    // takes the same lock, including callers outside this service.
    await tx.$queryRaw`SELECT id FROM assessment_attempts WHERE id = ${attemptId} FOR UPDATE`;
    const attempt=await tx.assessmentAttempt.findUnique({where:{id:attemptId}});
    demand(attempt,"NOT_FOUND","Assessment attempt not found.");
    const r=await recipient(tx,actor,attempt.recipientId);
    demand(attempt.assignmentId === r.assignmentId && attempt.versionId === r.assignment.versionId,
      "FORBIDDEN","Assessment identity mismatch.");
    return {attempt,recipient:r};
  }
  const attemptSummary=(a:{id:string;attemptNumber:number;status:string;startedAt:Date;expiresAt:Date;submittedAt:Date|null}) =>
    ({id:a.id,attemptNumber:a.attemptNumber,status:a.status,startedAt:a.startedAt.toISOString(),expiresAt:a.expiresAt.toISOString(),submittedAt:a.submittedAt?.toISOString()??null});

  return {
    async createFromSavedPaper(sourceSavedPaperId:string) {
      idInput(sourceSavedPaperId); const actor=await authenticatedActor();
      return transaction(async tx=>{
        const owner=await teacher(tx,actor);
        const source=await tx.savedGeneratedPaper.findFirst({where:{id:sourceSavedPaperId,workspaceId:owner.workspaceId,archivedAt:null},
          include:{sections:{include:{questions:true}}}});
        demand(source?.subjectId,"NOT_FOUND","An active saved paper in your workspace is required.");
        await scope(tx,owner.workspaceId,source.subjectId);
        const subject=await tx.subject.findUnique({where:{id:source.subjectId},include:{qualification:true}});
        demand(subject && subject.qualificationId===source.qualificationId && subject.qualification.boardId===source.boardId,
          "INVALID_SOURCE","Saved academic scope is inconsistent.");
        const snapshot=buildAssessmentSnapshot(source); // Complete validation BEFORE first INSERT.
        const assessment=await tx.assessment.create({data:{
          workspaceId:owner.workspaceId,createdById:owner.id,subjectId:source.subjectId,sourceSavedPaperId:source.id,
          title:source.paperTitle || source.name,
        }});
        const version=await tx.assessmentVersion.create({data:{
          assessmentId:assessment.id,versionNumber:1,title:assessment.title,header:snapshot.header,
          totalMarks:snapshot.totalMarks,durationMinutes:snapshot.durationMinutes,
        }});
        for(const section of snapshot.sections) {
          const s=await tx.assessmentSection.create({data:{versionId:version.id,label:section.label,sortOrder:section.sortOrder}});
          await tx.assessmentQuestion.createMany({data:section.questions.map(q=>({...q,options:q.options as Prisma.InputJsonValue,versionId:version.id,sectionId:s.id}))});
        }
        await tx.assessmentVersion.update({where:{id:version.id},data:{publishedAt:await now(tx)}});
        return {assessmentId:assessment.id,versionId:version.id,totalMarks:snapshot.totalMarks};
      });
    },
    async assign(input:AssignAssessmentInput) {
      demand(input && typeof input==="object","INVALID_INPUT","Invalid assignment.");
      idInput(input.versionId);idInput(input.classId);
      demand(["CLASS","SELECTED_STUDENTS"].includes(input.audience),"INVALID_INPUT","Choose a valid audience.");
      const policy=assignmentPolicy(input);
      const actor=await authenticatedActor();
      return transaction(async tx=>{
        const owner=await teacher(tx,actor);
        const version=await tx.assessmentVersion.findUnique({where:{id:input.versionId},include:{assessment:true}});
        demand(version?.publishedAt && !version.assessment.archivedAt && version.assessment.workspaceId===owner.workspaceId,
          "FORBIDDEN","A published assessment in your workspace is required.");
        await scope(tx,owner.workspaceId,version.assessment.subjectId);
        const classRow=await tx.class.findFirst({where:{id:input.classId,workspaceId:owner.workspaceId,status:"ACTIVE",subjectId:version.assessment.subjectId}});
        demand(classRow,"FORBIDDEN","Choose an active class in this subject and workspace.");
        const members=await tx.classStudent.findMany({where:{classId:classRow.id,status:"ACTIVE",student:{role:"STUDENT"}},select:{studentId:true}});
        const ids=input.audience==="CLASS"?members.map(m=>m.studentId):input.studentIds;
        demand(Array.isArray(ids) && ids.length>0 && ids.length<=1000,"INVALID_INPUT","Select 1–1,000 active students.");
        ids.forEach(idInput);
        demand(new Set(ids).size===ids.length && ids.every(id=>members.some(m=>m.studentId===id)),
          "FORBIDDEN","Recipients must be unique active students in this class.");
        const clock=await now(tx);
        demand(policy.closesAt>clock,"WINDOW_CLOSED","The assessment closing time has passed.");
        const a=await tx.assessmentAssignment.create({data:{versionId:version.id,classId:classRow.id,assignedById:owner.id,audience:input.audience,...policy,assignedAt:clock}});
        await tx.assessmentRecipient.createMany({data:ids.map(studentId=>({assignmentId:a.id,studentId,assignedAt:clock}))});
        await tx.assessmentEvent.create({data:{assignmentId:a.id,actorId:actor.id,type:"ASSIGNED"}});
        return {assignmentId:a.id,recipientCount:ids.length};
      });
    },
    async cancel(assignmentId:string) {
      idInput(assignmentId);const actor=await authenticatedActor();
      return transaction(async tx=>{
        const owner=await teacher(tx,actor);
        const a=await tx.assessmentAssignment.findUnique({where:{id:assignmentId},include:{version:{include:{assessment:true}}}});
        demand(a && a.version.assessment.workspaceId===owner.workspaceId,"FORBIDDEN","Assignment not found in your workspace.");
        await scope(tx,owner.workspaceId,a.version.assessment.subjectId);
        if(!a.cancelledAt) {
          await tx.assessmentAssignment.update({where:{id:a.id},data:{cancelledAt:await now(tx)}});
          await tx.assessmentEvent.create({data:{assignmentId:a.id,actorId:actor.id,type:"CANCELLED"}});
        }
        return {cancelled:true};
      });
    },
    async revoke(recipientId:string) {
      idInput(recipientId);const actor=await authenticatedActor();
      return transaction(async tx=>{
        const owner=await teacher(tx,actor);
        const r=await tx.assessmentRecipient.findUnique({where:{id:recipientId},include:recipientInclude});
        demand(r && r.assignment.version.assessment.workspaceId===owner.workspaceId,"FORBIDDEN","Recipient not found in your workspace.");
        await scope(tx,owner.workspaceId,r.assignment.version.assessment.subjectId);
        if(!r.revokedAt) {
          await tx.assessmentRecipient.update({where:{id:r.id},data:{revokedAt:await now(tx)}});
          await tx.assessmentEvent.create({data:{assignmentId:r.assignmentId,actorId:actor.id,type:"RECIPIENT_REVOKED"}});
        }
        return {revoked:true};
      });
    },
    async start(recipientId:string,attemptNumber:number) {
      idInput(recipientId);
      demand(Number.isInteger(attemptNumber)&&attemptNumber>=1&&attemptNumber<=10,"INVALID_INPUT","A valid attempt number is required.");
      const actor=await authenticatedActor();
      return transaction(async tx=>{
        await tx.$queryRaw`SELECT id FROM assessment_recipients WHERE id = ${recipientId} FOR UPDATE`;
        const r=await recipient(tx,actor,recipientId);
        // Exact requested number is the idempotency key, including after submission.
        const existing=await tx.assessmentAttempt.findUnique({where:{recipientId_attemptNumber:{recipientId,attemptNumber}}});
        if(existing) return attemptSummary(existing);
        const previous=await tx.assessmentAttempt.findMany({where:{recipientId},orderBy:{attemptNumber:"desc"}});
        demand(!previous.some(a=>a.status==="IN_PROGRESS"),"LOCKED","Resume or submit the existing attempt first.");
        demand(attemptNumber===(previous[0]?.attemptNumber??0)+1 && attemptNumber<=r.assignment.attemptLimit,
          "ATTEMPT_LIMIT","The allowed attempt limit or sequence has been reached.");
        const clock=await now(tx);
        demand(clock>=r.assignment.opensAt && clock<r.assignment.closesAt,"WINDOW_CLOSED","The assessment is not open.");
        const a=await tx.assessmentAttempt.create({data:{recipientId,assignmentId:r.assignmentId,versionId:r.assignment.versionId,
          attemptNumber,startedAt:clock,expiresAt:serverDeadline(clock,r.assignment.durationMinutes,r.assignment.closesAt)}});
        const questions=await tx.assessmentQuestion.findMany({where:{versionId:a.versionId},select:{id:true}});
        await tx.assessmentResponse.createMany({data:questions.map(q=>({attemptId:a.id,versionId:a.versionId,questionId:q.id,value:Prisma.DbNull}))});
        await tx.assessmentEvent.create({data:{assignmentId:a.assignmentId,attemptId:a.id,actorId:actor.id,type:"ATTEMPT_STARTED"}});
        return attemptSummary(a);
      });
    },
    async delivery(attemptId:string) {
      const actor=await authenticatedActor();
      return transaction(async tx=>{
        const {attempt}=await ownAttempt(tx,actor,attemptId);const clock=await now(tx);
        demand(attempt.status==="IN_PROGRESS" && clock<attempt.expiresAt,"LOCKED","This attempt is closed.");
        const version=await tx.assessmentVersion.findUniqueOrThrow({where:{id:attempt.versionId},include:versionInclude});
        const responses=await tx.assessmentResponse.findMany({where:{attemptId:attempt.id}});
        return {attempt:attemptSummary(attempt),paper:studentAssessmentDto(version),responses:responses.map(r=>({
          questionId:r.questionId,state:r.state,revision:r.revision,value:parseResponse(
            version.sections.flatMap(s=>s.questions).find(q=>q.id===r.questionId)!.questionType,r.value),
        }))};
      });
    },
    async saveResponse(attemptId:string,questionId:string,expectedRevision:number,value:unknown) {
      idInput(questionId);
      demand(Number.isInteger(expectedRevision)&&expectedRevision>=0,"INVALID_INPUT","A response revision is required.");
      const actor=await authenticatedActor();
      return transaction(async tx=>{
        const {attempt}=await ownAttempt(tx,actor,attemptId);
        const clock=await now(tx);
        demand(attempt.status==="IN_PROGRESS" && clock<attempt.expiresAt,"LOCKED","This attempt is closed.");
        const q=await tx.assessmentQuestion.findFirst({where:{id:questionId,versionId:attempt.versionId}});
        demand(q,"FORBIDDEN","Question does not belong to this attempt.");
        const parsed=parseResponse(q.questionType,value);
        const result=await tx.assessmentResponse.updateMany({where:{attemptId:attempt.id,questionId,versionId:attempt.versionId,revision:expectedRevision},
          data:{value:parsed===null?Prisma.DbNull:parsed,state:parsed===null?"UNANSWERED":"ANSWERED",revision:{increment:1},savedAt:clock}});
        demand(result.count===1,"STALE_RESPONSE","This answer changed elsewhere. Reload before saving.");
        return {questionId,revision:expectedRevision+1,savedAt:clock.toISOString()};
      });
    },
    async submit(attemptId:string) {
      const actor=await authenticatedActor();
      return transaction(async tx=>{
        const {attempt}=await ownAttempt(tx,actor,attemptId);
        if(attempt.status!=="IN_PROGRESS") return attemptSummary(attempt);
        // Expired attempts can finalize saved evidence, but never accept late answers.
        const updated=await tx.assessmentAttempt.update({where:{id:attempt.id},data:{status:"SUBMITTED",submittedAt:await now(tx)}});
        await tx.assessmentEvent.create({data:{assignmentId:attempt.assignmentId,attemptId:attempt.id,actorId:actor.id,type:"ATTEMPT_SUBMITTED"}});
        return attemptSummary(updated);
      });
    },
  };
}
