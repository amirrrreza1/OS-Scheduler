"use client";

import { Label } from "@/components/ui/label";
import { STRATEGIES } from "@/lib/Scheduler/registry";
import NumberInput from "../ui/Custom/Input/NumberInput";
import Select from "../ui/Custom/select";

export type StrategyId = (typeof STRATEGIES)[number]["id"];

export default function StrategySelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: StrategyId;
  onChange: (v: StrategyId) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onChange={(e) => onChange(e as StrategyId)}>
        {STRATEGIES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.titleFa}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function QuantumInput({
  quantum,
  setQuantum,
  enabled,
}: {
  quantum: number;
  setQuantum: (v: number) => void;
  enabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>Quantum</Label>
      <NumberInput
        value={quantum}
        onChange={(v) => setQuantum(v)}
        disabled={!enabled}
        min={1}
      />
    </div>
  );
}
