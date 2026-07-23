import { prisma } from "@/lib/prisma";

export type StudentSubjectOption = {
  id: string;
  name: string;
  code: string | null;
  qualification: string;
  board: string;
  topics: { id: string; name: string }[];
};

export async function getStudentSubjectOptions(userId: string): Promise<StudentSubjectOption[]> {
  const [user, classMemberships, enrollments, topicProgress] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { preferredBoard: true, preferredQualification: true },
    }),
    prisma.classStudent.findMany({
      where: { studentId: userId, status: "ACTIVE", class: { subjectId: { not: null } } },
      select: { class: { select: { subject: { select: { id: true } } } } },
    }),
    prisma.enrollment.findMany({
      where: { userId, paymentStatus: "completed" },
      select: { course: { select: { subjectId: true } } },
    }),
    prisma.userTopicProgress.findMany({
      where: { userId },
      select: { topic: { select: { subjectId: true } } },
    }),
  ]);

  const subjectIds = new Set<string>();
  for (const membership of classMemberships) {
    if (membership.class.subject) subjectIds.add(membership.class.subject.id);
  }
  for (const enrollment of enrollments) subjectIds.add(enrollment.course.subjectId);
  for (const progress of topicProgress) subjectIds.add(progress.topic.subjectId);

  const preferenceFilter = user?.preferredBoard && user.preferredQualification
    ? { qualification: { name: user.preferredQualification, board: { name: user.preferredBoard } } }
    : undefined;

  const subjects = await prisma.subject.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        ...(subjectIds.size > 0 ? [{ id: { in: [...subjectIds] } }] : []),
        ...(preferenceFilter ? [preferenceFilter] : []),
      ],
    },
    select: {
      id: true,
      name: true,
      code: true,
      qualification: { select: { title: true, board: { select: { title: true } } } },
      topics: {
        where: { status: "PUBLISHED" },
        orderBy: { sortOrder: "asc" },
        select: { id: true, topicName: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    code: subject.code,
    qualification: subject.qualification.title,
    board: subject.qualification.board.title,
    topics: subject.topics.map((topic) => ({ id: topic.id, name: topic.topicName })),
  }));
}
