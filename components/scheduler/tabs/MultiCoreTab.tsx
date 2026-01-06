"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import MultiCoreGanttChart from "@/components/scheduler/MultiCoreGanttChart";
import MetricsTable from "@/components/scheduler/MetricsTable";
import ProcessEditor from "../processEditor";
import ShareLinkButton from "@/components/scheduler/ShareLinkButton";

import type { ProcessRow } from "@/lib/Scheduler/processRows";
import { rowsToProcesses } from "@/lib/Scheduler/processRows";
import { MULTI_CORE_STRATEGIES } from "@/lib/Scheduler/registry";
import { simulateMultiCore } from "@/lib/Scheduler/simulateMultiCore";

import Card from "@/components/ui/Custom/Card";
import Select from "@/components/ui/Custom/select";
import Label from "@/components/ui/Custom/Label";
import NumberInput from "@/components/ui/Custom/Input/NumberInput";
import ContextSwitchInputs from "@/components/scheduler/ContextSwitchInputs";
import { AlertCircle, Cpu, ListChecks } from "lucide-react";
import { updateSearchParams } from "@/lib/shareUrl";

type MultiCoreStrategyId = "LPT" | "RPT";

export default function MultiCoreTab({
  rows,
  setRows,
}: {
  rows: ProcessRow[];
  setRows: React.Dispatch<React.SetStateAction<ProcessRow[]>>;
}) {
  const [strategy, setStrategy] = useState<MultiCoreStrategyId>("LPT");
  const [cores, setCores] = useState<number>(2);
  const [contextSwitch, setContextSwitch] = useState<number>(0);
  const initRef = useRef(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const isMultiCoreStrategy = (
    value: string | null
  ): value is MultiCoreStrategyId => value === "LPT" || value === "RPT";

  useEffect(() => {
    if (initRef.current) return;
    if (isMultiCoreStrategy(searchParams.get("mc_strategy")))
      setStrategy(searchParams.get("mc_strategy") as MultiCoreStrategyId);

    const c = Number(searchParams.get("mc_cores"));
    if (Number.isFinite(c) && c > 0) setCores(c);

    const cs = Number(searchParams.get("mc_cs"));
    if (Number.isFinite(cs) && cs >= 0) setContextSwitch(cs);

    initRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!initRef.current) return;
    const next = updateSearchParams(searchParams, {
      mc_strategy: strategy,
      mc_cores: String(cores),
      mc_cs: String(contextSwitch),
    });
    const nextUrl = next ? `${pathname}?${next}` : pathname;
    if (next !== searchParams.toString())
      router.replace(nextUrl, { scroll: false });
  }, [strategy, cores, contextSwitch, searchParams, router, pathname]);

  const processesValid = useMemo(() => {
    if (rows.length < 1) return false;
    if (rows.some((r) => !Number.isFinite(r.arrival) || r.arrival < 0))
      return false;
    if (rows.some((r) => !Number.isFinite(r.burst) || r.burst <= 0))
      return false;
    return true;
  }, [rows]);

  const safeCores = Math.max(1, Math.floor(cores || 1));
  const cs = Math.max(0, contextSwitch || 0);
  const valid = processesValid && safeCores >= 1;

  const simProcesses = useMemo(() => rowsToProcesses(rows), [rows]);
  const result = useMemo(
    () =>
      valid
        ? simulateMultiCore({
            processes: simProcesses,
            cores: safeCores,
            strategy,
            contextSwitch: cs,
          })
        : null,
    [valid, simProcesses, safeCores, strategy, cs]
  );

  return (
    <div className="space-y-4">
      <Card
        title="زمانبندی چند هسته ای"
        subtitle="الگوریتم زمان‌بندی را انتخاب کنید"
        icon={<Cpu className="h-4 w-4 text-muted-foreground" />}
        right={<ShareLinkButton />}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Strategy</Label>
            <Select
              value={strategy}
              onChange={(v) => setStrategy(v as MultiCoreStrategyId)}
            >
              {MULTI_CORE_STRATEGIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.titleFa}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label>هسته ها</Label>
            <NumberInput value={safeCores} onChange={setCores} min={1} />
          </div>
          <ContextSwitchInputs
            processSwitch={contextSwitch}
            setProcessSwitch={setContextSwitch}
          />
        </div>
      </Card>

      <Card
        title="ورودی پردازش‌ها"
        subtitle="لیست پردازش‌ها را تعریف کنید"
        icon={<ListChecks className="h-4 w-4 text-muted-foreground" />}
      >
        <ProcessEditor rows={rows} setRows={setRows} />
      </Card>

      {!valid ? (
        <Card
          title="Invalid input"
          icon={<AlertCircle className="h-4 w-4 text-destructive" />}
          subtitle=""
        >
          <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
            Check arrival/burst values and the number of cores.
          </div>
        </Card>
      ) : null}

      {valid && result ? (
        <div className="space-y-4">
          <Card
            title="گانت چارت"
            icon={<Cpu className="h-4 w-4 text-muted-foreground" />}
          >
            <MultiCoreGanttChart timelines={result.timelines} />
          </Card>

          <Card
            title="خروجی"
            subtitle={"شاخص‌های عملکرد"}
            icon={<ListChecks className="h-4 w-4 text-muted-foreground" />}
          >
            <MetricsTable result={result} />
          </Card>
        </div>
      ) : null}
    </div>
  );
}
