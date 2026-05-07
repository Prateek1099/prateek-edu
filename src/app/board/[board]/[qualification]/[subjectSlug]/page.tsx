import { redirect } from "next/navigation";

export default async function SubjectRootPage({
  params,
}: {
  params: Promise<{ board: string; qualification: string; subjectSlug: string }>;
}) {
  const { board, qualification, subjectSlug } = await params;
  redirect(`/board/${board}/${qualification}/${subjectSlug}/papers`);
}
