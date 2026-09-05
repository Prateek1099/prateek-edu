import assert from "node:assert/strict";
import test from "node:test";

import {
  countPracticeSetAssignmentUsage,
  filterPracticeSets,
  getAssignmentRecipientGroup,
  getStudentAssignmentGroup,
  groupAssignmentRecipients,
  groupStudentAssignments,
  isPracticeSetAssigned,
  type AssignmentRecipientWorklistItem,
  type PracticeSetWorklistItem,
  type StudentAssignmentWorklistItem,
} from "@/lib/human-ui-density-rules";

function practice(
  overrides: Partial<PracticeSetWorklistItem> = {},
): PracticeSetWorklistItem {
  return {
    id: "practice-1",
    title: "SQL recap",
    subjectId: "subject-ip",
    topicId: "topic-sql",
    difficulty: "medium",
    assignedRecipientCount: 0,
    assignmentContexts: [],
    subject: { name: "Informatics Practices" },
    topic: { topicName: "Querying and SQL Functions" },
    ...overrides,
  };
}

const noFilters = {
  segment: "all" as const,
  searchQuery: "",
  classId: "all",
  subjectId: "all",
  topicId: "all",
  difficulty: "all",
};

test("practice-set assignment state comes from real recipient usage", () => {
  assert.equal(isPracticeSetAssigned(practice()), false);
  assert.equal(isPracticeSetAssigned(practice({ assignedRecipientCount: 1 })), true);
});

test("valid legacy and durable usage combine without duplicating the Practice Set", () => {
  const cases = [
    {
      name: "legacy assignment with active membership in an active current-workspace class",
      validLegacyAssignmentCount: 1,
      assignmentContexts: [],
      expected: 1,
    },
    {
      name: "legacy assignment with inactive membership",
      validLegacyAssignmentCount: 0,
      assignmentContexts: [],
      expected: 0,
    },
    {
      name: "legacy assignment with removed membership",
      validLegacyAssignmentCount: 0,
      assignmentContexts: [],
      expected: 0,
    },
    {
      name: "legacy assignment with inactive class",
      validLegacyAssignmentCount: 0,
      assignmentContexts: [],
      expected: 0,
    },
    {
      name: "legacy assignment outside the current workspace",
      validLegacyAssignmentCount: 0,
      assignmentContexts: [],
      expected: 0,
    },
    {
      name: "stale legacy row only",
      validLegacyAssignmentCount: 0,
      assignmentContexts: [],
      expected: 0,
    },
    {
      name: "valid legacy only",
      validLegacyAssignmentCount: 1,
      assignmentContexts: [],
      expected: 1,
    },
    {
      name: "valid durable assignment only",
      validLegacyAssignmentCount: 0,
      assignmentContexts: [
        { classId: "class-a", className: "Class A", recipientCount: 2 },
      ],
      expected: 2,
    },
    {
      name: "stale legacy plus valid durable",
      validLegacyAssignmentCount: 0,
      assignmentContexts: [
        { classId: "class-a", className: "Class A", recipientCount: 2 },
      ],
      expected: 2,
    },
    {
      name: "valid legacy plus valid durable",
      validLegacyAssignmentCount: 1,
      assignmentContexts: [
        { classId: "class-a", className: "Class A", recipientCount: 2 },
      ],
      expected: 3,
    },
    {
      name: "multiple valid durable class contexts",
      validLegacyAssignmentCount: 0,
      assignmentContexts: [
        { classId: "class-a", className: "Class A", recipientCount: 2 },
        { classId: "class-b", className: "Class B", recipientCount: 3 },
      ],
      expected: 5,
    },
    {
      name: "fully revoked or cancelled durable assignment plus stale legacy row",
      validLegacyAssignmentCount: 0,
      assignmentContexts: [],
      expected: 0,
    },
    {
      name: "selected-recipient durable assignment",
      validLegacyAssignmentCount: 0,
      assignmentContexts: [
        { classId: "class-a", className: "Class A", recipientCount: 1 },
      ],
      expected: 1,
    },
    {
      name: "another workspace assignment and membership",
      validLegacyAssignmentCount: 0,
      assignmentContexts: [],
      expected: 0,
    },
  ];

  for (const fixture of cases) {
    assert.equal(
      countPracticeSetAssignmentUsage(fixture),
      fixture.expected,
      fixture.name,
    );
  }
});

test("All, Assigned, and Unassigned segment eligible content without duplication", () => {
  const items = [
    practice({ id: "unassigned" }),
    practice({
      id: "assigned",
      assignedRecipientCount: 4,
      assignmentContexts: [{ classId: "class-12-ip", className: "Class 12 IP", recipientCount: 4 }],
    }),
  ];

  assert.deepEqual(filterPracticeSets(items, noFilters).map((item) => item.id), ["unassigned", "assigned"]);
  assert.deepEqual(filterPracticeSets(items, { ...noFilters, segment: "assigned" }).map((item) => item.id), ["assigned"]);
  assert.deepEqual(filterPracticeSets(items, { ...noFilters, segment: "unassigned" }).map((item) => item.id), ["unassigned"]);
});

test("class filtering returns one reusable set even when it has multiple class contexts", () => {
  const item = practice({
    assignedRecipientCount: 7,
    assignmentContexts: [
      { classId: "class-a", className: "Class 12 IP", recipientCount: 4 },
      { classId: "class-b", className: "Class 12 CS", recipientCount: 3 },
    ],
  });

  assert.deepEqual(filterPracticeSets([item], { ...noFilters, classId: "class-b" }).map((entry) => entry.id), ["practice-1"]);
  assert.deepEqual(filterPracticeSets([item], { ...noFilters, classId: "missing" }), []);
});

test("subject, topic, difficulty, and search filters compose", () => {
  const item = practice({
    assignedRecipientCount: 2,
    assignmentContexts: [{ classId: "class-a", className: "Senior IP", recipientCount: 2 }],
  });

  assert.equal(filterPracticeSets([item], {
    ...noFilters,
    subjectId: "subject-ip",
    topicId: "topic-sql",
    difficulty: "medium",
    searchQuery: "senior",
  }).length, 1);
  assert.equal(filterPracticeSets([item], { ...noFilters, difficulty: "hard" }).length, 0);
  assert.equal(filterPracticeSets([item], { ...noFilters, searchQuery: "pandas" }).length, 0);
});

function studentAssignment(
  overrides: Omit<Partial<StudentAssignmentWorklistItem>, "recipient"> & {
    recipient?: Partial<StudentAssignmentWorklistItem["recipient"]>;
  } = {},
): StudentAssignmentWorklistItem {
  return {
    id: overrides.id ?? "assignment-1",
    createdAt: overrides.createdAt ?? "2026-09-01T08:00:00.000Z",
    dueDate: overrides.dueDate ?? null,
    recipient: {
      status: "PENDING",
      attemptCount: 0,
      mistakesCount: 0,
      latestAttemptAt: null,
      completedAt: null,
      ...overrides.recipient,
    },
  };
}

test("student worklist groups use tracked completion and existing mistake signals only", () => {
  assert.equal(getStudentAssignmentGroup(studentAssignment()), "inProgress");
  assert.equal(getStudentAssignmentGroup(studentAssignment({ recipient: { status: "OVERDUE" } })), "needsAttention");
  assert.equal(getStudentAssignmentGroup(studentAssignment({ recipient: { status: "COMPLETED" } })), "completed");
  assert.equal(getStudentAssignmentGroup(studentAssignment({
    recipient: { status: "COMPLETED", attemptCount: 1, mistakesCount: 2 },
  })), "needsAttention");
  assert.equal(getStudentAssignmentGroup(studentAssignment({ recipient: { status: "MARKED_DONE" } })), "completed");
});

test("student worklist sorting prioritizes overdue, due-soon, and recent completion", () => {
  const groups = groupStudentAssignments([
    studentAssignment({ id: "pending-later", dueDate: "2026-09-10T00:00:00.000Z" }),
    studentAssignment({ id: "pending-sooner", dueDate: "2026-09-05T00:00:00.000Z" }),
    studentAssignment({ id: "mistakes", recipient: { status: "COMPLETED", mistakesCount: 1 } }),
    studentAssignment({ id: "overdue", recipient: { status: "OVERDUE" } }),
    studentAssignment({ id: "completed-old", recipient: { status: "COMPLETED", completedAt: "2026-09-01T00:00:00.000Z" } }),
    studentAssignment({ id: "completed-new", recipient: { status: "COMPLETED", completedAt: "2026-09-04T00:00:00.000Z" } }),
  ]);

  assert.deepEqual(groups.needsAttention.map((item) => item.id), ["overdue", "mistakes"]);
  assert.deepEqual(groups.inProgress.map((item) => item.id), ["pending-sooner", "pending-later"]);
  assert.deepEqual(groups.completed.map((item) => item.id), ["completed-new", "completed-old"]);
});

function recipient(
  overrides: Partial<AssignmentRecipientWorklistItem> = {},
): AssignmentRecipientWorklistItem {
  return {
    id: "recipient-1",
    status: "PENDING",
    attemptCount: 0,
    mistakesCount: 0,
    latestAttemptAt: null,
    completedAt: null,
    student: { name: "Prince", email: "prince@example.com" },
    ...overrides,
  };
}

test("assignment recipient segments are presentation-only derivations", () => {
  assert.equal(getAssignmentRecipientGroup(recipient()), "pending");
  assert.equal(getAssignmentRecipientGroup(recipient({ status: "OVERDUE" })), "needsAttention");
  assert.equal(getAssignmentRecipientGroup(recipient({ status: "COMPLETED" })), "completed");
  assert.equal(getAssignmentRecipientGroup(recipient({ status: "COMPLETED", mistakesCount: 1 })), "needsAttention");
});

test("assignment recipient groups preserve each recipient exactly once", () => {
  const items = [
    recipient({ id: "pending" }),
    recipient({ id: "overdue", status: "OVERDUE" }),
    recipient({ id: "completed", status: "COMPLETED" }),
    recipient({ id: "mistakes", status: "COMPLETED", mistakesCount: 2 }),
  ];
  const groups = groupAssignmentRecipients(items);
  const groupedIds = [...groups.needsAttention, ...groups.pending, ...groups.completed].map((item) => item.id);

  assert.equal(groupedIds.length, items.length);
  assert.equal(new Set(groupedIds).size, items.length);
  assert.deepEqual(groups.needsAttention.map((item) => item.id), ["overdue", "mistakes"]);
});
