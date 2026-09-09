import "server-only";

import { prisma } from "@/lib/prisma";
import { requireActiveWorkspace } from "@/lib/require-role";
import { requireWorkspaceSubjectScope } from "@/lib/workspace-academic-scope";
import { AssessmentError, buildObjectiveAssessmentSnapshot } from "./rules";

export async function getAssignOnlineContext(sourceSavedPaperId:string) {
  const teacher=await requireActiveWorkspace();
  const source=await prisma.savedGeneratedPaper.findFirst({
    where:{id:sourceSavedPaperId,workspaceId:teacher.workspaceId,archivedAt:null},
    include:{sections:{include:{questions:true}}},
  });
  if(!source?.subjectId) return null;
  await requireWorkspaceSubjectScope(teacher.workspaceId,source.subjectId);
  let blocker:string|null=null;
  let totalMarks=source.totalMarks;
  let questionCount=source.sections.reduce((count,section)=>count+section.questions.length,0);
  try {
    const snapshot=buildObjectiveAssessmentSnapshot(source);
    totalMarks=snapshot.totalMarks;
    questionCount=snapshot.sections.reduce((count,section)=>count+section.questions.length,0);
  } catch(error) {
    blocker=error instanceof AssessmentError?error.message:"This saved paper cannot be assigned online.";
  }
  const classes=await prisma.class.findMany({
    where:{workspaceId:teacher.workspaceId,subjectId:source.subjectId,status:"ACTIVE"},
    select:{id:true,name:true,academicYear:true,students:{where:{status:"ACTIVE",student:{role:"STUDENT"}},
      select:{student:{select:{id:true,name:true,email:true}}},orderBy:{enrolledAt:"asc"}}},
    orderBy:{name:"asc"},
  });
  return {paper:{id:source.id,title:source.paperTitle||source.name,subjectName:source.subjectNameSnapshot,
    totalMarks,questionCount,durationMinutes:source.durationMinutes},blocker,
    classes:classes.map(item=>({...item,students:item.students.map(row=>row.student)}))};
}

export async function listSavedPaperOnlineAssignments(sourceSavedPaperId:string) {
  const teacher=await requireActiveWorkspace();
  const source=await prisma.savedGeneratedPaper.findFirst({
    where:{id:sourceSavedPaperId,workspaceId:teacher.workspaceId},select:{id:true,subjectId:true},
  });
  if(!source?.subjectId) return [];
  await requireWorkspaceSubjectScope(teacher.workspaceId,source.subjectId);
  const assignments=await prisma.assessmentAssignment.findMany({
    where:{version:{assessment:{workspaceId:teacher.workspaceId,createdById:teacher.id,sourceSavedPaperId}}},
    select:{id:true,assignedAt:true,opensAt:true,closesAt:true,cancelledAt:true,
      class:{select:{name:true}},version:{select:{title:true}},_count:{select:{recipients:true}}},
    orderBy:{assignedAt:"desc"},
  });
  return assignments.map(item=>({id:item.id,title:item.version.title,className:item.class.name,
    recipientCount:item._count.recipients,assignedAt:item.assignedAt.toISOString(),opensAt:item.opensAt.toISOString(),
    closesAt:item.closesAt.toISOString(),cancelledAt:item.cancelledAt?.toISOString()??null}));
}
