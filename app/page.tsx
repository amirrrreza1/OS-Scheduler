"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, GitCompare, BookOpen, Layers, Cpu } from "lucide-react";

import RunTab from "@/components/scheduler/tabs/RunTab";
import HelpTab from "@/components/scheduler/tabs/HelpTab";
import { makeUid, ProcessRow } from "@/lib/Scheduler/processRows";
import CompareTab from "@/components/scheduler/tabs/compareTab";
import ThreadsTab from "@/components/scheduler/tabs/ThresdsTabs";
import MultiCoreTab from "@/components/scheduler/tabs/MultiCoreTab";

export default function HomePage() {
  const [rows, setRows] = useState<ProcessRow[]>([
    { uid: makeUid(), arrival: 0, burst: 1 },
  ]);

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">
          شبیه‌ساز زمان‌بندی CPU
        </h1>
      </div>

      <Tabs defaultValue="run" className="w-full">
        <TabsList>
          <TabsTrigger value="run" className="gap-2">
            <Play className="h-4 w-4" />
            اجرا
          </TabsTrigger>

          <TabsTrigger value="compare" className="gap-2">
            <GitCompare className="h-4 w-4" />
            مقایسه
          </TabsTrigger>

          <TabsTrigger value="threads" className="gap-2">
            <Layers className="h-4 w-4" />
            نخ ها
          </TabsTrigger>

          <TabsTrigger value="multicore" className="gap-2">
            <Cpu className="h-4 w-4" />
            چند هسته ای
          </TabsTrigger>
          <TabsTrigger value="help" className="gap-2">
            <BookOpen className="h-4 w-4" />
            راهنما
          </TabsTrigger>
        </TabsList>

        <TabsContent value="run" className="mt-4">
          <RunTab rows={rows} setRows={setRows} />
        </TabsContent>

        <TabsContent value="compare" className="mt-4">
          <CompareTab rows={rows} setRows={setRows} />
        </TabsContent>

        <TabsContent value="threads" className="mt-4">
          <ThreadsTab />
        </TabsContent>

        <TabsContent value="help" className="mt-4">
          <HelpTab />
        </TabsContent>
        <TabsContent value="multicore" className="mt-4">
          <MultiCoreTab rows={rows} setRows={setRows} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
