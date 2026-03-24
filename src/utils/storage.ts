export const safeReadJson = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) {
      return fallback;
    }

    try {
      return JSON.parse(stored) as T;
    } catch {
      return fallback;
    }
  } catch {
    return fallback;
  }
};

export const safeWriteJson = (key: string, value: unknown): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const STATS_ENVELOPE_VERSION = 1;
const STATS_ENVELOPE_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

type StatsEnvelope<T> = {
  version: number;
  updatedAt: string;
  stats: T;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const safeWriteStatsEnvelope = <T>(key: string, stats: T): boolean =>
  safeWriteJson(key, {
    version: STATS_ENVELOPE_VERSION,
    updatedAt: new Date(Date.now()).toISOString(),
    stats,
  });

export const safeReadStatsEnvelope = <T>(key: string, fallback: T): T => {
  const stored = safeReadJson<unknown>(key, null);
  if (!isRecord(stored)) {
    return fallback;
  }

  const envelope = stored as Partial<StatsEnvelope<T>>;
  if (
    envelope.version !== STATS_ENVELOPE_VERSION ||
    typeof envelope.updatedAt !== "string" ||
    envelope.stats === undefined
  ) {
    return fallback;
  }

  const updatedAtMs = Date.parse(envelope.updatedAt);
  if (!Number.isFinite(updatedAtMs)) {
    return fallback;
  }

  if (Date.now() - updatedAtMs >= STATS_ENVELOPE_MAX_AGE_MS) {
    return fallback;
  }

  return envelope.stats;
};

export const safeRemoveJson = (key: string): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};
