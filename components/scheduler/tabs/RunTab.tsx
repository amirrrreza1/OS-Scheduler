"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import StrategySelect, {
  QuantumInput,
  type StrategyId,
} from "@/components/scheduler/StrategySelect";
import ContextSwitchInputs from "@/components/scheduler/ContextSwitchInputs";
import GanttChart from "@/components/scheduler/GanttChart";
import MetricsTable from "@/components/scheduler/MetricsTable";
import ShareLinkButton from "@/components/scheduler/ShareLinkButton";

import type { ProcessRow } from "@/lib/Scheduler/processRows";
import { rowsToProcesses } from "@/lib/Scheduler/processRows";
import { getStrategy, STRATEGIES } from "@/lib/Scheduler/registry";
import { simulate } from "@/lib/Scheduler/simulate";
import ProcessEditor from "../processEditor";
import {
  ClipboardList,
  SlidersHorizontal,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import Card from "@/components/ui/Custom/Card";
import { updateSearchParams } from "@/lib/shareUrl";

export default function RunTab({
  rows,
  setRows,
}: {
  rows: ProcessRow[];
  setRows: React.Dispatch<React.SetStateAction<ProcessRow[]>>;
}) {
  const [algo, setAlgo] = useState<StrategyId>("FCFS");
  const [quantum, setQuantum] = useState<number>(2);
  const [contextSwitch, setContextSwitch] = useState<number>(0);
  const initRef = useRef(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const isStrategyId = (value: string | null): value is StrategyId =>
    !!value && STRATEGIES.some((s) => s.id === value);

  useEffect(() => {
    if (initRef.current) return;
    if (isStrategyId(searchParams.get("run_algo")))
      setAlgo(searchParams.get("run_algo") as StrategyId);

    const q = Number(searchParams.get("run_q"));
    if (Number.isFinite(q) && q > 0) setQuantum(q);

    const cs = Number(searchParams.get("run_cs"));
    if (Number.isFinite(cs) && cs >= 0) setContextSwitch(cs);

    initRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!initRef.current) return;
    const next = updateSearchParams(searchParams, {
      run_algo: algo,
      run_q: String(quantum),
      run_cs: String(contextSwitch),
    });
    const nextUrl = next ? `${pathname}?${next}` : pathname;
    if (next !== searchParams.toString())
      router.replace(nextUrl, { scroll: false });
  }, [algo, quantum, contextSwitch, searchParams, router, pathname]);

  const needsQuantum = algo === "RR";
  const q = Math.max(1, Math.floor(quantum || 1));
  const cs = Math.max(0, contextSwitch || 0);

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
    () =>
      valid
        ? simulate(simProcesses, policy, { quantum: q, contextSwitch: cs })
        : null,
    [valid, simProcesses, policy, q, cs]
  );

  return (
    <div className="space-y-4">
      <Card
        title="انتخاب الگوریتم"
        subtitle="الگوریتم زمان‌بندی را انتخاب کنید"
        icon={<SlidersHorizontal className="h-4 w-4 text-muted-foreground" />}
        right={<ShareLinkButton />}
      >
        <div className="grid gap-6 md:grid-cols-3">
          <StrategySelect label="الگوریتم" value={algo} onChange={setAlgo} />
          <QuantumInput
            quantum={quantum}
            setQuantum={setQuantum}
            enabled={needsQuantum}
          />
          <ContextSwitchInputs
            processSwitch={contextSwitch}
            setProcessSwitch={setContextSwitch}
          />
        </div>
      </Card>
      <Card
        title="ورودی پردازش‌ها"
        subtitle="لیست پردازش‌ها را تعریف کنید"
        icon={<ClipboardList className="h-4 w-4 text-muted-foreground" />}
      >
        <ProcessEditor rows={rows} setRows={setRows} />
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
