"use client";

import { useMemo, useState } from "react";

import StrategySelect, {
  QuantumInput,
  type StrategyId,
} from "@/components/scheduler/StrategySelect";
import GanttChart from "@/components/scheduler/GanttChart";
import MetricsTable from "@/components/scheduler/MetricsTable";

import type { ProcessRow } from "@/lib/Scheduler/processRows";
import { rowsToProcesses } from "@/lib/Scheduler/processRows";
import { getStrategy } from "@/lib/Scheduler/registry";
import { simulate } from "@/lib/Scheduler/simulate";
import ProcessEditor from "../processEditor";
import {
  ClipboardList,
  SlidersHorizontal,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import Card from "@/components/ui/Custom/Card";

export default function RunTab({
  rows,
  setRows,
}: {
  rows: ProcessRow[];
  setRows: React.Dispatch<React.SetStateAction<ProcessRow[]>>;
}) {
  const [algo, setAlgo] = useState<StrategyId>("FCFS");
  const [quantum, setQuantum] = useState<number>(2);

  const needsQuantum = algo === "RR";
  const q = Math.max(1, Math.floor(quantum || 1));

  const processesValid = useMemo(() => {
    if (rows.length < 1) return false;
    if (rows.some((r) => !Number.isFinite(r.arrival) || r.arrival < 0))
      return false;
    if (rows.some((r) => !Number.isFinite(r.burst) || r.burst <= 0))
      return false;
    return true;
  }, [rows]);

  const valid = processesValid && (!needsQuantum || q >= 1);

  const simProcesses = useMemo(() => rowsToProcesses(rows), [rows]);
  const policy = useMemo(() => getStrategy(algo, q), [algo, q]);

  const result = useMemo(
    () => (valid ? simulate(simProcesses, policy, { quantum: q }) : null),
    [valid, simProcesses, policy, q]
  );

  return (
    <div className="space-y-4">
      <Card
        title="ورودی پردازش‌ها"
        subtitle="لیست پردازش‌ها را تعریف کنید"
        icon={<ClipboardList className="h-4 w-4 text-muted-foreground" />}
      >
        <ProcessEditor rows={rows} setRows={setRows} />
      </Card>

      <Card
        title="انتخاب الگوریتم"
        subtitle="الگوریتم زمان‌بندی را انتخاب کنید"
        icon={<SlidersHorizontal className="h-4 w-4 text-muted-foreground" />}
      >
        <div className="grid gap-6 grid-cols-2">
          <StrategySelect label="الگوریتم" value={algo} onChange={setAlgo} />
          <QuantumInput
            quantum={quantum}
            setQuantum={setQuantum}
            enabled={needsQuantum}
          />
        </div>
      </Card>

      <Card
        title={!valid ? "خطا" : "خروجی"}
        subtitle={!valid ? null : "نمودار گانت و شاخص‌های عملکرد"}
        icon={
          !valid ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : (
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          )
        }
      >
        {!valid ? (
          <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
            برخی ورودی‌ها نامعتبر هستند لطفا مقادیر را اصلاح کنید.
          </div>
        ) : result ? (
          <div className="space-y-4">
            <GanttChart timeline={result.timeline} />
            <MetricsTable result={result} />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
