export default function Card({
  title,
  subtitle,
  icon,
  children,
  right,
}: {
  title: string;
  subtitle?: string | null;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const hasSubtitle = Boolean(subtitle);

  return (
    <section className="rounded-2xl border border-border bg-card">
      <div
        className={[
          "flex justify-between gap-4 border-b border-border px-4 py-3",
          hasSubtitle ? "items-start" : "items-center",
        ].join(" ")}
      >
        <div
          className={[
            "flex gap-3",
            hasSubtitle ? "items-start" : "items-center",
          ].join(" ")}
        >
          {icon ? (
            <div
              className={`
                grid h-9 w-9 place-items-center rounded-xl border border-border bg-background
                ${hasSubtitle ? "mt-0.5" : ""}`}
            >
              {icon}
            </div>
          ) : null}

          <div className={hasSubtitle ? "space-y-1.5" : ""}>
            <div
              className={`font-semibold text-foreground leading-none ${
                hasSubtitle ? "text-sm" : "text-base"
              }`}
            >
              {title}
            </div>

            {subtitle ? (
              <div className="text-xs text-muted-foreground">{subtitle}</div>
            ) : null}
          </div>
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <div className="p-4">{children}</div>
    </section>
  );
}
