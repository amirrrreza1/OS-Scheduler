export default function NumberInput({
  value,
  onChange,
  min = 1,
  step,
  disabled,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  step?: number | "any";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <input
      type="number"
      min={min}
      step={step}
      value={disabled ? 0 : value}
      onChange={(e) => onChange(Number(e.target.value))}
      onFocus={(e) => {
        if (!disabled) e.currentTarget.select();
      }}
      onMouseUp={(e) => {
        if (!disabled) e.preventDefault();
      }}
      className={`${className} h-10 w-full text-left appearance-none rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-foreground/20 ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      disabled={disabled}
    />
  );
}
