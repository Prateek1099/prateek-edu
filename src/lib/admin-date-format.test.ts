import assert from "node:assert/strict";
import test from "node:test";

import { formatAdminDate, formatAdminDateTime } from "./admin-date-format";

test("admin dates render deterministically in India time", () => {
  const timestamp = "2026-08-22T11:56:01.000Z";

  assert.equal(formatAdminDate(timestamp), "22/08/2026");
  assert.equal(formatAdminDateTime(timestamp), "22/08/2026, 17:26:01");
  assert.equal(formatAdminDateTime(new Date(timestamp)), "22/08/2026, 17:26:01");
});

test("admin date formatting handles day rollover without using the host locale", () => {
  assert.equal(formatAdminDateTime("2026-08-22T20:00:00.000Z"), "23/08/2026, 01:30:00");
});

test("invalid admin dates use a stable fallback", () => {
  assert.equal(formatAdminDate("not-a-date"), "—");
  assert.equal(formatAdminDateTime("not-a-date"), "—");
});
