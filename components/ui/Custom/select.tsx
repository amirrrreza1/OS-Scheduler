import { ChevronDown } from "lucide-react";

export default function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        className="h-10 w-full appearance-none rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none
                 focus:ring-2 focus:ring-foreground/20"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
      <ChevronDown
        className="
          pointer-events-none absolute top-1/2 -translate-y-1/2
          left-2 h-4 w-4 text-muted-foreground
        "
      />
    </div>
  );
}
