"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Icons } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export interface Column {
  id: string;
  label: string;
  color: string;
}

interface BoardItem {
  id: string;
  status: string;
}

export function Kanban<T extends BoardItem>({
  columns,
  items,
  onMove,
  renderCard,
  onAdd,
  emptyHint,
}: {
  columns: Column[];
  items: T[];
  onMove: (id: string, toStatus: string) => void;
  renderCard: (item: T) => React.ReactNode;
  onAdd: (status: string) => void;
  emptyHint?: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    // 6px threshold keeps click-to-edit working; drag only starts on real movement.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const activeItem = items.find((i) => i.id === activeId) ?? null;

  function handleStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function handleEnd(e: DragEndEvent) {
    setActiveId(null);
    const overCol = e.over?.id ? String(e.over.id) : null;
    const id = String(e.active.id);
    const item = items.find((i) => i.id === id);
    if (overCol && item && item.status !== overCol) onMove(id, overCol);
  }

  return (
    <DndContext
      id="kanban-board"
      sensors={sensors}
      onDragStart={handleStart}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleEnd}
    >
      {/* Horizontal-scroll board: columns keep a usable width and the section
          scrolls sideways on smaller screens; on wide screens they fill. */}
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {columns.map((col) => (
          <ColumnDroppable
            key={col.id}
            column={col}
            count={items.filter((i) => i.status === col.id).length}
            onAdd={() => onAdd(col.id)}
            dragging={activeId !== null}
          >
            {items
              .filter((i) => i.status === col.id)
              .map((item) => (
                <DraggableCard key={item.id} id={item.id}>
                  {renderCard(item)}
                </DraggableCard>
              ))}
          </ColumnDroppable>
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18,0.67,0.6,1.22)" }}>
        {activeItem ? (
          <div className="rotate-1 cursor-grabbing opacity-95 shadow-2xl">
            {renderCard(activeItem)}
          </div>
        ) : null}
      </DragOverlay>
      {emptyHint ? <p className="sr-only">{emptyHint}</p> : null}
    </DndContext>
  );
}

function ColumnDroppable({
  column,
  count,
  children,
  onAdd,
  dragging,
}: {
  column: Column;
  count: number;
  children: React.ReactNode;
  onAdd: () => void;
  dragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[11.5rem] flex-1 flex-col rounded-xl border bg-bg-elevated/50 transition-colors",
        isOver ? "border-border-strong bg-surface/60" : "border-border",
      )}
      style={isOver ? { boxShadow: `inset 0 0 0 1px ${column.color}55` } : undefined}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <span
          className="flex items-center gap-2 text-xs font-semibold"
          style={{ color: column.color }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          {column.label}
        </span>
        <span className="tnum text-[11px] text-text-faint">{count}</span>
      </div>
      <div className="flex min-h-[60px] flex-1 flex-col gap-2 px-2 pb-2">
        {children}
        <button
          onClick={onAdd}
          className={cn(
            "rounded-lg border border-dashed border-border py-2 text-xs text-text-faint transition-colors hover:border-border-strong hover:text-text-muted",
            dragging && "opacity-0",
          )}
        >
          + Add
        </button>
      </div>
    </div>
  );
}

function DraggableCard({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn("group/card relative", isDragging && "opacity-40")}
    >
      {children}
      {/* Drag handle — keyboard-accessible, appears on hover. */}
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to move"
        className="absolute right-1.5 top-1.5 cursor-grab touch-none rounded p-1 text-text-faint opacity-0 transition-opacity hover:bg-surface-hover hover:text-text-muted focus-visible:opacity-100 group-hover/card:opacity-100 active:cursor-grabbing"
      >
        <Icons.grip size={14} />
      </button>
    </div>
  );
}
