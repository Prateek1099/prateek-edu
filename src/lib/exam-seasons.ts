/** Cambridge CAIE examination sessions (consistent with public filters). */
export const CAMBRIDGE_EXAM_SESSIONS = [
  "Feb/March",
  "May/June",
  "Oct/Nov",
] as const;

export type CambridgeExamSession = (typeof CAMBRIDGE_EXAM_SESSIONS)[number];
