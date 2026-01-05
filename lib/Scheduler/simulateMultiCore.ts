import type {
  ProcessInput,
  Segment,
  SimulationResult,
  SimulationSummary,
} from "@/Types/types";
import { computeScale, scaleToInt, unscale } from "./timeScale";

export type MultiCoreResult = SimulationResult & {
  timelines: Segment[][];
  summary: SimulationSummary;
};

type Strategy = "LPT" | "RPT";

function pushOrMerge(timeline: Segment[], pid: string | null, time: number) {
  const last = timeline[timeline.length - 1];
  if (!last || last.pid !== pid || last.end !== time) {
    timeline.push({ pid, start: time, end: time + 1 });
  } else {
    last.end += 1;
  }
}

function pickMax<T>(items: T[], score: (x: T) => number): T {
  let best = items[0];
  let bestS = score(best);
  for (let i = 1; i < items.length; i++) {
    const s = score(items[i]);
    if (s > bestS) {
      bestS = s;
      best = items[i];
    }
  }
  return best;
}

function pickMin<T>(items: T[], score: (x: T) => number): T {
  let best = items[0];
  let bestS = score(best);
  for (let i = 1; i < items.length; i++) {
    const s = score(items[i]);
    if (s < bestS) {
      bestS = s;
      best = items[i];
    }
  }
  return best;
}

function sortByPriority(
  items: string[],
  remaining: Record<string, number>,
  byId: Record<string, ProcessInput>,
  runningSet?: Set<string>
) {
  return [...items].sort((a, b) => {
    const r = (remaining[b] ?? 0) - (remaining[a] ?? 0);
    if (r !== 0) return r;
    if (runningSet) {
      const ar = runningSet.has(a);
      const br = runningSet.has(b);
      if (ar !== br) return ar ? -1 : 1;
    }
    const at = byId[a].arrival - byId[b].arrival;
    if (at !== 0) return at;
    return a.localeCompare(b);
  });
}

function simulateInt(
  processes: ProcessInput[],
  cores: number,
  strategy: Strategy,
  opts?: { maxTicks?: number; contextSwitch?: number }
): MultiCoreResult {
  const maxTicks = opts?.maxTicks ?? 200000;
  const safeCores = Math.max(1, Math.floor(cores));
  const contextSwitch = Math.max(0, Math.floor(opts?.contextSwitch ?? 0));

  const byId: Record<string, ProcessInput> = Object.fromEntries(
    processes.map((p) => [p.id, p])
  );
  const sorted = [...processes].sort(
    (a, b) => a.arrival - b.arrival || a.id.localeCompare(b.id)
  );

  const remaining = Object.fromEntries(
    processes.map((p) => [p.id, p.burst])
  );
  const firstStart = Object.fromEntries(
    processes.map((p) => [p.id, null])
  ) as Record<string, number | null>;
  const completion = Object.fromEntries(
    processes.map((p) => [p.id, null])
  ) as Record<string, number | null>;

  const timelines: Segment[][] = Array.from({ length: safeCores }, () => []);
  const running: Array<string | null> = Array.from(
    { length: safeCores },
    () => null
  );
  const csRemaining: number[] = Array.from({ length: safeCores }, () => 0);
  const csTo: Array<string | null> = Array.from({ length: safeCores }, () => null);
  const lastExecuted: Array<string | null> = Array.from(
    { length: safeCores },
    () => null
  );
  let ready: string[] = [];

  let time = 0;
  let completed = 0;
  let nextArrivalIdx = 0;

  for (
    let guard = 0;
    guard < maxTicks && completed < processes.length;
    guard++
  ) {
    while (
      nextArrivalIdx < sorted.length &&
      sorted[nextArrivalIdx].arrival === time
    ) {
      ready.push(sorted[nextArrivalIdx].id);
      nextArrivalIdx++;
    }

    ready = ready.filter((pid) => (remaining[pid] ?? 0) > 0);

    if (strategy === "LPT" || strategy === "RPT") {
      for (let i = 0; i < running.length; i++) {
        if (csRemaining[i] > 0 || csTo[i]) continue;
        if (running[i] && (remaining[running[i]] ?? 0) > 0) continue;
        running[i] = null;
      }

      for (let i = 0; i < running.length; i++) {
        if (csRemaining[i] > 0 || csTo[i]) continue;
        if (running[i]) continue;
        if (!ready.length) break;

        const pick =
          strategy === "LPT"
            ? pickMax(ready, (pid) => byId[pid].burst)
            : pickMin(ready, (pid) => byId[pid].burst);
        const idx = ready.indexOf(pick);
        if (idx >= 0) ready.splice(idx, 1);
        if (contextSwitch > 0 && lastExecuted[i] && pick !== lastExecuted[i]) {
          csRemaining[i] = contextSwitch;
          csTo[i] = pick;
        } else {
          running[i] = pick;
        }
      }
    } else {
      const candidates = new Set<string>();
      for (const pid of ready) candidates.add(pid);
      for (const pid of running) if (pid) candidates.add(pid);

      const ordered = sortByPriority(
        Array.from(candidates),
        remaining,
        byId,
        new Set(running.filter((pid): pid is string => Boolean(pid)))
      );
      const assigned = ordered.slice(0, safeCores);
      const assignedSet = new Set(assigned);

      const nextRunning: Array<string | null> = Array.from(
        { length: running.length },
        () => null
      );

      for (let i = 0; i < running.length; i++) {
        const pid = running[i];
        if (pid && assignedSet.has(pid)) {
          nextRunning[i] = pid;
          assignedSet.delete(pid);
        }
      }

      const remainingAssigned = ordered.filter((pid) => assignedSet.has(pid));
      let fillIdx = 0;
      for (let i = 0; i < nextRunning.length; i++) {
        if (nextRunning[i]) continue;
        nextRunning[i] = remainingAssigned[fillIdx++] ?? null;
      }

      running.splice(0, running.length, ...nextRunning);
      ready = ordered.filter((pid) => !running.includes(pid));
    }

    for (let i = 0; i < running.length; i++) {
      if (csRemaining[i] > 0) {
        pushOrMerge(timelines[i], "CS-P", time);
        csRemaining[i] -= 1;
        if (csRemaining[i] === 0) {
          running[i] = csTo[i];
          csTo[i] = null;
        }
        lastExecuted[i] = null;
        continue;
      }

      const pid = running[i];
      pushOrMerge(timelines[i], pid, time);

      if (!pid) {
        lastExecuted[i] = null;
        continue;
      }

      if (firstStart[pid] == null) firstStart[pid] = time;
      remaining[pid] -= 1;
      lastExecuted[i] = pid;

      if (remaining[pid] === 0) {
        completion[pid] = time + 1;
        completed += 1;
        running[i] = null;
      }
    }

    time += 1;
  }

  const makespan = timelines.reduce(
    (max, tl) => (tl.length ? Math.max(max, tl[tl.length - 1].end) : max),
    0
  );

  const totalBusy = timelines.reduce((sum, tl) => {
    return (
      sum +
      tl.reduce((s, seg) => {
        if (!seg.pid) return s;
        if (seg.pid === "CS-P" || seg.pid === "CS-T") return s;
        return s + (seg.end - seg.start);
      }, 0)
    );
  }, 0);

  const perProcess = Object.fromEntries(
    processes.map((p) => {
      const st = firstStart[p.id] ?? p.arrival;
      const ct = completion[p.id] ?? makespan;
      const tat = ct - p.arrival;
      const wt = tat - p.burst;
      const rt = st - p.arrival;
      return [
        p.id,
        {
          startTime: st,
          completionTime: ct,
          turnaroundTime: tat,
          waitingTime: wt,
          responseTime: rt,
        },
      ];
    })
  ) as SimulationResult["perProcess"];

  const avg = (xs: number[]) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const wts = Object.values(perProcess).map((m) => m.waitingTime);
  const tats = Object.values(perProcess).map((m) => m.turnaroundTime);
  const rts = Object.values(perProcess).map((m) => m.responseTime);

  return {
    timeline: timelines[0] ?? [],
    timelines,
    perProcess,
    summary: {
      makespan,
      cpuUtilization: makespan
        ? totalBusy / (makespan * Math.max(1, safeCores))
        : 0,
      throughput: makespan ? processes.length / makespan : 0,
      avgWaitingTime: avg(wts),
      avgTurnaroundTime: avg(tats),
      avgResponseTime: avg(rts),
    },
  };
}

function unscaleResult(
  res: MultiCoreResult,
  scale: number,
  count: number
): MultiCoreResult {
  const timelines = res.timelines.map((tl) =>
    tl.map((s) => ({
      ...s,
      start: unscale(s.start, scale),
      end: unscale(s.end, scale),
    }))
  );

  const perProcess = Object.fromEntries(
    Object.entries(res.perProcess).map(([id, m]) => [
      id,
      {
        startTime: unscale(m.startTime, scale),
        completionTime: unscale(m.completionTime, scale),
        turnaroundTime: unscale(m.turnaroundTime, scale),
        waitingTime: unscale(m.waitingTime, scale),
        responseTime: unscale(m.responseTime, scale),
      },
    ])
  ) as SimulationResult["perProcess"];

  const makespan = unscale(res.summary.makespan, scale);

  return {
    timeline: timelines[0] ?? [],
    timelines,
    perProcess,
    summary: {
      makespan,
      cpuUtilization: res.summary.cpuUtilization,
      throughput: makespan ? count / makespan : 0,
      avgWaitingTime: unscale(res.summary.avgWaitingTime, scale),
      avgTurnaroundTime: unscale(res.summary.avgTurnaroundTime, scale),
      avgResponseTime: unscale(res.summary.avgResponseTime, scale),
    },
  };
}

export function simulateMultiCore(opts: {
  processes: ProcessInput[];
  cores: number;
  strategy: Strategy;
  contextSwitch?: number;
  maxTicks?: number;
}): MultiCoreResult {
  const nums: number[] = [opts.cores];
  for (const p of opts.processes) nums.push(p.arrival, p.burst);
  if (opts.contextSwitch != null) nums.push(opts.contextSwitch);

  const scale = computeScale(nums, 2);

  if (scale === 1)
    return simulateInt(opts.processes, opts.cores, opts.strategy, opts);

  const scaledProcesses = opts.processes.map((p) => ({
    ...p,
    arrival: Math.max(0, scaleToInt(p.arrival, scale)),
    burst: Math.max(1, scaleToInt(p.burst, scale)),
  }));

  const resInt = simulateInt(
    scaledProcesses,
    Math.max(1, Math.floor(opts.cores)),
    opts.strategy,
    {
      ...opts,
      contextSwitch:
        opts.contextSwitch != null
          ? Math.max(0, scaleToInt(opts.contextSwitch, scale))
          : undefined,
    }
  );

  return unscaleResult(resInt, scale, opts.processes.length);
}
