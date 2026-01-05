"use client";

import * as React from "react";

import { GripVertical, Plus, Trash2 } from "lucide-react";

import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { makeUid, ProcessRow } from "@/lib/Scheduler/processRows";
import Button from "../ui/Custom/Button/Button";
import NumberInput from "../ui/Custom/Input/NumberInput";

function SortableRow({
  uid,
  pidLabel,
  arrival,
  burst,
  total,
  onChange,
  onRemove,
}: {
  uid: string;
  pidLabel: string;
  arrival: number;
  burst: number;
  total: number;
  onChange: (
    uid: string,
    patch: Partial<Pick<ProcessRow, "arrival" | "burst">>
  ) => void;
  onRemove: (uid: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: uid });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={[
        "border-t border-border",
        isDragging ? "opacity-70 bg-muted/20" : "",
      ].join(" ")}
    >
      <td className="p-2 w-12">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md  hover:bg-muted/30 active:bg-muted/40 cursor-move touch-none select-none"
          style={{ touchAction: "none" }}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-foreground/70" />
        </button>
      </td>

      <td className="sm:w-[30%] p-2 font-medium whitespace-nowrap">
        {pidLabel}
      </td>

      <td className="p-2">
        <NumberInput
          value={arrival}
          onChange={(e) => onChange(uid, { arrival: e })}
          min={0}
          className="max-w-28"
        />
      </td>

      <td className="p-2">
        <NumberInput
          value={burst}
          onChange={(e) => onChange(uid, { burst: e })}
          min={1}
          className="max-w-28"
        />
      </td>

      <td className="p-2 flex justify-center items-center">
        <Button
          variant="danger"
          onClick={() => onRemove(uid)}
          disabled={total <= 1}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}

export default function ProcessEditor({
  rows,
  setRows,
}: {
  rows: ProcessRow[];
  setRows: React.Dispatch<React.SetStateAction<ProcessRow[]>>;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const addProcess = () => {
    setRows((prev) => {
      const lastArrival = prev.length ? prev[prev.length - 1].arrival : 0;
      return [...prev, { uid: makeUid(), arrival: lastArrival, burst: 1 }];
    });
  };

  const removeProcess = (uid: string) => {
    setRows((prev) =>
      prev.length <= 1 ? prev : prev.filter((r) => r.uid !== uid)
    );
  };

  const updateRow = (
    uid: string,
    patch: Partial<Pick<ProcessRow, "arrival" | "burst">>
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.uid === uid ? { ...r, ...patch } : r))
    );
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setRows((prev) => {
      const oldIndex = prev.findIndex((r) => r.uid === active.id);
      const newIndex = prev.findIndex((r) => r.uid === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          تعداد پردازش‌ها: {rows.length}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={rows.map((r) => r.uid)}
            strategy={verticalListSortingStrategy}
          >
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="p-2 text-center"></th>
                  <th className="p-2 text-right">PID</th>
                  <th className="p-2 text-right">زمان ورود</th>
                  <th className="p-2 text-right">زمان اجرا</th>
                  <th className="p-2 text-center">عملیات</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r, idx) => (
                  <SortableRow
                    key={r.uid}
                    uid={r.uid}
                    pidLabel={`P${idx + 1}`}
                    arrival={r.arrival}
                    burst={r.burst}
                    total={rows.length}
                    onChange={updateRow}
                    onRemove={removeProcess}
                  />
                ))}
              </tbody>
            </table>
          </SortableContext>
        </DndContext>
      </div>
      <Button variant="secondary" onClick={addProcess}>
        <Plus className="h-4 w-4" />
        افزودن پردازش
      </Button>
    </div>
  );
}
