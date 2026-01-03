export type Segment = {
  pid: string | null;
  start: number;
  end: number;
};

export type ProcessInput = {
  id: string;
  arrival: number;
  burst: number;
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

export type SimState = {
  time: number;
  running: string | null;
  ready: string[];
  remaining: Record<string, number>;
  firstStart: Record<string, number | null>;
  completion: Record<string, number | null>;
  csRemaining: number;
  csTo: string | null;

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
  executedPid?: string | null;
};

export type StrategyPolicy = {
  id: StrategyId;
  titleFa: string;
  descriptionFa: string;
  requiresQuantum?: boolean;

  init?: (ctx: StrategyContext) => void;
  onArrive?: (ctx: StrategyContext & { pid: string }) => void;
  decide: (ctx: StrategyContext) => string | null;
  onTickEnd?: (ctx: StrategyContext) => void;
};
