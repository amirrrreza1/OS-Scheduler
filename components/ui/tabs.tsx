"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      dir="rtl"
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const [indicator, setIndicator] = React.useState({
    x: 0,
    w: 0,
    visible: false,
  });

  const updateIndicator = React.useCallback(() => {
    const list = listRef.current;
    if (!list) return;

    const active = list.querySelector<HTMLElement>('[data-state="active"]');
    if (!active) {
      setIndicator((p) => ({ ...p, visible: false }));
      return;
    }

    const listRect = list.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();

    setIndicator({
      x: activeRect.left - listRect.left + list.scrollLeft,
      w: activeRect.width,
      visible: true,
    });
  }, []);

  React.useLayoutEffect(() => {
    updateIndicator();

    const list = listRef.current;
    if (!list) return;

    const ro = new ResizeObserver(() => updateIndicator());
    ro.observe(list);

    const mo = new MutationObserver(() => updateIndicator());
    mo.observe(list, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });

    list.addEventListener("scroll", updateIndicator, { passive: true });
    window.addEventListener("resize", updateIndicator);

    return () => {
      ro.disconnect();
      mo.disconnect();
      list.removeEventListener("scroll", updateIndicator);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [updateIndicator]);

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      className={cn(
        "relative bg-black text-muted-foreground inline-flex h-9 w-full items-center justify-start rounded-lg p-[3px] overflow-x-auto overflow-y-hidden sm:w-fit sm:justify-center sm:overflow-visible",
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-[3px] bottom-[3px] left-0 rounded-md shadow-sm",
          "bg-background dark:bg-input/30",
          "transition-[transform,width,opacity] duration-200 ease-out will-change-transform"
        )}
        style={{
          width: indicator.w,
          transform: `translateX(${indicator.x}px)`,
          opacity: indicator.visible ? 1 : 0,
        }}
      />

      {children}
    </TabsPrimitive.List>
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative z-10 inline-flex h-[calc(100%-1px)] flex-none shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap sm:flex-1",
        "text-foreground dark:text-muted-foreground",
        "transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:text-foreground dark:data-[state=active]:text-foreground",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
