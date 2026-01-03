export default function Button({
  children,
  onClick,
  disabled,
  variant = "secondary",
  size = "md",
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  title?: string;
}) {
  const base =
    "flex items-center justify-center gap-2 rounded-lg border text-sm transition-colors " +
    "focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed " +
    (disabled ? "cursor-not-allowed !opacity-50" : "cursor-pointer");

  const sizes = size === "sm" ? "h-9 leading-9 px-3" : "h-10 leading-10 px-4";

  const variants: Record<typeof variant, string> = {
    primary: `border-foreground/20 bg-foreground text-background hover:bg-foreground/90 ${
      disabled ? "!hover:bg-foreground" : ""
    }`,
    secondary: `border-border bg-background text-foreground hover:bg-muted/40 ${
      disabled ? "!hover:bg-background" : ""
    }`,
    danger: `border-destructive/30 bg-destructive text-destructive-foreground hover:opacity-90 ${
      disabled ? "hover:bg-destructive" : ""
    }`,
    ghost: `border-transparent bg-transparent text-foreground hover:bg-muted/30 ${
      disabled ? "hover:bg-transparent" : ""
    }`,
  };

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`${base} ${sizes} ${variants[variant]}`}
    >
      {children}
    </button>
  );
}
