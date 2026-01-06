import { makeUid, ProcessRow } from "@/lib/Scheduler/processRows";

export type ThreadUI = {
  tid: string;
  arrival: string;
  burst: string;
};

export type ThreadProcessUI = {
  pid: string;
  threads: ThreadUI[];
};

function toNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function toStringValue(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

export function encodeRows(rows: ProcessRow[]): string {
  const data = rows.map((r) => [r.arrival, r.burst]);
  return JSON.stringify(data);
}

export function decodeRows(param: string | null): ProcessRow[] | null {
  if (!param) return null;
  try {
    const raw = JSON.parse(param);
    if (!Array.isArray(raw)) return null;
    const rows = raw
      .map((item) => {
        if (!Array.isArray(item) || item.length < 2) return null;
        const arrival = toNumber(item[0]);
        const burst = toNumber(item[1]);
        if (arrival == null || burst == null) return null;
        return {
          uid: makeUid(),
          arrival: Math.max(0, arrival),
          burst: Math.max(1, burst),
        };
      })
      .filter(Boolean) as ProcessRow[];
    return rows.length ? rows : null;
  } catch {
    return null;
  }
}

export function encodeThreadProcesses(processes: ThreadProcessUI[]): string {
  return JSON.stringify(processes);
}

export function decodeThreadProcesses(
  param: string | null
): ThreadProcessUI[] | null {
  if (!param) return null;
  try {
    const raw = JSON.parse(param);
    if (!Array.isArray(raw)) return null;
    const processes = raw
      .map((p, pIdx) => {
        if (!p || typeof p !== "object") return null;
        const pid =
          typeof (p as ThreadProcessUI).pid === "string" &&
          (p as ThreadProcessUI).pid.trim()
            ? (p as ThreadProcessUI).pid
            : `P${pIdx + 1}`;
        const rawThreads = Array.isArray((p as ThreadProcessUI).threads)
          ? (p as ThreadProcessUI).threads
          : [];
        const threads = rawThreads
          .map((t, tIdx) => {
            if (!t || typeof t !== "object") return null;
            const tid =
              typeof (t as ThreadUI).tid === "string" &&
              (t as ThreadUI).tid.trim()
                ? (t as ThreadUI).tid
                : `T${tIdx + 1}`;
            return {
              tid,
              arrival: toStringValue((t as ThreadUI).arrival, "0"),
              burst: toStringValue((t as ThreadUI).burst, "1"),
            };
          })
          .filter(Boolean) as ThreadUI[];
        return {
          pid,
          threads: threads.length
            ? threads
            : [{ tid: "T1", arrival: "0", burst: "1" }],
        };
      })
      .filter(Boolean) as ThreadProcessUI[];
    return processes.length ? processes : null;
  } catch {
    return null;
  }
}

export function updateSearchParams(
  current: URLSearchParams,
  updates: Record<string, string | null>
): string {
  const next = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value == null || value === "") next.delete(key);
    else next.set(key, value);
  }
  return next.toString();
}
