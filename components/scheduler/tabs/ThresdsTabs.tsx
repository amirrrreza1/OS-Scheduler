"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { StrategyId } from "@/Types/types";
import GanttChart from "@/components/scheduler/GanttChart";
import ShareLinkButton from "@/components/scheduler/ShareLinkButton";

import {
  Plus,
  Trash2,
  Settings2,
  Workflow,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";
import {
  ProcessThreadsInput,
  simulateThreads,
} from "@/lib/Scheduler/simulateThreads";
import Button from "@/components/ui/Custom/Button/Button";
import Input from "@/components/ui/Custom/Input/DecimalInput";
import Select from "@/components/ui/Custom/select";
import Card from "@/components/ui/Custom/Card";
import Label from "@/components/ui/Custom/Label";
import NumberInput from "@/components/ui/Custom/Input/NumberInput";
import { STRATEGIES } from "@/lib/Scheduler/registry";
import { isAllowedDecimalInput, parseDecimal } from "@/lib/parseNumber";
import ContextSwitchInputs from "@/components/scheduler/ContextSwitchInputs";
import {
  decodeThreadProcesses,
  encodeThreadProcesses,
  updateSearchParams,
  type ThreadProcessUI,
} from "@/lib/shareUrl";

type ProcessUI = ThreadProcessUI;
type ThreadUI = ThreadProcessUI["threads"][number];

function nextProcessName(count: number) {
  return `P${count + 1}`;
}

function nextThreadName(threadsCount: number) {
  return `T${threadsCount + 1}`;
}

function clampMin(n: number, min: number) {
  return Number.isFinite(n) ? Math.max(min, n) : min;
}

function fmtFa(n: number, digits = 2) {
  const fixed = Number.isInteger(n)
    ? n.toString()
    : n.toFixed(digits).replace(/\.00$/, "");
  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: digits,
  }).format(Number(fixed));
}

export default function ThreadsTab() {
  const [processes, setProcesses] = useState<ProcessUI[]>(() => [
    {
      pid: "P1",
      threads: [{ tid: "T1", arrival: "0", burst: "1" }],
    },
  ]);

  const [processStrategy, setProcessStrategy] = useState<StrategyId>("FCFS");
  const [threadStrategy, setThreadStrategy] = useState<StrategyId>("FCFS");

  const [processQuantum, setProcessQuantum] = useState<number>(2);
  const [threadQuantum, setThreadQuantum] = useState<number>(2);
  const [processContextSwitch, setProcessContextSwitch] = useState<number>(0);
  const [threadContextSwitch, setThreadContextSwitch] = useState<number>(0);
  const initRef = useRef(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const isStrategyId = (value: string | null): value is StrategyId =>
    !!value && STRATEGIES.some((s) => s.id === value);

  useEffect(() => {
    if (initRef.current) return;
    const decoded = decodeThreadProcesses(searchParams.get("th_data"));
    if (decoded) setProcesses(decoded);

    if (isStrategyId(searchParams.get("th_ps")))
      setProcessStrategy(searchParams.get("th_ps") as StrategyId);
    if (isStrategyId(searchParams.get("th_ts")))
      setThreadStrategy(searchParams.get("th_ts") as StrategyId);

    const pq = Number(searchParams.get("th_pq"));
    if (Number.isFinite(pq) && pq > 0) setProcessQuantum(pq);
    const tq = Number(searchParams.get("th_tq"));
    if (Number.isFinite(tq) && tq > 0) setThreadQuantum(tq);

    const pcs = Number(searchParams.get("th_pcs"));
    if (Number.isFinite(pcs) && pcs >= 0) setProcessContextSwitch(pcs);
    const tcs = Number(searchParams.get("th_tcs"));
    if (Number.isFinite(tcs) && tcs >= 0) setThreadContextSwitch(tcs);

    initRef.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!initRef.current) return;
    const next = updateSearchParams(searchParams, {
      th_data: encodeThreadProcesses(processes),
      th_ps: processStrategy,
      th_ts: threadStrategy,
      th_pq: String(processQuantum),
      th_tq: String(threadQuantum),
      th_pcs: String(processContextSwitch),
      th_tcs: String(threadContextSwitch),
    });
    const nextUrl = next ? `${pathname}?${next}` : pathname;
    if (next !== searchParams.toString())
      router.replace(nextUrl, { scroll: false });
  }, [
    processes,
    processStrategy,
    threadStrategy,
    processQuantum,
    threadQuantum,
    processContextSwitch,
    threadContextSwitch,
    searchParams,
    router,
    pathname,
  ]);

  const addProcess = () => {
    setProcesses((prev) => {
      const pid = nextProcessName(prev.length);
      return [
        ...prev,
        { pid, threads: [{ tid: "T1", arrival: "0", burst: "1" }] },
      ];
    });
  };

  const removeProcess = (pIdx: number) => {
    setProcesses((prev) => {
      const next = prev.filter((_, i) => i !== pIdx);
      if (next.length === 0) {
        return [
          { pid: "P1", threads: [{ tid: "T1", arrival: "0", burst: "1" }] },
        ];
      }
      return next.map((p, i) => ({ ...p, pid: `P${i + 1}` }));
    });
  };

  const addThread = (pIdx: number) => {
    setProcesses((prev) => {
      const next = [...prev];
      const p = next[pIdx];
      if (!p) return prev;

      const tid = nextThreadName(p.threads.length);
      next[pIdx] = {
        ...p,
        threads: [...p.threads, { tid, arrival: "0", burst: "1" }],
      };
      return next;
    });
  };

  const removeThread = (pIdx: number, tIdx: number) => {
    setProcesses((prev) => {
      const next = [...prev];
      const p = next[pIdx];
      if (!p) return prev;

      const threads = p.threads.filter((_, i) => i !== tIdx);
      const safeThreads = threads.length
        ? threads
        : [{ tid: "T1", arrival: "0", burst: "1" }];

      const relabeled = safeThreads.map((t, i) => ({ ...t, tid: `T${i + 1}` }));
      next[pIdx] = { ...p, threads: relabeled };
      return next;
    });
  };

  const updateThread = (
    pIdx: number,
    tIdx: number,
    patch: Partial<ThreadUI>
  ) => {
    setProcesses((prev) => {
      const next = [...prev];
      const p = next[pIdx];
      if (!p) return prev;

      const threads = [...p.threads];
      const t = threads[tIdx];
      if (!t) return prev;

      threads[tIdx] = { ...t, ...patch };
      next[pIdx] = { ...p, threads };
      return next;
    });
  };

  const simInput = useMemo<ProcessThreadsInput[]>(() => {
    return processes.map((p) => ({
      pid: p.pid,
      threads: p.threads.map((t) => ({
        tid: t.tid,
        arrival: clampMin(parseDecimal(t.arrival, 0), 0),
        burst: clampMin(parseDecimal(t.burst, 1), 0.01),
      })),
    }));
  }, [processes]);

  const hasAnyInvalid = useMemo(() => {
    for (const p of processes) {
      for (const t of p.threads) {
        const a = parseDecimal(t.arrival, NaN);
        const b = parseDecimal(t.burst, NaN);
        if (!Number.isFinite(a) || !Number.isFinite(b)) return true;
        if (a < 0) return true;
        if (b <= 0) return true;
      }
    }
    return false;
  }, [processes]);

  const result = useMemo(() => {
    if (hasAnyInvalid) return null;

    return simulateThreads({
      processes: simInput,
      processStrategy,
      threadStrategy,
      processQuantum:
        processStrategy === "RR"
          ? Math.max(1, Math.floor(processQuantum || 1))
          : undefined,
      threadQuantum:
        threadStrategy === "RR"
          ? Math.max(1, Math.floor(threadQuantum || 1))
          : undefined,
      processContextSwitch: Math.max(0, processContextSwitch || 0),
      threadContextSwitch: Math.max(0, threadContextSwitch || 0),
    });
  }, [
    hasAnyInvalid,
    simInput,
    processStrategy,
    threadStrategy,
    processQuantum,
    threadQuantum,
    processContextSwitch,
    threadContextSwitch,
  ]);

  return (
    <div className="space-y-6 " dir="rtl">
      <Card
        title="تنظیمات شبیه‌سازی"
        subtitle="استراتژی‌ها و کوانتوم‌ها را انتخاب کنید و سپس ورودی‌ها را اضافه کنید."
        icon={<Settings2 className="h-5 w-5 text-muted-foreground" />}
        right={<ShareLinkButton />}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-background/40 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Workflow className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-semibold">زمان‌بندی فرآیندها</div>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>استراتژی</Label>
                <Select
                  value={processStrategy}
                  onChange={(v) => setProcessStrategy(v as StrategyId)}
                >
                  {STRATEGIES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.titleFa}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>کوانتوم</Label>
                <div className={processStrategy === "RR" ? "" : "opacity-50"}>
                  <NumberInput
                    value={processQuantum}
                    onChange={setProcessQuantum}
                    disabled={processStrategy !== "RR"}
                    min={1}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/40 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Workflow className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-semibold">زمان‌بندی نخ‌ها</div>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>استراتژی</Label>
                <Select
                  value={threadStrategy}
                  onChange={(v) => setThreadStrategy(v as StrategyId)}
                >
                  {STRATEGIES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.titleFa}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>کوانتوم </Label>
                <div className={threadStrategy === "RR" ? "" : "opacity-50"}>
                  <NumberInput
                    value={threadQuantum}
                    onChange={setThreadQuantum}
                    disabled={threadStrategy !== "RR"}
                    min={1}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <ContextSwitchInputs
            processSwitch={processContextSwitch}
            setProcessSwitch={setProcessContextSwitch}
            threadSwitch={threadContextSwitch}
            setThreadSwitch={setThreadContextSwitch}
            showThread
          />
        </div>
      </Card>

      <Card
        title="ورودی‌ها"
        subtitle="برای هر فرایند می‌توانید نخ اضافه کنید."
        icon={<ChevronLeft className="h-5 w-5 text-muted-foreground" />}
      >
        <div className="space-y-4">
          {processes.map((p, pIdx) => (
            <section
              key={p.pid}
              className="rounded-2xl border border-border bg-background/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className=" text-muted-foreground">فرایند {p.pid}</div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => addThread(pIdx)}
                    variant="primary"
                  >
                    <Plus className="h-4 w-4" />
                    افزودن نخ
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => removeProcess(pIdx)}
                    variant="danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/20">
                    <tr className="text-muted-foreground text-right">
                      <th className="px-4 py-3 text-right font-medium">نخ</th>
                      <th className="px-4 py-3 text-right font-medium">
                        ثانیه ورود
                      </th>
                      <th className="px-4 py-3 text-right font-medium">اجرا</th>
                      <th className="px-4 py-3 text-right font-medium">
                        عملیات
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {p.threads.map((t, tIdx) => (
                      <tr
                        key={`${p.pid}-${t.tid}`}
                        className="border-t border-border odd:bg-transparent even:bg-muted/10"
                      >
                        <td
                          className="px-4 py-3 font-semibold text-right"
                          dir="ltr"
                        >
                          {t.tid}
                        </td>

                        <td className="px-4 py-3">
                          <Input
                            value={t.arrival}
                            placeholder="0.5"
                            onChange={(v) => {
                              if (!isAllowedDecimalInput(v)) return;
                              updateThread(pIdx, tIdx, { arrival: v });
                            }}
                          />
                        </td>

                        <td className="px-4 py-3">
                          <Input
                            value={t.burst}
                            placeholder="1.25"
                            onChange={(v) => {
                              if (!isAllowedDecimalInput(v)) return;
                              updateThread(pIdx, tIdx, { burst: v });
                            }}
                          />
                        </td>

                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => removeThread(pIdx, tIdx)}
                            title="حذف Thread"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
        <div className="mt-4">
          <Button variant="primary" onClick={addProcess}>
            <Plus className="h-4 w-4" />
            افزودن فرایند
          </Button>
        </div>
      </Card>

      <Card
        title={!hasAnyInvalid ? "خروجی" : "خطا"}
        subtitle={
          !hasAnyInvalid
            ? "نمودار گانت و جدول زمان‌های انتظار/بازگشت نمایش داده می‌شود."
            : null
        }
        icon={
          !hasAnyInvalid ? (
            <Workflow className="h-5 w-5 text-muted-foreground" />
          ) : (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )
        }
      >
        {hasAnyInvalid ? (
          <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
            برخی ورودی‌ها نامعتبر هستند لطفا مقادیر را اصلاح کنید.
          </div>
        ) : result ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-background/40 p-4">
              <GanttChart timeline={result.timeline} />
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border bg-background/40">
              <table className="w-full text-sm">
                <thead className="bg-muted/20">
                  <tr className="text-muted-foreground">
                    <th className="px-4 py-3 text-center font-medium">نخ</th>
                    <th className="px-4 py-3 text-center font-medium">WT</th>
                    <th className="px-4 py-3 text-center font-medium">TAT</th>
                    <th className="px-4 py-3 text-center font-medium">شروع</th>
                    <th className="px-4 py-3 text-center font-medium">
                      زمان پایان
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {Object.entries(result.perProcess).map(([id, m]) => (
                    <tr
                      key={id}
                      className="border-t border-border odd:bg-transparent even:bg-muted/10 hover:bg-muted/20 transition-colors"
                    >
                      <td
                        className="px-4 py-3 font-semibold  text-center"
                        dir="ltr"
                      >
                        {id}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {fmtFa(m.waitingTime)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {fmtFa(m.turnaroundTime)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {fmtFa(m.startTime)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {fmtFa(m.completionTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/40 p-4">
                <div className="text-xs text-muted-foreground">میانگین WT</div>
                <div className="mt-1 text-lg font-semibold">
                  {fmtFa(result.summary.avgWaitingTime)}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background/40 p-4">
                <div className="text-xs text-muted-foreground">میانگین TAT</div>
                <div className="mt-1 text-lg font-semibold">
                  {fmtFa(result.summary.avgTurnaroundTime)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-background/40 p-4 text-sm text-muted-foreground">
            نتیجه‌ای برای نمایش وجود ندارد.
          </div>
        )}
      </Card>
    </div>
  );
}
