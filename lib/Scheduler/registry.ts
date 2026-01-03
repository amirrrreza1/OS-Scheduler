import type {
  ProcessInput,
  SimState,
  StrategyId,
  StrategyPolicy,
} from "@/Types/types";

export const STRATEGIES: { id: StrategyId; titleFa: string }[] = [
  { id: "FCFS", titleFa: "FCFS" },
  { id: "LCFS", titleFa: "LCFS" },
  { id: "RR", titleFa: "Round Robin" },
  { id: "SJF", titleFa: "SJF" },
  { id: "SRT", titleFa: "SRT" },
  { id: "HRRN", titleFa: "HRRN" },
  { id: "LPT", titleFa: "LPT" },
  { id: "RPT", titleFa: "RPT" },
];

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

function fifo(state: SimState): string | null {
  if (state.running) return state.running;
  if (state.ready.length === 0) return null;
  return state.ready[0];
}

function lcfs(state: SimState): string | null {
  if (state.running) return state.running;
  if (state.ready.length === 0) return null;
  return state.ready[state.ready.length - 1];
}

function sjf(
  state: SimState,
  processesById: Record<string, ProcessInput>
): string | null {
  if (state.running) return state.running;
  if (state.ready.length === 0) return null;
  return pickMin(state.ready, (pid) => processesById[pid].burst);
}

function lpt(
  state: SimState,
  processesById: Record<string, ProcessInput>
): string | null {
  if (state.running) return state.running;
  if (state.ready.length === 0) return null;
  return pickMax(state.ready, (pid) => processesById[pid].burst);
}

function hrrn(
  state: SimState,
  processesById: Record<string, ProcessInput>
): string | null {
  if (state.running) return state.running
  if (state.ready.length === 0) return null;

  const t = state.time;
  return pickMax(state.ready, (pid) => {
    const at = processesById[pid].arrival;
    const bt = processesById[pid].burst;
    const wait = Math.max(0, t - at);
    return (wait + bt) / bt;
  });
}

function srt(state: SimState): string | null {
  const candidates = state.running
    ? [...state.ready, state.running]
    : [...state.ready];
  if (candidates.length === 0) return null;
  return pickMin(candidates, (pid) => state.remaining[pid]);
}

function rpt(state: SimState): string | null {
  const candidates = state.running
    ? [...state.ready, state.running]
    : [...state.ready];
  if (candidates.length === 0) return null;
  return pickMax(candidates, (pid) => state.remaining[pid]);
}

function rrInit(state: SimState, quantum: number) {
  state._rrQuantum = quantum;
  state._rrSliceLeft = 0;
  state._rrCurrent = null;
}

function rrDecide(state: SimState, quantum: number): string | null {
  if (state.running && (state._rrSliceLeft ?? 0) > 0) return state.running;
  if (state.ready.length === 0) return state.running ?? null;

  const next = state.ready[0];
  state._rrSliceLeft = quantum;
  state._rrCurrent = next;
  return next;
}

function rrOnTickEnd(state: SimState, executedPid: string | null | undefined) {
  if (!executedPid) return;

  state._rrSliceLeft = Math.max(0, (state._rrSliceLeft ?? 0) - 1);

  if (state.remaining[executedPid] <= 0) {
    state._rrSliceLeft = 0;
    return;
  }

  if (state._rrSliceLeft === 0) {
    state.ready.push(executedPid);
    if (state.running === executedPid) state.running = null;
  }
}

export function getStrategy(id: StrategyId, quantum: number): StrategyPolicy {
  switch (id) {
    case "FCFS":
      return {
        id,
        titleFa: "FCFS",
        descriptionFa:
          "پردازش‌ها دقیقاً به ترتیب زمان ورود (Arrival) اجرا می‌شوند. وقتی یک پردازش شروع شد تا پایان اجرا ادامه می‌دهد (Non-preemptive).",
        decide: ({ state }) => fifo(state),
      };

    case "LCFS":
      return {
        id,
        titleFa: "LCFS",
        descriptionFa:
          "آخرین پردازشی که وارد صف آماده (Ready Queue) شده، زودتر از بقیه انتخاب می‌شود. اجرای پردازش قطع نمی‌شود و تا پایان ادامه دارد (Non-preemptive).",
        decide: ({ state }) => lcfs(state),
      };

    case "SJF":
      return {
        id,
        titleFa: "SJF",
        descriptionFa:
          "در هر بار انتخاب CPU، پردازشی که Burst Time کوتاه‌تری دارد انتخاب می‌شود. بعد از شروع، پردازش تا پایان اجرا قطع نمی‌شود (Non-preemptive).",
        decide: ({ state, processesById }) => sjf(state, processesById),
      };

    case "LPT":
      return {
        id,
        titleFa: "LPT",
        descriptionFa:
          "در هر بار انتخاب CPU، پردازشی که Burst Time طولانی‌تری دارد انتخاب می‌شود. پس از شروع، اجرای آن تا پایان قطع نمی‌شود (Non-preemptive).",
        decide: ({ state, processesById }) => lpt(state, processesById),
      };

    case "HRRN":
      return {
        id,
        titleFa: "HRRN",
        descriptionFa:
          "پردازشی انتخاب می‌شود که نسبت پاسخ (Response Ratio) بیشتری دارد: (Waiting Time + Burst Time) / Burst Time. این روش بین «کوتاه بودن» و «زمان انتظار» تعادل ایجاد می‌کند (Non-preemptive).",
        decide: ({ state, processesById }) => hrrn(state, processesById),
      };

    case "SRT":
      return {
        id,
        titleFa: "SRT",
        descriptionFa:
          "همیشه پردازشی اجرا می‌شود که کمترین زمان باقی‌مانده (Remaining Time) را دارد. اگر پردازشی با زمان باقی‌مانده کمتر وارد شود، پردازش جاری قطع می‌شود (Preemptive).",
        decide: ({ state }) => srt(state),
      };

    case "RPT":
      return {
        id,
        titleFa: "RPT",
        descriptionFa:
          "همیشه پردازشی اجرا می‌شود که بیشترین زمان باقی‌مانده (Remaining Time) را دارد. با ورود پردازش‌های جدید ممکن است انتخاب تغییر کند (Preemptive).",
        decide: ({ state }) => rpt(state),
      };

    case "RR":
      return {
        id,
        titleFa: "RR",
        descriptionFa:
          "هر پردازش به اندازه‌ی Quantum اجرا می‌شود. اگر در این مدت تمام نشود، قطع شده و به انتهای صف آماده برمی‌گردد تا نوبت بعدی برسد (Preemptive).",
        requiresQuantum: true,
        init: ({ state }) =>
          rrInit(state, Math.max(1, Math.floor(quantum || 1))),
        decide: ({ state }) =>
          rrDecide(state, Math.max(1, Math.floor(quantum || 1))),
        onTickEnd: ({ state, executedPid }) => rrOnTickEnd(state, executedPid),
      };

    default: {
      const _never: never = id;
      return _never;
    }
  }
}
