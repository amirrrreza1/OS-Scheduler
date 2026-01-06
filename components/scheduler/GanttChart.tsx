"use client";

import { useMemo, useState } from "react";
import type { Segment } from "@/Types/types";

type Props = {
  timeline: Segment[];
  unitPx?: number;
  barHeightPx?: number;
};

type ColorSet = { bg: string; border: string; text: string };

const IDLE: ColorSet = {
  bg: "bg-muted/40",
  border: "border-border",
  text: "text-muted-foreground",
};

const CS_PROCESS: ColorSet = {
  bg: "bg-amber-500/85",
  border: "border-amber-300/40",
  text: "text-amber-50",
};

const CS_THREAD: ColorSet = {
  bg: "bg-teal-500/85",
  border: "border-teal-300/40",
  text: "text-teal-50",
};

const PALETTE: ColorSet[] = [
  { bg: "bg-rose-500/85", border: "border-rose-300/40", text: "text-rose-50" },
  {
    bg: "bg-orange-500/85",
    border: "border-orange-300/40",
    text: "text-orange-50",
  },
  {
    bg: "bg-emerald-500/85",
    border: "border-emerald-300/40",
    text: "text-emerald-50",
  },
  { bg: "bg-cyan-500/85", border: "border-cyan-300/40", text: "text-cyan-50" },
  { bg: "bg-blue-500/85", border: "border-blue-300/40", text: "text-blue-50" },
  {
    bg: "bg-violet-500/85",
    border: "border-violet-300/40",
    text: "text-violet-50",
  },
];

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function colorForPid(pid: string | null): ColorSet {
  if (!pid) return IDLE;
  return PALETTE[hashString(pid) % PALETTE.length];
}

function segmentInfo(pid: string | null) {
  if (!pid)
    return { label: "IDLE", barLabel: "IDLE", color: IDLE, isCS: false };
  if (pid === "CS-P")
    return {
      label: "CS (Process)",
      barLabel: "CS-P",
      color: CS_PROCESS,
      isCS: true,
    };
  if (pid === "CS-T")
    return {
      label: "CS (Thread)",
      barLabel: "CS-T",
      color: CS_THREAD,
      isCS: true,
    };
  return { label: pid, barLabel: pid, color: colorForPid(pid), isCS: false };
}

function formatTime(t: number) {
  const s = Number.isInteger(t) ? `${t}` : t.toFixed(2);
  return s.replace(/\.00$/, "");
}

function chooseTickStep(span: number) {
  const candidates = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
  for (const step of candidates) if (span / step <= 22) return step;
  return 100;
}

type HoverInfo = {
  label: string;
  start: number;
  end: number;
  dur: number;
};

export default function GanttChart({
  timeline,
  unitPx = 70,
  barHeightPx = 45,
}: Props) {
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const minT = timeline[0].start;
  const maxT = timeline[timeline.length - 1].end;
  const span = Math.max(0, maxT - minT);

  const widthPx = Math.max(1, span) * unitPx;

  const step = chooseTickStep(span);
  const startTick = Math.floor(minT / step) * step;
  const endTick = Math.ceil(maxT / step) * step;

  const onMove = (e: React.MouseEvent) =>
    setPos({ x: e.clientX, y: e.clientY });

  const ticks = useMemo(() => {
    const out: { t: number; left: number; major: boolean }[] = [];
    let idx = 0;
    for (let t = startTick; t <= endTick + 1e-9; t += step) {
      const left = (t - minT) * unitPx;
      const major = idx % 5 === 0;
      out.push({ t, left, major });
      idx++;
    }
    return out;
  }, [startTick, endTick, step, minT, unitPx]);

  if (!timeline?.length) {
    return (
      <div className="rounded-xl border border-border bg-muted/10 p-4 text-sm text-muted-foreground">
        نمودار گانت برای نمایش وجود ندارد.
      </div>
    );
  }

  return (
    <div className="space-y-3" dir="ltr">
      {hover ? (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: pos.x + 12, top: pos.y + 12 }}
        >
          <div className="rounded-lg border border-border bg-background/95 backdrop-blur px-3 py-2 shadow-lg">
            <div className="text-xs font-semibold text-foreground" dir="rtl">
              {hover.label}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground" dir="ltr">
              {formatTime(hover.start)} → {formatTime(hover.end)}{" "}
              <span className="opacity-80">
                ( زمان اجرا: {formatTime(hover.dur)} ثانیه)
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border bg-muted/10 p-3">
        <div dir="ltr" className="mb-2">
          <div
            className="relative"
            style={{ width: widthPx, minWidth: widthPx }}
          >
            <div className="h-px w-full bg-border" />
            <div className="relative mt-1 h-7">
              {ticks.map(({ t, left, major }) => (
                <div key={`${t}`} className="absolute top-0" style={{ left }}>
                  <div
                    className={`w-px ${
                      major ? "h-4 bg-foreground/40" : "h-2 bg-border"
                    }`}
                  />
                  {major ? (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {formatTime(t)}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          dir="ltr"
          className="relative"
          style={{ width: widthPx, minWidth: widthPx, height: barHeightPx }}
          onMouseMove={onMove}
        >
          {timeline.map((s, idx) => {
            const dur = s.end - s.start;
            const w = dur * unitPx;
            const left = (s.start - minT) * unitPx;

            const info = segmentInfo(s.pid);
            const label = info.label;
            const barLabel = info.barLabel;
            const c = info.color;

            const wGapped = Math.max(0, w - 0);

            const showText = wGapped >= (info.isCS ? 40 : 70);

            return (
              <div
                key={`${idx}-${s.pid ?? "IDLE"}-${s.start}-${s.end}`}
                className={[
                  "absolute top-0 flex items-center justify-center select-none",
                  "border shadow-sm rounded-lg",
                  "transition-transform hover:-translate-y-px hover:shadow-md",
                  "cursor-help",
                  c.bg,
                  c.border,
                  c.text,
                ].join(" ")}
                style={{
                  left,
                  width: wGapped,
                  minWidth: wGapped,
                  height: barHeightPx,
                }}
                onMouseEnter={(e) => {
                  setHover({ label, start: s.start, end: s.end, dur });
                  setPos({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => setHover(null)}
              >
                {showText ? (
                  <div className="relative flex flex-col items-center leading-tight">
                    <div className="text-sm font-semibold" dir="ltr">
                      {barLabel}
                    </div>
                    <div className="text-[11px] opacity-90" dir="ltr">
                      {formatTime(s.start)} → {formatTime(s.end)}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
