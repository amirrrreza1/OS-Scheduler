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
  GitCompareArrows,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import Card from "@/components/ui/Custom/Card";
import { updateSearchParams } from "@/lib/shareUrl";

export default function CompareTab({
  rows,
  setRows,
}: {
  rows: ProcessRow[];
  setRows: React.Dispatch<React.SetStateAction<ProcessRow[]>>;
}) {
  const [algoA, setAlgoA] = useState<StrategyId>("FCFS");
  const [algoB, setAlgoB] = useState<StrategyId>("SJF");
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
    if (isStrategyId(searchParams.get("cmp_a")))
      setAlgoA(searchParams.get("cmp_a") as StrategyId);
    if (isStrategyId(searchParams.get("cmp_b")))
      setAlgoB(searchParams.get("cmp_b") as StrategyId);

    const q = Number(searchParams.get("cmp_q"));
    if (Number.isFinite(q) && q > 0) setQuantum(q);

    const cs = Number(searchParams.get("cmp_cs"));
    if (Number.isFinite(cs) && cs >= 0) setContextSwitch(cs);

    initRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!initRef.current) return;
    const next = updateSearchParams(searchParams, {
      cmp_a: algoA,
      cmp_b: algoB,
      cmp_q: String(quantum),
      cmp_cs: String(contextSwitch),
    });
    const nextUrl = next ? `${pathname}?${next}` : pathname;
    if (next !== searchParams.toString())
      router.replace(nextUrl, { scroll: false });
  }, [algoA, algoB, quantum, contextSwitch, searchParams, router, pathname]);

  const needsQuantum = [algoA, algoB].includes("RR");
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

  const valid = processesValid && algoA !== algoB && (!needsQuantum || q >= 1);

  const simProcesses = useMemo(() => rowsToProcesses(rows), [rows]);
  const aPolicy = useMemo(() => getStrategy(algoA, q), [algoA, q]);
  const bPolicy = useMemo(() => getStrategy(algoB, q), [algoB, q]);

  const aResult = useMemo(
    () =>
      valid
        ? simulate(simProcesses, aPolicy, { quantum: q, contextSwitch: cs })
        : null,
    [valid, simProcesses, aPolicy, q, cs]
  );
  const bResult = useMemo(
    () =>
      valid
        ? simulate(simProcesses, bPolicy, { quantum: q, contextSwitch: cs })
        : null,
    [valid, simProcesses, bPolicy, q, cs]
  );

  const titleA = STRATEGIES.find((s) => s.id === algoA)?.titleFa ?? algoA;
  const titleB = STRATEGIES.find((s) => s.id === algoB)?.titleFa ?? algoB;

  return (
    <div className="space-y-4">
      <Card
        title="انتخاب دو الگوریتم"
        subtitle="دو الگوریتم متفاوت انتخاب کنید تا نتایج را کنار هم مقایسه کنیم"
        icon={<GitCompareArrows className="h-4 w-4 text-muted-foreground" />}
        right={<ShareLinkButton />}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <StrategySelect
            label="الگوریتم اول"
            value={algoA}
            onChange={setAlgoA}
          />
          <StrategySelect
            label="الگوریتم دوم"
            value={algoB}
            onChange={setAlgoB}
          />
          <QuantumInput
            quantum={quantum}
            setQuantum={setQuantum}
            enabled={needsQuantum}
          />{" "}
          <ContextSwitchInputs
            processSwitch={contextSwitch}
            setProcessSwitch={setContextSwitch}
          />
        </div>
        <div className="mt-4"></div>
      </Card>

      <Card
        title="ورودی پردازش‌ها"
        subtitle="ورودی مشترک برای هر دو الگوریتم"
        icon={<ClipboardList className="h-4 w-4 text-muted-foreground" />}
      >
        <ProcessEditor rows={rows} setRows={setRows} />
      </Card>

      {!valid ? (
        <Card
          title="خطا"
          icon={<AlertCircle className="h-4 w-4 text-destructive" />}
          subtitle=""
        >
          <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
            برخی ورودی‌ها نامعتبر هستند لطفا مقادیر را اصلاح کنید.
          </div>
        </Card>
      ) : null}

      {valid && aResult && bResult ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card
            title={titleA}
            subtitle="خروجی الگوریتم اول: نمودار گانت و متریک‌ها"
            icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="space-y-4">
              <GanttChart timeline={aResult.timeline} />
              <MetricsTable result={aResult} />
            </div>
          </Card>

          <Card
            title={titleB}
            subtitle="خروجی الگوریتم دوم: نمودار گانت و متریک‌ها"
            icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="space-y-4">
              <GanttChart timeline={bResult.timeline} />
              <MetricsTable result={bResult} />
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
