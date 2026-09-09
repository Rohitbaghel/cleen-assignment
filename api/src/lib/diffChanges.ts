export type Change = {
  field: string;
  oldValue: string | null;
  newValue: string | null;
};

export type TrackedCleaningFields = {
  cleanedBy: string;
  cleanedAt: Date | string;
  method: string;
  notes: string | null;
  status: string;
};

const TRACKED_FIELDS = [
  "cleanedBy",
  "cleanedAt",
  "method",
  "notes",
  "status",
] as const satisfies ReadonlyArray<keyof TrackedCleaningFields>;

export function normalizeValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    // Normalize date-like ISO strings for stable comparison
    const asDate = Date.parse(value);
    if (
      !Number.isNaN(asDate) &&
      /^\d{4}-\d{2}-\d{2}T/.test(value)
    ) {
      return new Date(value).toISOString();
    }
    return value;
  }
  return String(value);
}

export function diffChanges(
  before: Partial<TrackedCleaningFields> | null,
  after: Partial<TrackedCleaningFields>
): Change[] {
  const changes: Change[] = [];

  for (const field of TRACKED_FIELDS) {
    if (!(field in after)) {
      continue;
    }

    const newValue = normalizeValue(after[field]);

    if (before === null) {
      changes.push({ field, oldValue: null, newValue });
      continue;
    }

    if (!(field in before)) {
      continue;
    }

    const oldValue = normalizeValue(before[field]);
    if (oldValue !== newValue) {
      changes.push({ field, oldValue, newValue });
    }
  }

  return changes;
}
