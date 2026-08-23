import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  buildSearchContext,
  createEmptyPublicSearchGroups,
  expandSearchTerms,
  isResourceIntent,
  normalizeSearchText,
  rankPublicSearchResults,
  type PublicSearchCandidate,
  type PublicSearchResponse,
} from "@/lib/public-search";

const RESULT_LIMIT = 5;
const QUERY_CANDIDATE_LIMIT = 20;
const PUBLIC_PRACTICE_TYPES = ["CHALLENGE", "QUICK_PRACTICE"];
const PUBLIC_WORKSHEET_TYPES = ["WORKSHEET", "PDF_WORKSHEET"];
const PUBLIC_CHALLENGE_TYPES = [...PUBLIC_PRACTICE_TYPES, ...PUBLIC_WORKSHEET_TYPES];

function contains(value: string) {
  return { contains: value, mode: "insensitive" as const };
}

function subjectPath(subject: {
  slug: string;
  qualification: { name: string; board: { name: string } };
}) {
  return `/resources/${subject.qualification.board.name}/${subject.qualification.name}/${subject.slug}`;
}

function publicSubjectContext(subject: {
  name: string;
  qualification: { title: string; board: { title: string } };
}, topicName?: string | null) {
  return buildSearchContext(
    subject.qualification.board.title,
    subject.qualification.title,
    subject.name,
    topicName,
  );
}

export async function GET(request: Request) {
  const rawQuery = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const normalizedQuery = normalizeSearchText(rawQuery);
  const emptyResponse: PublicSearchResponse = {
    query: normalizedQuery,
    groups: createEmptyPublicSearchGroups(),
  };

  if (normalizedQuery.length < 2) return NextResponse.json(emptyResponse);

  const terms = expandSearchTerms(normalizedQuery);
  const values = terms.map((term) => term.value);
  const wantsWorksheets = isResourceIntent(normalizedQuery, "worksheet");
  const wantsTopicals = isResourceIntent(normalizedQuery, "topical");
  const wantsChallenges = isResourceIntent(normalizedQuery, "challenge");

  try {
    const [
      boards,
      qualifications,
      subjects,
      topics,
      notes,
      topicals,
      challengeResources,
      courses,
    ] = await Promise.all([
      prisma.board.findMany({
        where: {
          status: "PUBLISHED",
          OR: values.flatMap((value) => [
            { name: contains(value) },
            { title: contains(value) },
          ]),
        },
        select: { id: true, name: true, title: true },
        take: QUERY_CANDIDATE_LIMIT,
      }),
      prisma.qualification.findMany({
        where: {
          status: "PUBLISHED",
          board: { status: "PUBLISHED" },
          OR: values.flatMap((value) => [
            { name: contains(value) },
            { title: contains(value) },
          ]),
        },
        select: {
          id: true,
          name: true,
          title: true,
          board: { select: { name: true, title: true } },
        },
        take: QUERY_CANDIDATE_LIMIT,
      }),
      prisma.subject.findMany({
        where: {
          status: "PUBLISHED",
          qualification: { status: "PUBLISHED", board: { status: "PUBLISHED" } },
          OR: values.flatMap((value) => [
            { name: contains(value) },
            { code: contains(value) },
          ]),
        },
        select: {
          id: true,
          name: true,
          code: true,
          slug: true,
          qualification: {
            select: {
              name: true,
              title: true,
              board: { select: { name: true, title: true } },
            },
          },
        },
        take: QUERY_CANDIDATE_LIMIT,
      }),
      prisma.topic.findMany({
        where: {
          status: "PUBLISHED",
          subject: {
            status: "PUBLISHED",
            qualification: { status: "PUBLISHED", board: { status: "PUBLISHED" } },
          },
          AND: [
            {
              OR: values.flatMap((value) => [
                { topicName: contains(value) },
                { description: contains(value) },
              ]),
            },
            {
              OR: [
                { notes: { some: { isPublished: true } } },
                { topicalQuestions: { some: { isPublished: true } } },
                {
                  challenges: {
                    some: {
                      isPublished: true,
                      workspaceId: null,
                      OR: [
                        { type: { in: PUBLIC_WORKSHEET_TYPES } },
                        {
                          type: { in: PUBLIC_PRACTICE_TYPES },
                          questions: { some: {} },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          ],
        },
        select: {
          id: true,
          topicName: true,
          description: true,
          _count: {
            select: {
              notes: { where: { isPublished: true } },
              topicalQuestions: { where: { isPublished: true } },
              challenges: {
                where: {
                  isPublished: true,
                  workspaceId: null,
                  OR: [
                    { type: { in: PUBLIC_WORKSHEET_TYPES } },
                    {
                      type: { in: PUBLIC_PRACTICE_TYPES },
                      questions: { some: {} },
                    },
                  ],
                },
              },
            },
          },
          subject: {
            select: {
              name: true,
              slug: true,
              qualification: {
                select: {
                  name: true,
                  title: true,
                  board: { select: { name: true, title: true } },
                },
              },
            },
          },
        },
        take: QUERY_CANDIDATE_LIMIT,
      }),
      prisma.note.findMany({
        where: {
          isPublished: true,
          subject: {
            status: "PUBLISHED",
            qualification: { status: "PUBLISHED", board: { status: "PUBLISHED" } },
          },
          OR: values.flatMap((value) => [
            { title: contains(value) },
            { content: contains(value) },
            { topic: { status: "PUBLISHED", topicName: contains(value) } },
          ]),
        },
        select: {
          id: true,
          title: true,
          content: true,
          noteType: true,
          topic: { select: { topicName: true, status: true } },
          subject: {
            select: {
              name: true,
              slug: true,
              qualification: {
                select: {
                  name: true,
                  title: true,
                  board: { select: { name: true, title: true } },
                },
              },
            },
          },
        },
        take: QUERY_CANDIDATE_LIMIT,
      }),
      prisma.topicalQuestion.findMany({
        where: {
          isPublished: true,
          subject: {
            status: "PUBLISHED",
            qualification: { status: "PUBLISHED", board: { status: "PUBLISHED" } },
          },
          ...(wantsTopicals
            ? {}
            : {
                OR: values.flatMap((value) => [
                  { title: contains(value) },
                  { description: contains(value) },
                  { topic: { status: "PUBLISHED", topicName: contains(value) } },
                ]),
              }),
        },
        select: {
          id: true,
          title: true,
          description: true,
          topic: { select: { topicName: true, status: true } },
          subject: {
            select: {
              name: true,
              slug: true,
              qualification: {
                select: {
                  name: true,
                  title: true,
                  board: { select: { name: true, title: true } },
                },
              },
            },
          },
        },
        take: QUERY_CANDIDATE_LIMIT,
      }),
      prisma.challenge.findMany({
        where: {
          isPublished: true,
          workspaceId: null,
          type: { in: PUBLIC_CHALLENGE_TYPES },
          subject: {
            status: "PUBLISHED",
            qualification: { status: "PUBLISHED", board: { status: "PUBLISHED" } },
          },
          AND: [
            {
              OR: [
                ...values.flatMap((value) => [
                  { title: contains(value) },
                  { topic: { status: "PUBLISHED", topicName: contains(value) } },
                ]),
                ...(wantsWorksheets ? [{ type: { in: PUBLIC_WORKSHEET_TYPES } }] : []),
                ...(wantsChallenges ? [{ type: { in: PUBLIC_PRACTICE_TYPES } }] : []),
              ],
            },
            {
              OR: [
                { type: { in: PUBLIC_WORKSHEET_TYPES } },
                {
                  type: { in: PUBLIC_PRACTICE_TYPES },
                  questions: { some: {} },
                },
              ],
            },
          ],
        },
        select: {
          id: true,
          title: true,
          type: true,
          difficulty: true,
          topic: { select: { topicName: true, status: true } },
          subject: {
            select: {
              name: true,
              slug: true,
              qualification: {
                select: {
                  name: true,
                  title: true,
                  board: { select: { name: true, title: true } },
                },
              },
            },
          },
        },
        take: QUERY_CANDIDATE_LIMIT * 2,
      }),
      prisma.course.findMany({
        where: {
          isPublished: true,
          subject: {
            status: "PUBLISHED",
            qualification: { status: "PUBLISHED", board: { status: "PUBLISHED" } },
          },
          OR: values.flatMap((value) => [
            { title: contains(value) },
            { shortDescription: contains(value) },
            { description: contains(value) },
            { subject: { name: contains(value) } },
          ]),
        },
        select: {
          id: true,
          title: true,
          slug: true,
          shortDescription: true,
          description: true,
          subject: {
            select: {
              name: true,
              qualification: {
                select: {
                  title: true,
                  board: { select: { name: true, title: true } },
                },
              },
            },
          },
        },
        take: QUERY_CANDIDATE_LIMIT,
      }),
    ]);

    const preference = (await cookies()).get("examnest_ecosystem")?.value;
    let preferredBoard = "";
    if (preference) {
      try {
        const parsed = JSON.parse(preference) as { board?: unknown };
        if (typeof parsed.board === "string") preferredBoard = parsed.board;
      } catch {
        // A malformed preference must never block public search.
      }
    }

    const academicCandidates: PublicSearchCandidate[] = [
      ...boards.map((board) => ({
        id: board.id,
        type: "BOARD" as const,
        title: board.title,
        context: "Academic ecosystem",
        href: `/resources/${board.name}`,
        searchText: [board.name, board.title, "board ecosystem"],
        boardName: board.name,
      })),
      ...qualifications.map((qualification) => ({
        id: qualification.id,
        type: "QUALIFICATION" as const,
        title: qualification.title,
        context: buildSearchContext(qualification.board.title, "Qualification / class"),
        href: `/resources/${qualification.board.name}/${qualification.name}`,
        searchText: [qualification.name, qualification.title, "qualification class"],
        boardName: qualification.board.name,
      })),
      ...subjects.map((subject) => ({
        id: subject.id,
        type: "SUBJECT" as const,
        title: subject.name,
        context: buildSearchContext(
          subject.qualification.board.title,
          subject.qualification.title,
          subject.code ? `Subject code ${subject.code}` : "Subject",
        ),
        href: subjectPath(subject),
        searchText: [subject.name, subject.code, "subject"],
        boardName: subject.qualification.board.name,
      })),
    ];

    const topicCandidates: PublicSearchCandidate[] = topics.map((topic) => ({
      id: topic.id,
      type: "TOPIC",
      title: topic.topicName,
      context: publicSubjectContext(topic.subject),
      href: subjectPath(topic.subject),
      searchText: [topic.topicName, topic.description, "topic chapter"],
      boardName: topic.subject.qualification.board.name,
      qualityBoost: Math.min(
        (topic._count.notes + topic._count.topicalQuestions + topic._count.challenges) * 5,
        25,
      ),
    }));

    const noteCandidates: PublicSearchCandidate[] = notes.map((note) => {
      const topicName = note.topic?.status === "PUBLISHED" ? note.topic.topicName : null;
      return {
        id: note.id,
        type: "NOTE",
        title: note.title,
        context: publicSubjectContext(note.subject, topicName),
        href: `${subjectPath(note.subject)}/notes/${note.id}`,
        searchText: [note.title, note.content, topicName, note.noteType, "note notes notebook work study notes"],
        boardName: note.subject.qualification.board.name,
      };
    });

    const topicalCandidates: PublicSearchCandidate[] = topicals.map((topical) => {
      const topicName = topical.topic?.status === "PUBLISHED" ? topical.topic.topicName : null;
      return {
        id: topical.id,
        type: "TOPICAL_QUESTION",
        title: topical.title,
        context: publicSubjectContext(topical.subject, topicName),
        href: `${subjectPath(topical.subject)}/topical/${topical.id}`,
        searchText: [topical.title, topical.description, topicName, "topical question topical questions question pack question packs"],
        boardName: topical.subject.qualification.board.name,
      };
    });

    const worksheetCandidates: PublicSearchCandidate[] = [];
    const practiceCandidates: PublicSearchCandidate[] = [];
    for (const challenge of challengeResources) {
      const topicName = challenge.topic?.status === "PUBLISHED" ? challenge.topic.topicName : null;
      const isWorksheet = challenge.type === "WORKSHEET" || challenge.type === "PDF_WORKSHEET";
      const basePath = subjectPath(challenge.subject);
      const candidate: PublicSearchCandidate = {
        id: challenge.id,
        type: isWorksheet ? "WORKSHEET" : "PRACTICE_CHALLENGE",
        title: challenge.title,
        context: publicSubjectContext(challenge.subject, topicName),
        href: `${basePath}/${isWorksheet ? "worksheet" : "challenge"}/${challenge.id}`,
        searchText: [
          challenge.title,
          topicName,
          challenge.difficulty,
          isWorksheet
            ? "worksheet worksheets assignment assignments"
            : "practice challenge practice challenges quick practice challenge challenges",
        ],
        boardName: challenge.subject.qualification.board.name,
      };
      (isWorksheet ? worksheetCandidates : practiceCandidates).push(candidate);
    }

    const courseCandidates: PublicSearchCandidate[] = courses.map((course) => ({
      id: course.id,
      type: "COURSE",
      title: course.title,
      context: publicSubjectContext(course.subject),
      href: `/courses/${course.slug}`,
      searchText: [course.title, course.shortDescription, course.description, course.subject.name, "course courses"],
      boardName: course.subject.qualification.board.name,
    }));

    const response: PublicSearchResponse = {
      query: normalizedQuery,
      groups: {
        notes: rankPublicSearchResults(noteCandidates, terms, preferredBoard, RESULT_LIMIT),
        topicals: rankPublicSearchResults(topicalCandidates, terms, preferredBoard, RESULT_LIMIT),
        worksheets: rankPublicSearchResults(worksheetCandidates, terms, preferredBoard, RESULT_LIMIT),
        challenges: rankPublicSearchResults(practiceCandidates, terms, preferredBoard, RESULT_LIMIT),
        topics: rankPublicSearchResults(topicCandidates, terms, preferredBoard, RESULT_LIMIT),
        subjects: rankPublicSearchResults(academicCandidates, terms, preferredBoard, RESULT_LIMIT),
        courses: rankPublicSearchResults(courseCandidates, terms, preferredBoard, RESULT_LIMIT),
      },
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (error) {
    console.error("Public search API failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
