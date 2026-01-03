import { ProcessInput } from "@/Types/types";

export type ProcessRow = {
  uid: string; // stable id for DnD
  arrival: number;
  burst: number;
};

export function makeUid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `u_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function rowsToProcesses(rows: ProcessRow[]): ProcessInput[] {
  // IMPORTANT: names are derived from current order => P1..Pn always updates after drag/drop
  return rows.map((r, idx) => ({
    id: `P${idx + 1}`,
    arrival: r.arrival,
    burst: r.burst,
  }));
}
