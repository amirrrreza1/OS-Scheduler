// src/Types/types.ts

export type Segment = {
  pid: string | null; // null => IDLE
  start: number;
  end: number;
};

export type ProcessInput = {
  id: string; // e.g., P1
  arrival: number; // can be decimal (wrapper scales)
  burst: number; // can be decimal (wrapper scales)
};

export type PerProcessMetrics = {
  startTime: number;
  completionTime: number;
  turnaroundTime: number;
  waitingTime: number;
  responseTime: number;
};

export type SimulationSummary = {
  makespan: number;
  cpuUtilization: number;
  throughput: number;
  avgWaitingTime: number;
  avgTurnaroundTime: number;
  avgResponseTime: number;
};

export type SimulationResult = {
  timeline: Segment[];
  perProcess: Record<string, PerProcessMetrics>;
  summary: SimulationSummary;
};

/**
 * Simulator mutable state for strategies
 * - You can store strategy-private fields on state (e.g., state._rrSliceLeft)
 */
export type SimState = {
  time: number;
  running: string | null;
  ready: string[];
  remaining: Record<string, number>;
  firstStart: Record<string, number | null>;
  completion: Record<string, number | null>;

  // process context switch handling (process-only simulator)
  csRemaining: number;
  csTo: string | null;

  // allow strategies to attach extra fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export type StrategyId =
  | "FCFS"
  | "LCFS"
  | "RR"
  | "SJF"
  | "SRT"
  | "HRRN"
  | "LPT"
  | "RPT";

export type StrategyContext = {
  state: SimState;
  processesById: Record<string, ProcessInput>;
  quantum?: number;
  executedPid?: string | null; // set by simulator each tick (important for RR)
};

export type StrategyPolicy = {
  id: StrategyId;
  titleFa: string;
  descriptionFa: string;
  requiresQuantum?: boolean;

  init?: (ctx: StrategyContext) => void;
  onArrive?: (ctx: StrategyContext & { pid: string }) => void;

  /**
   * Decide which PID should run *this tick*.
   * Return null => IDLE.
   */
  decide: (ctx: StrategyContext) => string | null;

  /**
   * Called after a tick is executed (or idle/CS tick).
   * executedPid is the PID that actually executed during the tick (may differ from state.running after completion).
   */
  onTickEnd?: (ctx: StrategyContext) => void;
};
