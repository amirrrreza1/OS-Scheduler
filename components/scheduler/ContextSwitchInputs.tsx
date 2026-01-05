"use client";

import Label from "@/components/ui/Custom/Label";
import NumberInput from "@/components/ui/Custom/Input/NumberInput";

export default function ContextSwitchInputs({
  processSwitch,
  setProcessSwitch,
  threadSwitch,
  setThreadSwitch,
  showThread = false,
}: {
  processSwitch: number;
  setProcessSwitch: (v: number) => void;
  threadSwitch?: number;
  setThreadSwitch?: (v: number) => void;
  showThread?: boolean;
}) {
  return (
    <div className={`grid gap-6 ${showThread ? "grid-cols-2" : ""}`}>
      <div className="space-y-2">
        <Label>CS (فرایند)</Label>
        <NumberInput
          value={processSwitch}
          onChange={setProcessSwitch}
          min={0}
          step="any"
        />
      </div>

      {showThread ? (
        <div className="space-y-2">
          <Label>CS (نخ)</Label>
          <NumberInput
            value={threadSwitch ?? 0}
            onChange={(v) => setThreadSwitch?.(v)}
            min={0}
            step="any"
          />
        </div>
      ) : null}
    </div>
  );
}
