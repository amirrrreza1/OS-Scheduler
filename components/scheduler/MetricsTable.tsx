"use client";

import { faNum } from "@/lib/format";
import { SimulationResult } from "@/Types/types";

export default function MetricsTable({ result }: { result: SimulationResult }) {
  const rows = Object.entries(result.perProcess).map(([pid, m]) => ({
    pid,
    wt: m.waitingTime,
    tat: m.turnaroundTime,
  }));

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/30">
          <tr>
            <th className="p-2 text-center">پردازش</th>
            <th className="p-2 text-center">Waiting Time</th>
            <th className="p-2 text-center">Turnaround Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.pid} className="border-t border-border">
              <td className="p-2 text-center">{r.pid}</td>
              <td className="p-2 text-center">{faNum(r.wt, 0)}</td>
              <td className="p-2 text-center">{faNum(r.tat, 0)}</td>
            </tr>
          ))}
          <tr className="border-t border-border bg-muted/20 font-medium">
            <td className="p-2 text-center">میانگین</td>
            <td className="p-2 text-center">
              {faNum(result.summary.avgWaitingTime, 2)}
            </td>
            <td className="p-2 text-center">
              {faNum(result.summary.avgTurnaroundTime, 2)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
