// src/lib/scheduler/simulateThreads.ts
// Hierarchical scheduling (Process strategy + Thread strategy)
// NO context switch at all (no CS-P/CS-T, no costs).
// Supports decimals by scaling to integer ticks (2 decimals cap).

import type { Segment, SimulationResult, StrategyId } from "@/Types/types";
import { computeScale, scaleToInt, unscale } from "./timeScale";

export type ThreadInput = { tid: string; arrival: number; burst: number };
export type ProcessThreadsInput = { pid: string; threads: ThreadInput[] };

type Meta = { arrival: number; burst: number };

function pushOrMerge(timeline: Segment[], pid: string | null, time: number) {
  const last = timeline[timeline.length - 1];
  if (!last || last.pid !== pid || last.end !== time)
    timeline.push({ pid, start: time, end: time + 1 });
  else last.end += 1;
}

function removeOnce<T>(arr: T[], item: T) {
  const i = arr.indexOf(item);
  if (i >= 0) arr.splice(i, 1);
}

function cleanupThreadQueue(
  queue: string[],
  remaining: Record<string, number>
) {
  for (let i = queue.length - 1; i >= 0; i--) {
    if ((remaining[queue[i]] ?? 0) <= 0) queue.splice(i, 1);
  }
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

function chooseNonRR(
  strategy: StrategyId,
  readyQueue: string[],
  running: string | null,
  meta: Record<string, Meta>,
  remaining: Record<string, number>,
  time: number
): string | null {
  const nonPreemptive =
    strategy === "FCFS" ||
    strategy === "LCFS" ||
    strategy === "SJF" ||
    strategy === "HRRN" ||
    strategy === "LPT";

  if (nonPreemptive && running) return running;
  if (readyQueue.length === 0) return running ?? null;

  if (strategy === "FCFS") return readyQueue[0] ?? running ?? null;
  if (strategy === "LCFS")
    return readyQueue[readyQueue.length - 1] ?? running ?? null;

  if (strategy === "SJF") return pickMin(readyQueue, (id) => meta[id].burst);
  if (strategy === "LPT") return pickMax(readyQueue, (id) => meta[id].burst);

  if (strategy === "HRRN") {
    return pickMax(readyQueue, (id) => {
      const wait = Math.max(0, time - meta[id].arrival);
      return (wait + meta[id].burst) / meta[id].burst;
    });
  }

  const candidates = running ? [...readyQueue, running] : [...readyQueue];

  if (strategy === "SRT") return pickMin(candidates, (id) => remaining[id]);
  if (strategy === "RPT") return pickMax(candidates, (id) => remaining[id]);

  return readyQueue[0] ?? running ?? null;
}

function isProcessRunnable(
  pid: string,
  runningThreadKey: string | null,
  threadRemaining: Record<string, number>,
  readyThreadsByPid: Record<string, string[]>
) {
  const runningInPid =
    runningThreadKey &&
    runningThreadKey.startsWith(pid + ":") &&
    (threadRemaining[runningThreadKey] ?? 0) > 0;

  if (runningInPid) return true;

  const q = readyThreadsByPid[pid] ?? [];
  for (const key of q) {
    if ((threadRemaining[key] ?? 0) > 0) return true;
  }
  return false;
}

function safeInt(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function simulateThreadsInt(opts: {
  processes: ProcessThreadsInput[];
  processStrategy: StrategyId;
  threadStrategy: StrategyId;
  processQuantum?: number;
  threadQuantum?: number;
  maxTicks?: number;
}): SimulationResult {
  const maxTicks = safeInt(opts.maxTicks ?? 200000, 200000);

  const procQ = Math.max(1, safeInt(opts.processQuantum ?? 2, 2));
  const thrQ = Math.max(1, safeInt(opts.threadQuantum ?? 2, 2));

  // ---- Meta / Remaining ----
  const threadMeta: Record<string, Meta> = {};
  const threadRemaining: Record<string, number> = {};
  const threadFirstStart: Record<string, number | null> = {};
  const threadCompletion: Record<string, number | null> = {};

  const processMeta: Record<string, Meta> = {};
  const processRemaining: Record<string, number> = {};

  for (const p of opts.processes) {
    const pArrival = Math.min(...p.threads.map((t) => t.arrival));
    const pBurst = p.threads.reduce((s, t) => s + t.burst, 0);
    processMeta[p.pid] = { arrival: pArrival, burst: pBurst };
    processRemaining[p.pid] = pBurst;

    for (const t of p.threads) {
      const key = `${p.pid}:${t.tid}`;
      threadMeta[key] = { arrival: t.arrival, burst: t.burst };

      const b = Number.isFinite(t.burst) ? t.burst : 1;
      threadRemaining[key] = Math.max(1, Math.floor(b)); // int ticks in this function

      threadFirstStart[key] = null;
      threadCompletion[key] = null;
    }
  }

  const totalThreads = Object.keys(threadMeta).length;

  const arrivals = Object.keys(threadMeta)
    .map((key) => ({
      key,
      pid: key.split(":")[0],
      arrival: threadMeta[key].arrival,
    }))
    .sort((a, b) => a.arrival - b.arrival || a.key.localeCompare(b.key));

  // ---- Ready queues ----
  const readyThreadsByPid: Record<string, string[]> = {};
  for (const p of opts.processes) readyThreadsByPid[p.pid] = [];

  const readyProcQueue: string[] = [];
  const enqueueProc = (pid: string, runningPid: string | null) => {
    if (pid === runningPid) return;
    const i = readyProcQueue.indexOf(pid);
    if (i >= 0) readyProcQueue.splice(i, 1);
    readyProcQueue.push(pid);
  };

  let time = 0;
  let runningPid: string | null = null;
  let runningThreadKey: string | null = null;

  let procQuantumLeft = procQ;
  let thrQuantumLeft = thrQ;

  const timeline: Segment[] = [];

  let nextArrivalIdx = 0;
  let completedThreads = 0;

  for (
    let guard = 0;
    guard < maxTicks && completedThreads < totalThreads;
    guard++
  ) {
    // arrivals
    while (
      nextArrivalIdx < arrivals.length &&
      arrivals[nextArrivalIdx].arrival === time
    ) {
      const { key, pid } = arrivals[nextArrivalIdx];
      readyThreadsByPid[pid].push(key);

      if (
        isProcessRunnable(
          pid,
          runningThreadKey,
          threadRemaining,
          readyThreadsByPid
        )
      ) {
        enqueueProc(pid, runningPid);
      }

      nextArrivalIdx++;
    }

    // cleanup queues
    for (const pid of Object.keys(readyThreadsByPid))
      cleanupThreadQueue(readyThreadsByPid[pid], threadRemaining);
    for (let i = readyProcQueue.length - 1; i >= 0; i--) {
      const pid = readyProcQueue[i];
      if (
        !isProcessRunnable(
          pid,
          runningThreadKey,
          threadRemaining,
          readyThreadsByPid
        )
      )
        readyProcQueue.splice(i, 1);
    }

    // recompute processRemaining
    for (const pid of Object.keys(processRemaining)) {
      let sum = 0;
      for (const key of Object.keys(threadMeta)) {
        if (key.startsWith(pid + ":")) sum += threadRemaining[key] ?? 0;
      }
      processRemaining[pid] = sum;
    }

    // if runningPid became unrunnable
    if (
      runningPid &&
      !isProcessRunnable(
        runningPid,
        runningThreadKey,
        threadRemaining,
        readyThreadsByPid
      )
    ) {
      runningPid = null;
      runningThreadKey = null;
      procQuantumLeft = procQ;
      thrQuantumLeft = thrQ;
    }

    // process RR quantum expiry: rotate process
    if (opts.processStrategy === "RR" && runningPid && procQuantumLeft <= 0) {
      if (runningThreadKey && (threadRemaining[runningThreadKey] ?? 0) > 0) {
        readyThreadsByPid[runningPid].push(runningThreadKey);
        runningThreadKey = null;
      }

      if (
        isProcessRunnable(runningPid, null, threadRemaining, readyThreadsByPid)
      ) {
        enqueueProc(runningPid, null);
      }

      runningPid = null;
      procQuantumLeft = procQ;
      thrQuantumLeft = thrQ;
    }

    // ---- Choose process ----
    let chosenPid: string | null = null;

    if (opts.processStrategy === "RR") {
      if (
        runningPid &&
        procQuantumLeft > 0 &&
        isProcessRunnable(
          runningPid,
          runningThreadKey,
          threadRemaining,
          readyThreadsByPid
        )
      ) {
        chosenPid = runningPid;
      } else {
        chosenPid = readyProcQueue[0] ?? null;
      }
    } else {
      chosenPid = chooseNonRR(
        opts.processStrategy,
        readyProcQueue,
        runningPid,
        processMeta,
        processRemaining,
        time
      );
    }

    if (!chosenPid) {
      pushOrMerge(timeline, null, time);
      time += 1;
      continue;
    }

    const readyThreads = readyThreadsByPid[chosenPid] ?? [];

    const runningThreadInChosen: string | null =
      runningThreadKey &&
      runningThreadKey.startsWith(chosenPid + ":") &&
      (threadRemaining[runningThreadKey] ?? 0) > 0
        ? runningThreadKey
        : null;

    let chosenThread: string | null = null;

    if (opts.threadStrategy === "RR") {
      if (runningThreadInChosen && thrQuantumLeft > 0)
        chosenThread = runningThreadInChosen;
      else chosenThread = readyThreads[0] ?? runningThreadInChosen ?? null;
    } else {
      chosenThread = chooseNonRR(
        opts.threadStrategy,
        readyThreads,
        runningThreadInChosen,
        threadMeta,
        threadRemaining,
        time
      );
    }

    if (!chosenThread) {
      removeOnce(readyProcQueue, chosenPid);
      pushOrMerge(timeline, null, time);
      time += 1;
      continue;
    }

    // ---- Preemption bookkeeping ----
    if (runningPid && chosenPid !== runningPid) {
      // switching process: requeue running thread (if any)
      if (runningThreadKey && (threadRemaining[runningThreadKey] ?? 0) > 0) {
        readyThreadsByPid[runningPid].push(runningThreadKey);
        runningThreadKey = null;
      }
      if (
        isProcessRunnable(runningPid, null, threadRemaining, readyThreadsByPid)
      )
        enqueueProc(runningPid, chosenPid);
    } else if (runningPid && chosenPid === runningPid) {
      // switching thread in same process
      if (
        runningThreadInChosen &&
        chosenThread !== runningThreadInChosen &&
        (threadRemaining[runningThreadInChosen] ?? 0) > 0
      ) {
        readyThreadsByPid[chosenPid].push(runningThreadInChosen);
        runningThreadKey = null;
      }
    }

    // reserve chosen from queues
    if (chosenPid !== runningPid) removeOnce(readyProcQueue, chosenPid);
    if (chosenThread !== runningThreadInChosen)
      removeOnce(readyThreadsByPid[chosenPid], chosenThread);

    // ---- Execute one tick ----
    if (opts.processStrategy === "RR" && chosenPid !== runningPid)
      procQuantumLeft = procQ;
    if (opts.threadStrategy === "RR" && chosenThread !== runningThreadInChosen)
      thrQuantumLeft = thrQ;

    runningPid = chosenPid;
    runningThreadKey = chosenThread;

    pushOrMerge(timeline, chosenThread, time);

    if (threadFirstStart[chosenThread] == null)
      threadFirstStart[chosenThread] = time;

    threadRemaining[chosenThread] -= 1;

    if (opts.threadStrategy === "RR")
      thrQuantumLeft = Math.max(0, thrQuantumLeft - 1);
    if (opts.processStrategy === "RR")
      procQuantumLeft = Math.max(0, procQuantumLeft - 1);

    // completion
    if (threadRemaining[chosenThread] === 0) {
      threadCompletion[chosenThread] = time + 1;
      completedThreads += 1;

      runningThreadKey = null;
      thrQuantumLeft = thrQ;
    } else {
      // thread RR slice over
      if (opts.threadStrategy === "RR" && thrQuantumLeft === 0) {
        readyThreadsByPid[chosenPid].push(chosenThread);
        runningThreadKey = null;
        thrQuantumLeft = thrQ;
      }
    }

    // process RR slice over
    if (opts.processStrategy === "RR" && procQuantumLeft === 0) {
      if (runningThreadKey && (threadRemaining[runningThreadKey] ?? 0) > 0) {
        readyThreadsByPid[chosenPid].push(runningThreadKey);
        runningThreadKey = null;
        thrQuantumLeft = thrQ;
      }

      if (
        isProcessRunnable(
          chosenPid,
          runningThreadKey,
          threadRemaining,
          readyThreadsByPid
        )
      ) {
        enqueueProc(chosenPid, null);
      }

      runningPid = null;
      procQuantumLeft = procQ;
    } else {
      // ensure process stays available if it still has work and isn't running
      if (
        !runningPid &&
        isProcessRunnable(chosenPid, null, threadRemaining, readyThreadsByPid)
      )
        enqueueProc(chosenPid, null);
    }

    time += 1;
  }

  const makespan = timeline.length ? timeline[timeline.length - 1].end : 0;

  const totalBusy = timeline.reduce((sum, s) => {
    if (!s.pid) return sum; // idle
    return sum + (s.end - s.start);
  }, 0);

  const perProcess: SimulationResult["perProcess"] = {};
  for (const key of Object.keys(threadMeta)) {
    const at = threadMeta[key].arrival;
    const bt = threadMeta[key].burst;

    const st = threadFirstStart[key] ?? at;
    const ct = threadCompletion[key] ?? makespan;

    const tat = ct - at;
    const wt = tat - bt;
    const rt = st - at;

    perProcess[key] = {
      startTime: st,
      completionTime: ct,
      turnaroundTime: tat,
      waitingTime: wt,
      responseTime: rt,
    };
  }

  const avg = (xs: number[]) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const wts = Object.values(perProcess).map((m) => m.waitingTime);
  const tats = Object.values(perProcess).map((m) => m.turnaroundTime);
  const rts = Object.values(perProcess).map((m) => m.responseTime);

  return {
    timeline,
    perProcess,
    summary: {
      makespan,
      cpuUtilization: makespan ? totalBusy / makespan : 0,
      throughput: makespan ? totalThreads / makespan : 0,
      avgWaitingTime: avg(wts),
      avgTurnaroundTime: avg(tats),
      avgResponseTime: avg(rts),
    },
  };
}

export function simulateThreads(opts: {
  processes: ProcessThreadsInput[];
  processStrategy: StrategyId;
  threadStrategy: StrategyId;
  processQuantum?: number;
  threadQuantum?: number;
  maxTicks?: number;
}): SimulationResult {
  const nums: number[] = [];

  for (const p of opts.processes)
    for (const t of p.threads) nums.push(t.arrival, t.burst);
  if (opts.processQuantum != null) nums.push(opts.processQuantum);
  if (opts.threadQuantum != null) nums.push(opts.threadQuantum);

  const scale = computeScale(nums, 2);

  if (scale === 1) return simulateThreadsInt(opts);

  const scaled = {
    ...opts,
    processes: opts.processes.map((p) => ({
      ...p,
      threads: p.threads.map((t) => ({
        ...t,
        arrival: Math.max(0, scaleToInt(t.arrival, scale)),
        burst: Math.max(1, scaleToInt(t.burst, scale)),
      })),
    })),
    processQuantum:
      opts.processQuantum != null
        ? Math.max(1, scaleToInt(opts.processQuantum, scale))
        : undefined,
    threadQuantum:
      opts.threadQuantum != null
        ? Math.max(1, scaleToInt(opts.threadQuantum, scale))
        : undefined,
  };

  const resInt = simulateThreadsInt(scaled);

  const timeline = resInt.timeline.map((s) => ({
    ...s,
    start: unscale(s.start, scale),
    end: unscale(s.end, scale),
  }));

  const perProcess = Object.fromEntries(
    Object.entries(resInt.perProcess).map(([id, m]) => [
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

  const makespan = unscale(resInt.summary.makespan, scale);
  const count = Object.keys(perProcess).length;

  return {
    timeline,
    perProcess,
    summary: {
      makespan,
      cpuUtilization: resInt.summary.cpuUtilization,
      throughput: makespan ? count / makespan : 0,
      avgWaitingTime: unscale(resInt.summary.avgWaitingTime, scale),
      avgTurnaroundTime: unscale(resInt.summary.avgTurnaroundTime, scale),
      avgResponseTime: unscale(resInt.summary.avgResponseTime, scale),
    },
  };
}
