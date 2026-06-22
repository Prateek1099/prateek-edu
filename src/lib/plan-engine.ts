import { prisma } from "@/lib/prisma";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GeneratedTask {
  title: string;
  subject: string;
  topic: string;
  type: "NOTE_REVISION" | "CHALLENGE" | "PAST_PAPER" | "TOPICAL" | "MISTAKE_REVIEW";
  priority: "HIGH" | "MEDIUM" | "LOW";
  dueDate: Date;
  source: string;
  sourceDetail: string;
  linkUrl: string | null;
  linkLabel: string | null;
}

interface PrioritizedTopic {
  topicName: string;
  subjectName: string;
  subjectSlug: string;
  board: string;
  qualification: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  source: string;
  sourceDetail: string;
  mistakeCount: number;
  challengeScore: number | null;
  challengeId: string | null;
  hasNotes: boolean;
  hasChallenge: boolean;
  isStudied: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maps studyDuration (minutes) → number of tasks per study day */
const TASKS_PER_DAY: Record<number, number> = {
  30: 2,
  45: 3,
  60: 4,
  90: 5,
};

/** Days to leave as buffer before exam for final revision */
const EXAM_BUFFER_DAYS = 3;

// ─── Main Function ───────────────────────────────────────────────────────────

/**
 * Generates revision tasks for a user's plan.
 * Deletes all existing PENDING tasks first, then creates fresh ones.
 */
export async function generateRevisionTasks(
  userId: string,
  planId: string,
  board: string,
  qualification: string,
  examDate: Date,
  studyDaysPerWeek: number,
  studyDuration: number
): Promise<void> {
  // ── Step A: Fetch all relevant user data ─────────────────────────────────

  const [
    mistakesByTopic,
    challengeAttempts,
    userTopicProgress,
    subjects,
  ] = await Promise.all([
    // Mistakes grouped by topicTag (only unrevised)
    prisma.mistakeEntry.findMany({
      where: { userId, status: "needs_revision" },
      select: {
        topicTag: true,
        challenge: {
          select: {
            subject: {
              select: {
                name: true,
                slug: true,
                qualification: {
                  select: {
                    name: true,
                    board: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),

    // Latest challenge attempts per challenge
    prisma.challengeAttempt.findMany({
      where: { userId },
      select: {
        challengeId: true,
        percentage: true,
        completedAt: true,
        challenge: {
          select: {
            title: true,
            topicId: true,
            topic: { select: { topicName: true } },
            subject: {
              select: {
                name: true,
                slug: true,
                qualification: {
                  select: {
                    name: true,
                    board: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { completedAt: "desc" },
    }),

    // User's topic progress
    prisma.userTopicProgress.findMany({
      where: { userId },
      select: {
        topicId: true,
        completed: true,
        topic: {
          select: {
            topicName: true,
            subject: {
              select: {
                name: true,
                slug: true,
                qualification: {
                  select: {
                    name: true,
                    board: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),

    // All subjects for the board/qualification with their topics, notes, and challenges
    prisma.subject.findMany({
      where: {
        qualification: {
          name: qualification,
          board: { name: board },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        topics: {
          select: {
            id: true,
            topicName: true,
            notes: { select: { id: true }, take: 1 },
            challenges: {
              where: { isPublished: true },
              select: { id: true },
              take: 1,
            },
          },
        },
        qualification: {
          select: {
            name: true,
            board: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  // ── Step B: Build priority-scored topic list ─────────────────────────────

  // Aggregate mistakes by topicTag
  const mistakeCounts = new Map<string, { count: number; subjectName: string; subjectSlug: string; board: string; qualification: string }>();
  for (const m of mistakesByTopic) {
    const tag = m.topicTag || "Unknown";
    const existing = mistakeCounts.get(tag);
    if (existing) {
      existing.count += 1;
    } else {
      mistakeCounts.set(tag, {
        count: 1,
        subjectName: m.challenge.subject.name,
        subjectSlug: m.challenge.subject.slug,
        board: m.challenge.subject.qualification.board.name,
        qualification: m.challenge.subject.qualification.name,
      });
    }
  }

  // Get latest score per challenge (dedup: keep first = most recent due to ordering)
  const latestScores = new Map<string, { percentage: number; challengeId: string; topicName: string; subjectName: string; subjectSlug: string; board: string; qualification: string }>();
  for (const a of challengeAttempts) {
    if (!latestScores.has(a.challengeId)) {
      latestScores.set(a.challengeId, {
        percentage: a.percentage,
        challengeId: a.challengeId,
        topicName: a.challenge.topic?.topicName || a.challenge.title,
        subjectName: a.challenge.subject.name,
        subjectSlug: a.challenge.subject.slug,
        board: a.challenge.subject.qualification.board.name,
        qualification: a.challenge.subject.qualification.name,
      });
    }
  }

  // Track studied topic IDs
  const studiedTopicIds = new Set(
    userTopicProgress.filter((p) => p.completed).map((p) => p.topicId)
  );

  // Build unified topic list from all subjects/topics
  const topicMap = new Map<string, PrioritizedTopic>();

  // Seed all topics from subjects
  for (const subj of subjects) {
    for (const topic of subj.topics) {
      const key = `${subj.slug}::${topic.topicName}`;
      if (!topicMap.has(key)) {
        topicMap.set(key, {
          topicName: topic.topicName,
          subjectName: subj.name,
          subjectSlug: subj.slug,
          board: subj.qualification.board.name,
          qualification: subj.qualification.name,
          priority: "LOW",
          source: "General Revision",
          sourceDetail: "Scheduled revision",
          mistakeCount: 0,
          challengeScore: null,
          challengeId: null,
          hasNotes: topic.notes.length > 0,
          hasChallenge: topic.challenges.length > 0,
          isStudied: studiedTopicIds.has(topic.id),
        });
      }
    }
  }

  // Overlay mistake data
  for (const [topicTag, data] of mistakeCounts) {
    // Find matching topic in the map
    const matchKey = Array.from(topicMap.keys()).find((k) => k.endsWith(`::${topicTag}`));
    if (matchKey) {
      const topic = topicMap.get(matchKey)!;
      topic.mistakeCount = data.count;
      if (data.count >= 3) {
        topic.priority = "HIGH";
        topic.source = "Mistake Book";
        topic.sourceDetail = `${data.count} mistakes`;
      } else if (data.count >= 1) {
        // 1-2 mistakes → MEDIUM (unless already HIGH from challenge score)
        if (topic.priority !== "HIGH") {
          topic.priority = "MEDIUM";
          topic.source = "Mistake Book";
          topic.sourceDetail = `${data.count} mistake${data.count > 1 ? "s" : ""}`;
        }
      }
    } else {
      // Topic not in subjects (edge case: topicTag doesn't match a known topic)
      // Create an entry anyway with whatever info we have
      const fallbackKey = `${data.subjectSlug}::${topicTag}`;
      topicMap.set(fallbackKey, {
        topicName: topicTag,
        subjectName: data.subjectName,
        subjectSlug: data.subjectSlug,
        board: data.board,
        qualification: data.qualification,
        priority: data.count >= 3 ? "HIGH" : "MEDIUM",
        source: "Mistake Book",
        sourceDetail: `${data.count} mistake${data.count > 1 ? "s" : ""}`,
        mistakeCount: data.count,
        challengeScore: null,
        challengeId: null,
        hasNotes: false,
        hasChallenge: false,
        isStudied: false,
      });
    }
  }

  // Overlay challenge score data
  for (const [, data] of latestScores) {
    const matchKey = Array.from(topicMap.keys()).find((k) => k.endsWith(`::${data.topicName}`));
    if (matchKey) {
      const topic = topicMap.get(matchKey)!;
      topic.challengeScore = data.percentage;
      topic.challengeId = data.challengeId;
      if (data.percentage < 50) {
        topic.priority = "HIGH";
        topic.source = "Challenge Score";
        topic.sourceDetail = `Score: ${Math.round(data.percentage)}%`;
      } else if (data.percentage < 75 && topic.priority !== "HIGH") {
        topic.priority = "MEDIUM";
        topic.source = "Challenge Score";
        topic.sourceDetail = `Score: ${Math.round(data.percentage)}%`;
      }
    }
  }

  // Mark unstudied topics as MEDIUM
  for (const [, topic] of topicMap) {
    if (!topic.isStudied && topic.priority === "LOW") {
      topic.priority = "MEDIUM";
      topic.source = "Topic Progress";
      topic.sourceDetail = "Not started";
    }
  }

  // ── Step C: Calculate available study days ───────────────────────────────

  const studyDays = getStudyDays(new Date(), examDate, studyDaysPerWeek);

  if (studyDays.length === 0) {
    // No study days available — clear existing and return
    await prisma.revisionTask.deleteMany({
      where: { revisionPlanId: planId, status: "PENDING" },
    });
    return;
  }

  // ── Step D: Calculate tasks per day ──────────────────────────────────────

  const tasksPerDay = TASKS_PER_DAY[studyDuration] || 3;
  const totalSlots = studyDays.length * tasksPerDay;

  // ── Step E: Generate task sequences (priority order) ─────────────────────

  // Sort topics: HIGH first, then MEDIUM, then LOW
  const sortedTopics = Array.from(topicMap.values()).sort((a, b) => {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const taskQueue: Omit<GeneratedTask, "dueDate">[] = [];

  for (const topic of sortedTopics) {
    if (taskQueue.length >= totalSlots) break;

    const baseLinkUrl = `/resources/${topic.board}/${topic.qualification}/${topic.subjectSlug}`;

    // Build task sequence based on topic characteristics
    if (topic.mistakeCount > 0) {
      // Mistake topics: MISTAKE_REVIEW → NOTE_REVISION → CHALLENGE
      taskQueue.push({
        title: `Review mistakes: ${topic.topicName}`,
        subject: topic.subjectName,
        topic: topic.topicName,
        type: "MISTAKE_REVIEW",
        priority: topic.priority,
        source: topic.source,
        sourceDetail: topic.sourceDetail,
        linkUrl: "/dashboard/mistakes",
        linkLabel: "Open Mistake Book",
      });

      if (topic.hasNotes) {
        taskQueue.push({
          title: `Revise notes: ${topic.topicName}`,
          subject: topic.subjectName,
          topic: topic.topicName,
          type: "NOTE_REVISION",
          priority: topic.priority,
          source: topic.source,
          sourceDetail: topic.sourceDetail,
          linkUrl: baseLinkUrl,
          linkLabel: "Open Notes",
        });
      }

      if (topic.hasChallenge && topic.challengeId) {
        taskQueue.push({
          title: `Challenge: ${topic.topicName}`,
          subject: topic.subjectName,
          topic: topic.topicName,
          type: "CHALLENGE",
          priority: topic.priority,
          source: topic.source,
          sourceDetail: topic.sourceDetail,
          linkUrl: `${baseLinkUrl}/challenge/${topic.challengeId}/attempt`,
          linkLabel: "Take Challenge",
        });
      }
    } else if (topic.challengeScore !== null && topic.challengeScore < 75) {
      // Low-score challenge topics: NOTE_REVISION → CHALLENGE
      if (topic.hasNotes) {
        taskQueue.push({
          title: `Revise notes: ${topic.topicName}`,
          subject: topic.subjectName,
          topic: topic.topicName,
          type: "NOTE_REVISION",
          priority: topic.priority,
          source: topic.source,
          sourceDetail: topic.sourceDetail,
          linkUrl: baseLinkUrl,
          linkLabel: "Open Notes",
        });
      }

      if (topic.challengeId) {
        taskQueue.push({
          title: `Re-attempt challenge: ${topic.topicName}`,
          subject: topic.subjectName,
          topic: topic.topicName,
          type: "CHALLENGE",
          priority: topic.priority,
          source: topic.source,
          sourceDetail: topic.sourceDetail,
          linkUrl: `${baseLinkUrl}/challenge/${topic.challengeId}/attempt`,
          linkLabel: "Take Challenge",
        });
      }
    } else if (!topic.isStudied) {
      // Unstudied topics: NOTE_REVISION → CHALLENGE (if available)
      if (topic.hasNotes) {
        taskQueue.push({
          title: `Study notes: ${topic.topicName}`,
          subject: topic.subjectName,
          topic: topic.topicName,
          type: "NOTE_REVISION",
          priority: topic.priority,
          source: topic.source,
          sourceDetail: topic.sourceDetail,
          linkUrl: baseLinkUrl,
          linkLabel: "Open Notes",
        });
      }

      if (topic.hasChallenge) {
        // Find any published challenge for this topic
        const challengeForTopic = await findChallengeForTopic(topic.subjectSlug, topic.topicName, board, qualification);
        if (challengeForTopic) {
          taskQueue.push({
            title: `Challenge: ${topic.topicName}`,
            subject: topic.subjectName,
            topic: topic.topicName,
            type: "CHALLENGE",
            priority: topic.priority,
            source: topic.source,
            sourceDetail: topic.sourceDetail,
            linkUrl: `${baseLinkUrl}/challenge/${challengeForTopic}/attempt`,
            linkLabel: "Take Challenge",
          });
        }
      }
    } else {
      // General revision: NOTE_REVISION or PAST_PAPER
      if (topic.hasNotes) {
        taskQueue.push({
          title: `Review: ${topic.topicName}`,
          subject: topic.subjectName,
          topic: topic.topicName,
          type: topic.priority === "LOW" ? "PAST_PAPER" : "NOTE_REVISION",
          priority: topic.priority,
          source: "General Revision",
          sourceDetail: "Scheduled revision",
          linkUrl: baseLinkUrl,
          linkLabel: topic.priority === "LOW" ? "Past Papers" : "Open Notes",
        });
      }
    }
  }

  // ── Step F: Distribute tasks across available days with variety ───────────

  const distributedTasks: GeneratedTask[] = distributeTasksAcrossDays(
    taskQueue,
    studyDays,
    tasksPerDay
  );

  // ── Step G: Persist — delete old PENDING tasks, create new ones ──────────

  await prisma.$transaction([
    prisma.revisionTask.deleteMany({
      where: { revisionPlanId: planId, status: "PENDING" },
    }),
    prisma.revisionTask.createMany({
      data: distributedTasks.map((task) => ({
        revisionPlanId: planId,
        title: task.title,
        subject: task.subject,
        topic: task.topic,
        type: task.type,
        priority: task.priority,
        dueDate: task.dueDate,
        source: task.source,
        sourceDetail: task.sourceDetail,
        linkUrl: task.linkUrl,
        linkLabel: task.linkLabel,
        status: "PENDING",
      })),
    }),
  ]);
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Calculates valid study days between now and examDate.
 * Respects studyDaysPerWeek (e.g., 5 = Mon-Fri, 6 = Mon-Sat, 7 = all).
 * Leaves EXAM_BUFFER_DAYS before the exam for final revision.
 */
function getStudyDays(
  startDate: Date,
  examDate: Date,
  studyDaysPerWeek: number
): Date[] {
  const days: Date[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  // Start from tomorrow
  current.setDate(current.getDate() + 1);

  // End date: examDate minus buffer
  const endDate = new Date(examDate);
  endDate.setDate(endDate.getDate() - EXAM_BUFFER_DAYS);
  endDate.setHours(23, 59, 59, 999);

  // Determine which days of week are study days
  // 5 = Mon-Fri (0=Sun excluded, 6=Sat excluded)
  // 6 = Mon-Sat (0=Sun excluded)
  // 7 = Every day
  const allowedDays = getAllowedWeekdays(studyDaysPerWeek);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (allowedDays.has(dayOfWeek)) {
      days.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return days;
}

/**
 * Maps studyDaysPerWeek to a Set of allowed JS weekday indices (0=Sun..6=Sat).
 */
function getAllowedWeekdays(studyDaysPerWeek: number): Set<number> {
  switch (studyDaysPerWeek) {
    case 1:
      return new Set([1]); // Monday only
    case 2:
      return new Set([1, 4]); // Mon, Thu
    case 3:
      return new Set([1, 3, 5]); // Mon, Wed, Fri
    case 4:
      return new Set([1, 2, 4, 5]); // Mon, Tue, Thu, Fri
    case 5:
      return new Set([1, 2, 3, 4, 5]); // Mon-Fri
    case 6:
      return new Set([1, 2, 3, 4, 5, 6]); // Mon-Sat
    case 7:
      return new Set([0, 1, 2, 3, 4, 5, 6]); // Every day
    default:
      return new Set([1, 2, 3, 4, 5]); // Default: Mon-Fri
  }
}

/**
 * Distributes tasks across study days ensuring variety.
 * Avoids placing consecutive tasks of the same type on the same day.
 */
function distributeTasksAcrossDays(
  taskQueue: Omit<GeneratedTask, "dueDate">[],
  studyDays: Date[],
  tasksPerDay: number
): GeneratedTask[] {
  const result: GeneratedTask[] = [];
  let taskIndex = 0;

  for (const day of studyDays) {
    if (taskIndex >= taskQueue.length) break;

    const dayTasks: Omit<GeneratedTask, "dueDate">[] = [];
    let lastType: string | null = null;

    // Try to fill this day's slots with variety
    let scanStart = taskIndex;
    while (dayTasks.length < tasksPerDay && scanStart < taskQueue.length) {
      // Look for a task that differs from the last assigned type
      let found = false;
      for (let i = scanStart; i < Math.min(scanStart + 10, taskQueue.length); i++) {
        if (i >= taskQueue.length) break;
        if (taskQueue[i].type !== lastType || dayTasks.length === 0) {
          dayTasks.push(taskQueue[i]);
          lastType = taskQueue[i].type;
          // Swap this task to the current position so we don't re-use it
          if (i !== scanStart) {
            [taskQueue[scanStart], taskQueue[i]] = [taskQueue[i], taskQueue[scanStart]];
          }
          scanStart++;
          found = true;
          break;
        }
      }
      // If no different type found, just take the next available
      if (!found) {
        if (scanStart < taskQueue.length) {
          dayTasks.push(taskQueue[scanStart]);
          lastType = taskQueue[scanStart].type;
          scanStart++;
        } else {
          break;
        }
      }
    }

    taskIndex = scanStart;

    // Assign dates to day tasks
    for (const task of dayTasks) {
      result.push({ ...task, dueDate: new Date(day) });
    }
  }

  return result;
}

/**
 * Finds a published challenge ID for a specific topic within a subject.
 */
async function findChallengeForTopic(
  subjectSlug: string,
  topicName: string,
  board: string,
  qualification: string
): Promise<string | null> {
  const challenge = await prisma.challenge.findFirst({
    where: {
      isPublished: true,
      topic: { topicName },
      subject: {
        slug: subjectSlug,
        qualification: {
          name: qualification,
          board: { name: board },
        },
      },
    },
    select: { id: true },
  });

  return challenge?.id ?? null;
}
