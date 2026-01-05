import type {
  ProcessInput,
  Segment,
  SimulationResult,
  StrategyPolicy,
  SimState,
} from "@/Types/types";
import { computeScale, scaleToInt, unscale } from "./timeScale";

function pushOrMerge(timeline: Segment[], pid: string | null, time: number) {
  const last = timeline[timeline.length - 1];
  if (!last || last.pid !== pid || last.end !== time) {
    timeline.push({ pid, start: time, end: time + 1 });
  } else {
    last.end += 1;
  }
}

function simulateInt(
  processes: ProcessInput[],
  policy: StrategyPolicy,
  opts?: { quantum?: number; maxTicks?: number; contextSwitch?: number }
): SimulationResult {
  const quantum = opts?.quantum;
  const maxTicks = opts?.maxTicks ?? 200000;
  const contextSwitch = Math.max(0, Math.floor(opts?.contextSwitch ?? 0));

  const processesById: Record<string, ProcessInput> = Object.fromEntries(
    processes.map((p) => [p.id, p])
  );
  const sorted = [...processes].sort(
    (a, b) => a.arrival - b.arrival || a.id.localeCompare(b.id)
  );

  const state: SimState = {
    time: 0,
    running: null,
    ready: [],
    remaining: Object.fromEntries(processes.map((p) => [p.id, p.burst])),
    firstStart: Object.fromEntries(processes.map((p) => [p.id, null])),
    completion: Object.fromEntries(processes.map((p) => [p.id, null])),

    csRemaining: 0,
    csTo: null,
  };

  const timeline: Segment[] = [];
  let completedCount = 0;
  let nextArrivalIdx = 0;
  let lastExecutedPid: string | null = null;

  policy.init?.({ state, processesById, quantum });

  for (
    let guard = 0;
    guard < maxTicks && completedCount < processes.length;
    guard++
  ) {
    while (
      nextArrivalIdx < sorted.length &&
      sorted[nextArrivalIdx].arrival === state.time
    ) {
      const pid = sorted[nextArrivalIdx].id;
      state.ready.push(pid);
      policy.onArrive?.({
        state,
        pid,
        processesById,
        quantum,
        executedPid: null,
      });
      nextArrivalIdx++;
    }

    if (state.csRemaining > 0) {
      pushOrMerge(timeline, "CS-P", state.time);
      state.csRemaining -= 1;

      if (state.csRemaining === 0) {
        state.running = state.csTo;
        state.csTo = null;
      }

      policy.onTickEnd?.({ state, processesById, quantum, executedPid: null });
      lastExecutedPid = null;
      state.time += 1;
      continue;
    }

    const prevRunning = state.running;
    const prevExecuted = lastExecutedPid;
    const chosen = policy.decide({
      state,
      processesById,
      quantum,
      executedPid: null,
    });

    if (
      chosen !== state.running &&
      state.running &&
      state.remaining[state.running] > 0
    ) {
      state.ready.push(state.running);
    }

    if (chosen && chosen !== state.running) {
      const idx = state.ready.indexOf(chosen);
      if (idx >= 0) state.ready.splice(idx, 1);
    }

    if (contextSwitch > 0 && prevExecuted && chosen && chosen !== prevExecuted) {
      state.running = null;
      state.csTo = chosen;
      state.csRemaining = contextSwitch;

      pushOrMerge(timeline, "CS-P", state.time);
      state.csRemaining -= 1;

      if (state.csRemaining === 0) {
        state.running = state.csTo;
        state.csTo = null;
      }

      policy.onTickEnd?.({ state, processesById, quantum, executedPid: null });
      lastExecutedPid = null;
      state.time += 1;
      continue;
    }

    state.running = chosen;

    pushOrMerge(timeline, state.running, state.time);

    const executedPid = state.running;

    if (executedPid) {
      if (state.firstStart[executedPid] == null)
        state.firstStart[executedPid] = state.time;

      state.remaining[executedPid] -= 1;

      if (state.remaining[executedPid] === 0) {
        state.completion[executedPid] = state.time + 1;
        completedCount += 1;
        state.running = null;
      }
    }

    policy.onTickEnd?.({ state, processesById, quantum, executedPid });
    lastExecutedPid = executedPid ?? null;
    state.time += 1;
  }

  const makespan = timeline.length ? timeline[timeline.length - 1].end : 0;

  const totalBusy = timeline.reduce((sum, s) => {
    if (!s.pid) return sum;
    if (s.pid === "CS-P" || s.pid === "CS-T") return sum;
    return sum + (s.end - s.start);
  }, 0);

  const perProcess = Object.fromEntries(
    processes.map((p) => {
      const st = state.firstStart[p.id] ?? p.arrival;
      const ct = state.completion[p.id] ?? makespan;
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
    timeline,
    perProcess,
    summary: {
      makespan,
      cpuUtilization: makespan ? totalBusy / makespan : 0,
      throughput: makespan ? processes.length / makespan : 0,
      avgWaitingTime: avg(wts),
      avgTurnaroundTime: avg(tats),
      avgResponseTime: avg(rts),
    },
  };
}

function unscaleResult(
  res: SimulationResult,
  scale: number,
  count: number
): SimulationResult {
  const timeline = res.timeline.map((s) => ({
    ...s,
    start: unscale(s.start, scale),
    end: unscale(s.end, scale),
  }));

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
    timeline,
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

export function simulate(
  processes: ProcessInput[],
  policy: StrategyPolicy,
  opts?: { quantum?: number; maxTicks?: number; contextSwitch?: number }
): SimulationResult {
  const nums: number[] = [];
  for (const p of processes) nums.push(p.arrival, p.burst);
  if (opts?.quantum != null) nums.push(opts.quantum);
  if (opts?.contextSwitch != null) nums.push(opts.contextSwitch);

  const scale = computeScale(nums, 2);

  if (scale === 1) return simulateInt(processes, policy, opts);

  const scaledProcesses = processes.map((p) => ({
    ...p,
    arrival: Math.max(0, scaleToInt(p.arrival, scale)),
    burst: Math.max(1, scaleToInt(p.burst, scale)),
  }));

  const scaledOpts = {
    ...opts,
    quantum:
      opts?.quantum != null
        ? Math.max(1, scaleToInt(opts.quantum, scale))
        : undefined,
    contextSwitch:
      opts?.contextSwitch != null
        ? Math.max(0, scaleToInt(opts.contextSwitch, scale))
        : undefined,
  };

  const resInt = simulateInt(scaledProcesses, policy, scaledOpts);
  return unscaleResult(resInt, scale, processes.length);
}
