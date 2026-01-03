"use client";

import Card from "@/components/ui/Custom/Card";
import { getStrategy, STRATEGIES } from "@/lib/Scheduler/registry";

import { BookOpen, Info } from "lucide-react";

export default function HelpTab() {
  return (
    <Card
      title="توضیح الگوریتم‌ها"
      subtitle="شرح کوتاه هر الگوریتم زمان‌بندی و کاربرد کلی آن"
      icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
    >
      <div className="space-y-3">
        {STRATEGIES.map((s) => {
          const policy = getStrategy(s.id, 1);

          return (
            <div
              key={s.id}
              className="rounded-xl border border-border bg-muted/10 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="font-medium">{policy.titleFa}</div>
                <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-lg border border-border bg-background">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="mt-1 text-sm text-muted-foreground">
                {policy.descriptionFa}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
