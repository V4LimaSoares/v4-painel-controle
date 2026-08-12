import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMonthlyGoalRecord,
  buildWeeklyGoalSnapshots,
  defaultGoalSettings,
  distributeIntegerTarget,
  dynamicDailyTarget,
} from "../app/commercial-goals.ts";

test("distributes integer remainders without changing the monthly total", () => {
  assert.deepEqual(distributeIntegerTarget(10, [1, 1, 1, 1, 1]), [2, 2, 2, 2, 2]);
  assert.equal(distributeIntegerTarget(3, [5, 5, 5, 5]).reduce((sum, item) => sum + item, 0), 3);
  assert.deepEqual(distributeIntegerTarget(0, [5, 5, 5]), [0, 0, 0]);
});

test("calculates February leap-year workdays and weekly snapshots", () => {
  const record = buildMonthlyGoalRecord({
    referenceMonth: "2024-02",
    targets: { mql: 100, sql: 60, sal: 30, logo: 3 },
    settings: defaultGoalSettings,
    now: new Date("2024-02-10T12:00:00"),
  });
  assert.equal(record.workDays, 21);
  assert.equal(record.weeklySnapshots.reduce((sum, week) => sum + week.targets.mql, 0), 100);
  assert.equal(record.weeklySnapshots.reduce((sum, week) => sum + week.targets.logo, 0), 3);
});

test("does not move a month target into the next month when weeks cross months", () => {
  const weeks = buildWeeklyGoalSnapshots("2026-08", { mql: 100, sql: 60, sal: 30, logo: 10 }, defaultGoalSettings);
  const last = weeks.at(-1);
  assert.equal(last?.periodLabel, "31/08 - 06/09");
  assert.equal(last?.workDays, 1);
  assert.equal(weeks.reduce((sum, week) => sum + week.targets.mql, 0), 100);
});

test("rounds dynamic daily target up and never returns negative values", () => {
  assert.equal(dynamicDailyTarget(25, 14, 2), 6);
  assert.equal(dynamicDailyTarget(25, 30, 2), 0);
});
