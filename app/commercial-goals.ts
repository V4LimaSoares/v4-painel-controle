export type CommercialMetricKey = "mql" | "sql" | "sal" | "logo";

export type MetricTargets = Record<CommercialMetricKey, number>;

export type CommercialDailyRecord = {
  date: string;
  mql: number;
  sql: number;
  sal: number;
  logo: number;
  dialerMinutes: number;
  followUps: number;
};

export type CommercialGoalSettings = {
  weekdays: number[];
  distributionType: "proportional" | "linear";
  ignoreHolidays: boolean;
};

export type CommercialWeeklySnapshot = {
  id: string;
  referenceMonth: string;
  weekNumber: number;
  label: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  workDays: number;
  targets: MetricTargets;
};

export type CommercialMonthlyGoalRecord = {
  id: string;
  referenceMonth: string;
  targets: MetricTargets;
  workDays: number;
  weekdays: number[];
  distributionType: "proportional" | "linear";
  ignoreHolidays: boolean;
  weeklySnapshots: CommercialWeeklySnapshot[];
  previousTargets?: MetricTargets;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
};

export const commercialMetricKeys: CommercialMetricKey[] = ["mql", "sql", "sal", "logo"];

export const defaultMonthlyTargets: MetricTargets = {
  mql: 100,
  sql: 60,
  sal: 30,
  logo: 10,
};

export const defaultGoalSettings: CommercialGoalSettings = {
  weekdays: [1, 2, 3, 4, 5],
  distributionType: "proportional",
  ignoreHolidays: false,
};

export function inputDate(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateFromInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function formatShortDate(value: string) {
  return dateFromInput(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function monthLabel(referenceMonth: string) {
  return dateFromInput(`${referenceMonth}-01`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function monthBounds(referenceMonth: string) {
  const [year, month] = referenceMonth.split("-").map(Number);
  const start = new Date(year, month - 1, 1, 12, 0, 0, 0);
  const end = new Date(year, month, 0, 12, 0, 0, 0);
  return { start, end };
}

export function startOfWeek(reference: Date) {
  const date = new Date(reference);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  date.setHours(12, 0, 0, 0);
  return date;
}

export function endOfWeek(reference: Date) {
  const date = startOfWeek(reference);
  date.setDate(date.getDate() + 6);
  return date;
}

export function countBusinessDays(referenceMonth: string, weekdays = defaultGoalSettings.weekdays) {
  const { start, end } = monthBounds(referenceMonth);
  let total = 0;
  for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    if (weekdays.includes(date.getDay())) total += 1;
  }
  return total;
}

export function distributeIntegerTarget(target: number, weights: number[]) {
  const safeTarget = Math.max(0, Math.round(Number(target) || 0));
  const totalWeight = weights.reduce((sum, item) => sum + item, 0);
  if (!safeTarget || !totalWeight) return weights.map(() => 0);

  const raw = weights.map((weight) => (safeTarget * weight) / totalWeight);
  const floor = raw.map(Math.floor);
  let remainder = safeTarget - floor.reduce((sum, item) => sum + item, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  const result = [...floor];
  for (const item of order) {
    if (remainder <= 0) break;
    result[item.index] += 1;
    remainder -= 1;
  }
  return result;
}

export function buildWeeklyGoalSnapshots(referenceMonth: string, targets: MetricTargets, settings = defaultGoalSettings) {
  const { start, end } = monthBounds(referenceMonth);
  const firstWeekStart = startOfWeek(start);
  const weeks: Omit<CommercialWeeklySnapshot, "targets">[] = [];

  for (const weekStart = new Date(firstWeekStart); weekStart <= end; weekStart.setDate(weekStart.getDate() + 7)) {
    const weekEnd = endOfWeek(weekStart);
    let workDays = 0;
    for (const date = new Date(weekStart); date <= weekEnd; date.setDate(date.getDate() + 1)) {
      const inMonth = date >= start && date <= end;
      if (inMonth && settings.weekdays.includes(date.getDay())) workDays += 1;
    }
    if (!workDays) continue;
    const weekNumber = weeks.length + 1;
    weeks.push({
      id: `${referenceMonth}-W${weekNumber}`,
      referenceMonth,
      weekNumber,
      label: `Semana ${weekNumber}`,
      periodLabel: `${formatShortDate(inputDate(weekStart))} - ${formatShortDate(inputDate(weekEnd))}`,
      startDate: inputDate(weekStart),
      endDate: inputDate(weekEnd),
      workDays,
    });
  }

  const weights = settings.distributionType === "linear" ? weeks.map(() => 1) : weeks.map((week) => week.workDays);
  const distributed = commercialMetricKeys.reduce(
    (acc, key) => ({ ...acc, [key]: distributeIntegerTarget(targets[key], weights) }),
    {} as Record<CommercialMetricKey, number[]>,
  );

  return weeks.map((week, index) => ({
    ...week,
    targets: commercialMetricKeys.reduce(
      (acc, key) => ({ ...acc, [key]: distributed[key][index] ?? 0 }),
      {} as MetricTargets,
    ),
  }));
}

export function buildMonthlyGoalRecord({
  existing,
  referenceMonth,
  targets,
  settings = defaultGoalSettings,
  updatedBy = "Sistema",
  now = new Date(),
}: {
  existing?: CommercialMonthlyGoalRecord;
  referenceMonth: string;
  targets: MetricTargets;
  settings?: CommercialGoalSettings;
  updatedBy?: string;
  now?: Date;
}) {
  const normalizedTargets = commercialMetricKeys.reduce(
    (acc, key) => ({ ...acc, [key]: Math.max(0, Math.round(Number(targets[key]) || 0)) }),
    {} as MetricTargets,
  );
  const weeklySnapshots = buildWeeklyGoalSnapshots(referenceMonth, normalizedTargets, settings);
  const timestamp = now.toISOString();
  return {
    id: existing?.id || `CMG-${referenceMonth}-${String(now.getTime()).slice(-6)}`,
    referenceMonth,
    targets: normalizedTargets,
    workDays: countBusinessDays(referenceMonth, settings.weekdays),
    weekdays: settings.weekdays,
    distributionType: settings.distributionType,
    ignoreHolidays: settings.ignoreHolidays,
    weeklySnapshots,
    previousTargets: existing ? existing.targets : undefined,
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
    updatedBy,
  } satisfies CommercialMonthlyGoalRecord;
}

export function goalForDate(records: CommercialMonthlyGoalRecord[], reference = new Date()) {
  const month = `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, "0")}`;
  return records.find((record) => record.referenceMonth === month);
}

export function snapshotForDate(goal: CommercialMonthlyGoalRecord | undefined, reference = new Date()) {
  const day = inputDate(reference);
  return goal?.weeklySnapshots.find((snapshot) => snapshot.startDate <= day && snapshot.endDate >= day);
}

export function recordsForSnapshot(records: CommercialDailyRecord[], snapshot: CommercialWeeklySnapshot) {
  const { start, end } = monthBounds(snapshot.referenceMonth);
  const monthStart = inputDate(start);
  const monthEnd = inputDate(end);
  return records
    .filter((record) => record.date >= snapshot.startDate && record.date <= snapshot.endDate && record.date >= monthStart && record.date <= monthEnd)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function summarizeSnapshot(records: CommercialDailyRecord[], snapshot: CommercialWeeklySnapshot) {
  const scoped = recordsForSnapshot(records, snapshot);
  const totals = commercialMetricKeys.reduce(
    (acc, key) => ({ ...acc, [key]: scoped.reduce((sum, record) => sum + (Number(record[key]) || 0), 0) }),
    {} as MetricTargets,
  );
  return {
    records: scoped,
    totals,
    dialerMinutes: scoped.reduce((sum, record) => sum + (Number(record.dialerMinutes) || 0), 0),
    followUps: scoped.reduce((sum, record) => sum + (Number(record.followUps) || 0), 0),
  };
}

export function remainingWorkdaysInSnapshot(snapshot: CommercialWeeklySnapshot, weekdays: number[], reference = new Date()) {
  const today = inputDate(reference);
  let total = 0;
  for (const date = dateFromInput(snapshot.startDate); date <= dateFromInput(snapshot.endDate); date.setDate(date.getDate() + 1)) {
    if (inputDate(date) >= today && weekdays.includes(date.getDay())) total += 1;
  }
  return Math.max(1, total);
}

export function elapsedWorkdaysInSnapshot(snapshot: CommercialWeeklySnapshot, weekdays: number[], reference = new Date()) {
  const today = inputDate(reference);
  let total = 0;
  for (const date = dateFromInput(snapshot.startDate); date <= dateFromInput(snapshot.endDate); date.setDate(date.getDate() + 1)) {
    if (inputDate(date) <= today && weekdays.includes(date.getDay())) total += 1;
  }
  return Math.max(1, total);
}

export function dynamicDailyTarget(target: number, realized: number, remainingDays: number) {
  return Math.max(0, Math.ceil((target - realized) / Math.max(1, remainingDays)));
}

export function attainmentStatus(realized: number, target: number, expectedProgress = 1) {
  const achieved = target ? realized / target : 0;
  if (achieved >= Math.min(1, expectedProgress)) return "adequado";
  if (achieved >= Math.max(0.5, expectedProgress * 0.75)) return "atencao";
  return "abaixo";
}
