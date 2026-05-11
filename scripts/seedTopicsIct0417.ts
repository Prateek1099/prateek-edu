/**
 * Seeds curriculum topics for IGCSE ICT (0417) so admins can attach notes/PDFs by topic.
 *
 * Run after `npx prisma db push` (adds `sort_order` on topics):
 *   npm run seed:topics-ict-0417
 */
import 'dotenv/config';
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { prisma } from "../src/lib/prisma";
import { syncIgcseIct0417TopicsForSubject } from "./lib/syncIgcseIct0417Topics";

async function main() {
  const subject =
    (await prisma.subject.findFirst({ where: { slug: "ict-0417" } })) ??
    (await prisma.subject.findFirst({ where: { code: "0417" } }));

  if (!subject) {
    console.error(
      'No subject found with slug "ict-0417" or code "0417". Create the ICT subject first (e.g. scripts/seedPaper.ts).'
    );
    process.exit(1);
  }

  console.log(`Using subject: ${subject.name} (${subject.code ?? "no code"}) — ${subject.slug}`);

  const { created, updated } = await syncIgcseIct0417TopicsForSubject(prisma, subject.id);
  console.log(`Topics synced: ${created} created, ${updated} updated (sort order refreshed).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
