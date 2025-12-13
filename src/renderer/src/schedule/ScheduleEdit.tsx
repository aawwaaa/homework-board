import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { SwipeAdjustInput } from "@renderer/component/SwipeAdjustInput";

import "./ScheduleEdit.css";
import { AssignmentProcess } from "./AssignmentProcess";

const MINUTE_IN_MS = 60 * 1000;
const DURATION_STEP_MIN = 5;

type ScheduleEditProps = {
  schedule: Schedule;
  setSchedule?: (schedule: Schedule) => void;
  /**
   * Backwards compatible alias.
   */
  set?: (schedule: Schedule) => void;
  className?: string;
  onClose?: () => void;
};

const clampMinutes = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
};

const moveItem = <T,>(list: T[], from: number, to: number) => {
  if (from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

const useDragReorder = (
  listRef: React.RefObject<HTMLDivElement | null>,
  reorderEntry: (from: number, to: number) => void,
) => {
  const dragState = useRef<{ pointerId: number; currentIndex: number } | null>(
    null,
  );
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const resolveTargetIndex = useCallback(
    (pointerY: number, currentIndex: number) => {
      const container = listRef.current;
      if (!container) return currentIndex;
      const items = Array.from(
        container.querySelectorAll<HTMLElement>("[data-index]"),
      );
      if (!items.length) return currentIndex;

      let targetIndex = currentIndex;
      for (const item of items) {
        const rect = item.getBoundingClientRect();
        const itemIndex = Number(item.dataset.index ?? "-1");
        if (pointerY > rect.top && pointerY < rect.bottom) {
          targetIndex = itemIndex;
          break;
        }
      }

      return targetIndex;
    },
    [listRef],
  );

  const handlePointerDown = useCallback(
    (index: number) => (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragState.current = { pointerId: event.pointerId, currentIndex: index };
      setDraggingIndex(index);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const state = dragState.current;
      if (!state) return;
      event.preventDefault();
      const targetIndex = resolveTargetIndex(event.clientY, state.currentIndex);
      if (targetIndex !== state.currentIndex) {
        reorderEntry(state.currentIndex, targetIndex);
        dragState.current = { ...state, currentIndex: targetIndex };
        setDraggingIndex(targetIndex);
      }
    },
    [resolveTargetIndex, reorderEntry],
  );

  const handlePointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const state = dragState.current;
      if (state && event.currentTarget.hasPointerCapture(state.pointerId)) {
        event.currentTarget.releasePointerCapture(state.pointerId);
      }
      dragState.current = null;
      setDraggingIndex(null);
    },
    [],
  );

  return {
    draggingIndex,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
  };
};

export const ScheduleEdit = ({
  schedule,
  setSchedule,
  set,
  className,
  onClose,
}: ScheduleEditProps) => {
  const setter = setSchedule ?? set;
  const listRef = useRef<HTMLDivElement | null>(null);
  const [entries, setEntries] = useState<ScheduleEntry[]>(
    () => schedule.entries ?? [],
  );
  const [expanded, setExpanded] = useState<boolean[]>(() =>
    (schedule.entries ?? []).map(() => false),
  );

  const [importSource, setImportSource] = useState<React.ReactNode | null>(
    null,
  );

  useEffect(() => {
    setEntries(schedule.entries ?? []);
    setExpanded((schedule.entries ?? []).map((_, i) => expanded[i] ?? false));
  }, [schedule]);

  const commitEntries = (nextEntries: ScheduleEntry[]) => {
    setEntries(nextEntries);
    setter?.({ entries: nextEntries });
  };

  const reorderEntry = (from: number, to: number) => {
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= entries.length ||
      to >= entries.length
    ) {
      return;
    }
    const nextEntries = moveItem(entries, from, to);
    const nextExpanded = moveItem(expanded, from, to);
    setExpanded(nextExpanded);
    commitEntries(nextEntries);
  };

  const updateEntry = (index: number, patch: Partial<ScheduleEntry>) => {
    const nextEntries = entries.map((entry, i) =>
      i === index ? { ...entry, ...patch } : entry,
    );
    commitEntries(nextEntries);
  };

  const removeEntry = (index: number) => {
    const nextEntries = entries.filter((_, i) => i !== index);
    const nextExpanded = expanded.filter((_, i) => i !== index);
    setExpanded(nextExpanded);
    commitEntries(nextEntries);
  };

  const addEntry = (entry?: ScheduleEntry) => {
    const nextEntries = [
      ...entries,
      entry ?? { duration: 5 * MINUTE_IN_MS, title: "", description: "" },
    ];
    setExpanded([...expanded, false]);
    commitEntries(nextEntries);
  };
  const addEntries = (input: ScheduleEntry[]) => {
    const nextEntries = [...entries, ...input];
    setExpanded([...expanded, ...input.map(() => false)]);
    commitEntries(nextEntries);
  };

  const toggleExpanded = (index: number) => {
    setExpanded((prev) =>
      prev.map((value, i) => (i === index ? !value : value)),
    );
  };

  const {
    draggingIndex,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
  } = useDragReorder(listRef, reorderEntry);

  const containerClass = ["schedule-edit", className].filter(Boolean).join(" ");

  return (
    <div className={containerClass}>
      <div
        className={"schedule-import-source" + (importSource ? "" : " hidden")}
      >
        {importSource}
      </div>
      <div className="schedule-edit-toolbar">
        <button onClick={onClose} className="flat">
          关闭
        </button>
        <button
          onClick={() =>
            setImportSource(
              <AssignmentProcess
                add={addEntries}
                close={() => setImportSource(null)}
              />,
            )
          }
          className="outline"
        >
          从作业信息导入
        </button>
      </div>
      <div className="schedule-edit-body" ref={listRef}>
        {entries.length === 0 && <div className="schedule-empty">空</div>}
        {entries.map((entry, index) => {
          const minutes = clampMinutes(entry.duration / MINUTE_IN_MS);
          const isExpanded = expanded[index] ?? false;
          const isDragging = draggingIndex === index;

          return (
            <div
              key={index}
              className={
                isDragging ? "schedule-entry dragging" : "schedule-entry"
              }
              data-index={index}
            >
              <div className="schedule-entry-row">
                <button
                  type="button"
                  className="drag-handle flat"
                  aria-label="拖动以排序"
                  onPointerDown={handlePointerDown(index)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerEnd}
                  onPointerCancel={handlePointerEnd}
                >
                  ☰
                </button>
                <div className="duration-field">
                  <SwipeAdjustInput
                    type="number"
                    min={0}
                    value={minutes}
                    inputMode="numeric"
                    onChange={(e) =>
                      updateEntry(index, {
                        duration:
                          clampMinutes(Number(e.target.value)) * MINUTE_IN_MS,
                      })
                    }
                    onSwipeAdjust={(steps) =>
                      updateEntry(index, {
                        duration:
                          clampMinutes(minutes + steps * DURATION_STEP_MIN) *
                          MINUTE_IN_MS,
                      })
                    }
                    swipePxPerStep={34}
                  />
                  <span className="unit">分钟</span>
                </div>
                <input
                  className="title-input"
                  type="text"
                  placeholder="标题"
                  value={entry.title ?? ""}
                  onChange={(e) =>
                    updateEntry(index, { title: e.target.value })
                  }
                />
                <button
                  type="button"
                  className="flat"
                  onClick={() => toggleExpanded(index)}
                >
                  {isExpanded ? "收起" : "扩展"}
                </button>
                <button
                  type="button"
                  className="flat danger"
                  onClick={() => removeEntry(index)}
                >
                  移除
                </button>
              </div>
              {isExpanded && (
                <div className="schedule-entry-details">
                  <textarea
                    placeholder="描述"
                    value={entry.description ?? ""}
                    onChange={(e) =>
                      updateEntry(index, { description: e.target.value })
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
        <button
          type="button"
          className="schedule-add primary"
          onClick={() => addEntry()}
        >
          添加
        </button>
      </div>
    </div>
  );
};
