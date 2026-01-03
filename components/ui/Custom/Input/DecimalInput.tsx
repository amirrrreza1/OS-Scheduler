export default function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      dir="ltr"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-9 w-full max-w-28 bg-black rounded-lg text-right border border-border px-3 text-sm text-foreground outline-none
                 placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-foreground/20"
    />
  );
}
