import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FC } from "react";
import type { CSSProperties } from "react";

import { AssignmentTitle } from "@renderer/component/AssignmentTitle";

import "./AssignmentSubmissionView.css";
import { useMeasuredWidth } from "../user/data/allocationCommon";

const BIN_WIDTH_PX = 44;
const DEFAULT_CHART_HEIGHT_PX = 180;
const DEFAULT_EXTEND_DAYS = 7;
const MIN_SEGMENT_HEIGHT_PX = 10;
const SEGMENT_GAP_PX = 2;
const SKIP_START_HOUR = 0;
const SKIP_END_HOUR = 6;

type Interval = {
  start: number;
  end: number;
};

const normalizeInterval = (interval: Interval): Interval => {
  return interval.start <= interval.end
    ? interval
    : { start: interval.end, end: interval.start };
};

const mergeIntervals = (intervals: Interval[]): Interval[] => {
  if (intervals.length === 0) {
    return [];
  }
  const sorted = intervals
    .map(normalizeInterval)
    .sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (!last || interval.start > last.end) {
      merged.push({ ...interval });
    } else if (interval.end > last.end) {
      last.end = interval.end;
    }
  }
  return merged;
};

const getMissingIntervals = (
  existing: Interval[],
  target: Interval,
): Interval[] => {
  const normalized = normalizeInterval(target);
  if (normalized.end <= normalized.start) {
    return [];
  }
  const merged = mergeIntervals(existing);
  const missing: Interval[] = [];
  let cursor = normalized.start;
  for (const interval of merged) {
    if (interval.end <= cursor) {
      continue;
    }
    if (interval.start >= normalized.end) {
      break;
    }
    if (interval.start > cursor) {
      missing.push({
        start: cursor,
        end: Math.min(interval.start, normalized.end),
      });
    }
    cursor = Math.max(cursor, interval.end);
    if (cursor >= normalized.end) {
      break;
    }
  }
  if (cursor < normalized.end) {
    missing.push({ start: cursor, end: normalized.end });
  }
  return missing.filter((interval) => interval.end > interval.start);
};

const clampDate = (value: Date) => new Date(value.getTime());

const addDays = (value: Date, days: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfLocalDay = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);

const isSkippedWindow = (value: Date) => {
  const hour = value.getHours();
  return hour >= SKIP_START_HOUR && hour < SKIP_END_HOUR;
};

const floorToBinStart = (value: Date) => {
  const date = new Date(value);
  date.setMinutes(0, 0, 0);
  const hour = date.getHours();
  if (hour >= 6 && hour < 12) {
    date.setHours(6);
    return date;
  }
  if (hour >= 12 && hour < 18) {
    date.setHours(12);
    return date;
  }
  if (hour >= 18) {
    date.setHours(18);
    return date;
  }
  return null;
};

const rangeStartBin = (value: Date) => {
  const day = startOfLocalDay(value);
  const hour = value.getHours();
  if (hour < 6) {
    day.setHours(6, 0, 0, 0);
    return day;
  }
  return (
    floorToBinStart(value) ??
    (() => {
      day.setHours(6, 0, 0, 0);
      return day;
    })()
  );
};

const rangeEndBin = (value: Date) => {
  const hour = value.getHours();
  if (hour < 6) {
    const day = startOfLocalDay(value);
    day.setDate(day.getDate() - 1);
    day.setHours(18, 0, 0, 0);
    return day;
  }
  return (
    floorToBinStart(value) ??
    (() => {
      const day = startOfLocalDay(value);
      day.setHours(18, 0, 0, 0);
      return day;
    })()
  );
};

const nextBinStart = (value: Date) => {
  const next = new Date(value);
  const hour = next.getHours();
  if (hour === 6) {
    next.setHours(12, 0, 0, 0);
    return next;
  }
  if (hour === 12) {
    next.setHours(18, 0, 0, 0);
    return next;
  }
  next.setDate(next.getDate() + 1);
  next.setHours(6, 0, 0, 0);
  return next;
};

const generateBins = (start: Date, end: Date) => {
  const startBin = rangeStartBin(start);
  const endBin = rangeEndBin(end);
  const bins: number[] = [];
  if (startBin.getTime() > endBin.getTime()) {
    return bins;
  }
  let cursor = startBin;
  while (cursor.getTime() <= endBin.getTime()) {
    bins.push(cursor.getTime());
    cursor = nextBinStart(cursor);
    if (bins.length > 20000) {
      break;
    }
  }
  return bins;
};

const countPrependedBins = (newStart: Date, oldStart: Date) => {
  const newStartBin = rangeStartBin(newStart);
  const oldStartBin = rangeStartBin(oldStart);
  let count = 0;
  let cursor = newStartBin;
  while (cursor.getTime() < oldStartBin.getTime()) {
    count += 1;
    cursor = nextBinStart(cursor);
    if (count > 20000) {
      break;
    }
  }
  return count;
};

const colorForAssignment = (assignment: Assignment) => assignment.subject.color;

type SelectedSegment = {
  binStart: number;
  assignmentId: string;
};

export type AssignmentSubmissionViewProps = {
  filter?: (assignment: AssignmentData) => boolean;
  start?: Date;
  end?: Date;
  heightPx?: number;
  extendDays?: number;
  onRangeChange?: (start: Date, end: Date) => void;
};

export const AssignmentSubmissionView: FC<AssignmentSubmissionViewProps> = ({
  filter,
  start,
  end,
  heightPx,
  extendDays = DEFAULT_EXTEND_DAYS,
  onRangeChange,
}) => {
  const chartHeightPx = heightPx ?? DEFAULT_CHART_HEIGHT_PX;
  const [internalStart, setInternalStart] = useState<Date>(() =>
    start ? clampDate(start) : addDays(new Date(), -14),
  );
  const [internalEnd, setInternalEnd] = useState<Date>(() =>
    end ? clampDate(end) : new Date(),
  );

  const effectiveStartMs = start ? start.getTime() : internalStart.getTime();
  const effectiveEndMs = end ? end.getTime() : internalEnd.getTime();
  const effectiveStart = useMemo(
    () => new Date(effectiveStartMs),
    [effectiveStartMs],
  );
  const effectiveEnd = useMemo(
    () => new Date(effectiveEndMs),
    [effectiveEndMs],
  );

  const updateRange = useCallback(
    (nextStart: Date, nextEnd: Date) => {
      if (onRangeChange) {
        onRangeChange(nextStart, nextEnd);
        return;
      }
      setInternalStart(nextStart);
      setInternalEnd(nextEnd);
    },
    [onRangeChange],
  );

  const loadedIntervalsRef = useRef<Interval[]>([]);
  const requestIdRef = useRef(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const isLoading = pendingRequests > 0;
  const [error, setError] = useState<string | null>(null);
  const [submissionMap, setSubmissionMap] = useState<Map<string, Submission>>(
    () => new Map(),
  );

  const loadRange = useCallback(
    async (lower: Date, upper: Date, options?: { force?: boolean }) => {
      const normalized = normalizeInterval({
        start: lower.getTime(),
        end: upper.getTime(),
      });
      if (normalized.end <= normalized.start) {
        return;
      }
      const intervalsToFetch = options?.force
        ? [normalized]
        : getMissingIntervals(loadedIntervalsRef.current, normalized);
      if (intervalsToFetch.length === 0) {
        return;
      }

      const requestId = ++requestIdRef.current;
      setPendingRequests((prev) => prev + intervalsToFetch.length);
      setError(null);

      try {
        const responses = await Promise.all(
          intervalsToFetch.map(async (interval) => {
            const begin = new Date(interval.start);
            const end = new Date(interval.end);
            const [filteredAssignments, within] = await Promise.all([
              typeof filter === "function"
                ? window.data.assignment.list(begin, end)
                : Promise.resolve(null),
              window.data.submission.within(begin, end),
            ]);
            const allowed =
              filteredAssignments && typeof filter === "function"
                ? new Set(
                    filteredAssignments
                      .filter(filter)
                      .map((assignment) => assignment.id),
                  )
                : null;
            return allowed
              ? within.filter((submission) =>
                  allowed.has(submission.assignment.id),
                )
              : within;
          }),
        );

        if (requestId === requestIdRef.current) {
          setSubmissionMap((prev) => {
            const next = options?.force
              ? new Map<string, Submission>()
              : new Map(prev);
            responses.flat().forEach((submission) => {
              next.set(submission.id, submission);
            });
            return next;
          });
          loadedIntervalsRef.current = mergeIntervals([
            ...(options?.force ? [] : loadedIntervalsRef.current),
            ...intervalsToFetch,
          ]);
        }
      } catch (err) {
        if (requestId === requestIdRef.current) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        setPendingRequests((prev) =>
          Math.max(0, prev - intervalsToFetch.length),
        );
      }
    },
    [filter],
  );

  const prevRangeRef = useRef<{ startMs: number; endMs: number } | null>(null);
  useEffect(() => {
    if (effectiveStart.getTime() > effectiveEnd.getTime()) {
      setError("起始时间不能晚于结束时间");
      setSubmissionMap(new Map());
      loadedIntervalsRef.current = [];
      return;
    }
    const prev = prevRangeRef.current;
    const next = {
      startMs: effectiveStart.getTime(),
      endMs: effectiveEnd.getTime(),
    };
    const isExpanded =
      prev != null && next.startMs <= prev.startMs && next.endMs >= prev.endMs;
    const shouldForce = prev == null || !isExpanded;
    prevRangeRef.current = next;
    loadRange(
      effectiveStart,
      effectiveEnd,
      shouldForce ? { force: true } : undefined,
    );
  }, [effectiveEnd, effectiveStart, loadRange]);

  useEffect(() => {
    const dispose = window.data.onChanged(() => {
      loadRange(effectiveStart, effectiveEnd, { force: true });
    });
    return () => {
      dispose?.();
    };
  }, [effectiveEnd, effectiveStart, loadRange]);

  const submissions = useMemo(
    () => Array.from(submissionMap.values()),
    [submissionMap],
  );
  const bins = useMemo(
    () => generateBins(effectiveStart, effectiveEnd),
    [effectiveEnd, effectiveStart],
  );

  const {
    maxTotal,
    detailsByBin,
    assignmentIndex,
    visibleCount,
    skippedCount,
  } = useMemo(() => {
    const details = new Map<
      number,
      Map<
        string,
        {
          assignment: Assignment;
          submissionCount: number;
          students: Map<string, Student>;
        }
      >
    >();
    const assignmentMap = new Map<
      string,
      { assignment: Assignment; color: string }
    >();
    const countsByBin = new Map<number, number>();
    let visible = 0;
    let skipped = 0;

    const startMs = effectiveStart.getTime();
    const endMs = effectiveEnd.getTime();

    submissions.forEach((submission) => {
      const created =
        submission.created instanceof Date
          ? submission.created
          : new Date(submission.created);
      const createdMs = created.getTime();
      if (createdMs < startMs || createdMs > endMs) {
        return;
      }
      if (isSkippedWindow(created)) {
        skipped += 1;
        return;
      }
      const binStart = floorToBinStart(created);
      if (!binStart) {
        return;
      }
      const binKey = binStart.getTime();
      const assignmentId = submission.assignment.id;

      const assignmentEntry =
        assignmentMap.get(assignmentId) ??
        (() => {
          const value = {
            assignment: submission.assignment,
            color: colorForAssignment(submission.assignment),
          };
          assignmentMap.set(assignmentId, value);
          return value;
        })();

      const byAssignment =
        details.get(binKey) ??
        (() => {
          const value = new Map<
            string,
            {
              assignment: Assignment;
              submissionCount: number;
              students: Map<string, Student>;
            }
          >();
          details.set(binKey, value);
          return value;
        })();

      const entry =
        byAssignment.get(assignmentId) ??
        (() => {
          const value = {
            assignment: assignmentEntry.assignment,
            submissionCount: 0,
            students: new Map<string, Student>(),
          };
          byAssignment.set(assignmentId, value);
          return value;
        })();

      entry.submissionCount += 1;
      entry.students.set(submission.student.id, submission.student);
      countsByBin.set(binKey, (countsByBin.get(binKey) ?? 0) + 1);
      visible += 1;
    });

    const max = Array.from(countsByBin.values()).reduce(
      (acc, value) => Math.max(acc, value),
      0,
    );

    return {
      maxTotal: max,
      detailsByBin: details,
      assignmentIndex: assignmentMap,
      visibleCount: visible,
      skippedCount: skipped,
    };
  }, [effectiveEnd, effectiveStart, submissions]);

  const { ref: viewRef, width: viewWidth } = useMeasuredWidth<HTMLDivElement>();
  const trackWidth = bins.length * BIN_WIDTH_PX;
  const maxViewX = Math.max(0, trackWidth - viewWidth);
  const maxViewXRef = useRef(maxViewX);
  useEffect(() => {
    maxViewXRef.current = maxViewX;
  }, [maxViewX]);

  const [viewX, setViewX] = useState(0);
  const viewXRef = useRef(0);
  useEffect(() => {
    viewXRef.current = viewX;
  }, [viewX]);

  const pendingViewXAdjustPxRef = useRef(0);
  const initializedViewRef = useRef(false);
  const lastRangeKeyRef = useRef<string>("");

  useLayoutEffect(() => {
    const key = `${effectiveStart.getTime()}-${effectiveEnd.getTime()}`;
    if (key !== lastRangeKeyRef.current) {
      initializedViewRef.current = false;
      lastRangeKeyRef.current = key;
    }
  }, [effectiveEnd, effectiveStart]);

  const clampViewX = useCallback((value: number) => {
    return Math.min(Math.max(0, value), maxViewXRef.current);
  }, []);

  useLayoutEffect(() => {
    const adjust = pendingViewXAdjustPxRef.current;
    if (adjust !== 0) {
      pendingViewXAdjustPxRef.current = 0;
      setViewX((prev) => clampViewX(prev + adjust));
      return;
    }
    if (!initializedViewRef.current && viewWidth > 0) {
      initializedViewRef.current = true;
      setViewX(maxViewX);
      return;
    }
    if (viewWidth > 0) {
      setViewX((prev) => clampViewX(prev));
    }
  }, [bins.length, clampViewX, maxViewX, viewWidth]);

  const extendRange = useCallback(
    (direction: -1 | 1) => {
      const nextStart =
        direction === -1
          ? addDays(effectiveStart, -extendDays)
          : effectiveStart;
      const nextEnd =
        direction === 1 ? addDays(effectiveEnd, extendDays) : effectiveEnd;
      if (direction === -1) {
        pendingViewXAdjustPxRef.current =
          countPrependedBins(nextStart, effectiveStart) * BIN_WIDTH_PX;
      }
      updateRange(nextStart, nextEnd);
    },
    [effectiveEnd, effectiveStart, extendDays, updateRange],
  );

  const extendCooldownRef = useRef(0);
  const ensureRangeLoaded = useCallback(
    (nextViewX: number) => {
      if (viewWidth <= 0) {
        return;
      }
      const now = Date.now();
      if (now - extendCooldownRef.current < 250) {
        return;
      }
      const threshold = BIN_WIDTH_PX * 2;
      const max = maxViewXRef.current;
      if (nextViewX <= threshold) {
        extendCooldownRef.current = now;
        extendRange(-1);
        return;
      }
      if (max - nextViewX <= threshold) {
        extendCooldownRef.current = now;
        extendRange(1);
      }
    },
    [extendRange, viewWidth],
  );

  const updateViewX = useCallback(
    (next: number) => {
      const clamped = clampViewX(next);
      setViewX(clamped);
      ensureRangeLoaded(clamped);
    },
    [clampViewX, ensureRangeLoaded],
  );

  const touchPanState = useRef<{
    identifier: number;
    startX: number;
    startViewX: number;
  } | null>(null);
  const dragState = useRef<{ startX: number; startViewX: number } | null>(null);

  const onTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (event.touches.length !== 1) {
        touchPanState.current = null;
        return;
      }
      const touch = event.touches[0];
      touchPanState.current = {
        identifier: touch.identifier,
        startX: touch.clientX,
        startViewX: viewXRef.current,
      };
    },
    [],
  );

  const onTouchMove = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      const state = touchPanState.current;
      if (!state) {
        return;
      }
      const touch = Array.from(event.touches).find(
        (t) => t.identifier === state.identifier,
      );
      if (!touch) {
        return;
      }
      event.preventDefault();
      const dx = touch.clientX - state.startX;
      updateViewX(state.startViewX - dx);
    },
    [updateViewX],
  );

  const onTouchEnd = useCallback(() => {
    touchPanState.current = null;
  }, []);

  const onMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragState.current = { startX: event.clientX, startViewX: viewXRef.current };
  }, []);

  const onMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!dragState.current) {
        return;
      }
      event.preventDefault();
      const dx = event.clientX - dragState.current.startX;
      updateViewX(dragState.current.startViewX - dx);
    },
    [updateViewX],
  );

  const stopDrag = useCallback(() => {
    dragState.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stopDrag);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopDrag);
    };
  }, [onMouseMove, stopDrag]);

  const wheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      updateViewX(viewXRef.current + event.deltaY);
    },
    [updateViewX],
  );

  useEffect(() => {
    const element = viewRef.current;
    if (!element) {
      return;
    }
    element.addEventListener("wheel", wheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", wheel);
    };
  }, [wheel, viewRef]);

  const dayTicks = useMemo(() => {
    return bins
      .map((timestamp, index) => {
        const date = new Date(timestamp);
        if (date.getHours() !== 6) {
          return null;
        }
        return {
          timestamp,
          left: index * BIN_WIDTH_PX,
          label: `${date.getMonth() + 1}/${date.getDate()}`,
        };
      })
      .filter(
        (value): value is { timestamp: number; left: number; label: string } =>
          Boolean(value),
      );
  }, [bins]);

  const [selected, setSelected] = useState<SelectedSegment | null>(null);
  const assignmentDataCacheRef = useRef<Map<string, AssignmentData>>(new Map());
  const [selectedAssignmentData, setSelectedAssignmentData] =
    useState<AssignmentData | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [selectedCounts, setSelectedCounts] = useState<{
    submissionCount: number;
    submitterCount: number;
  }>({
    submissionCount: 0,
    submitterCount: 0,
  });

  useEffect(() => {
    if (!selected) {
      setSelectedAssignmentData(null);
      setSelectedStudents([]);
      setSelectedCounts({ submissionCount: 0, submitterCount: 0 });
      return;
    }
    const byAssignment = detailsByBin.get(selected.binStart);
    const entry = byAssignment?.get(selected.assignmentId);
    if (!entry) {
      setSelectedAssignmentData(null);
      setSelectedStudents([]);
      setSelectedCounts({ submissionCount: 0, submitterCount: 0 });
      return;
    }
    const studentList = Array.from(entry.students.values()).sort((a, b) => {
      if (a.group !== b.group) {
        return a.group.localeCompare(b.group, "zh-CN");
      }
      return a.name.localeCompare(b.name, "zh-CN");
    });
    setSelectedStudents(studentList);
    setSelectedCounts({
      submissionCount: entry.submissionCount,
      submitterCount: studentList.length,
    });

    const cached = assignmentDataCacheRef.current.get(selected.assignmentId);
    if (cached) {
      setSelectedAssignmentData(cached);
      return;
    }
    let active = true;
    window.data.assignment
      .get(selected.assignmentId)
      .then((data) => {
        if (!active) {
          return;
        }
        assignmentDataCacheRef.current.set(selected.assignmentId, data);
        setSelectedAssignmentData(data);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setSelectedAssignmentData(null);
      });
    return () => {
      active = false;
    };
  }, [detailsByBin, selected]);

  const statusText = error
    ? `加载失败：${error}`
    : isLoading
      ? "正在加载…"
      : skippedCount > 0
        ? `可视提交 ${visibleCount}，跳过 0:00–6:00 ${skippedCount}`
        : `可视提交 ${visibleCount}（跳过 0:00–6:00）`;

  const trackStyle = useMemo<CSSProperties>(
    () => ({
      width: trackWidth,
      height: chartHeightPx,
      transform: `translateX(${-viewX}px)`,
    }),
    [chartHeightPx, trackWidth, viewX],
  );

  return (
    <div className="assignment-submission-view">
      <div className="asv-toolbar">
        <span
          className={[
            "asv-status",
            error ? "error" : isLoading ? "loading" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {statusText}
        </span>
        <div className="asv-actions">
          <button
            type="button"
            className="outline"
            onClick={() => extendRange(-1)}
          >
            向前 {extendDays} 天
          </button>
          <button
            type="button"
            className="outline"
            onClick={() => extendRange(1)}
          >
            向后 {extendDays} 天
          </button>
        </div>
      </div>

      <div
        className="asv-chart"
        ref={viewRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onMouseDown={onMouseDown}
      >
        <div className="asv-track" style={trackStyle}>
          {dayTicks.map((tick) => (
            <div
              key={tick.timestamp}
              className="asv-day-tick"
              style={{ left: tick.left }}
            >
              {tick.label}
            </div>
          ))}
          {bins.map((binStart) => {
            const byAssignment = detailsByBin.get(binStart);
            const entries = byAssignment
              ? Array.from(byAssignment.entries())
              : [];
            const segments = entries
              .map(([assignmentId, entry]) => {
                const color =
                  assignmentIndex.get(assignmentId)?.color ??
                  colorForAssignment(entry.assignment);
                return {
                  assignmentId,
                  assignment: entry.assignment,
                  color,
                  count: entry.submissionCount,
                };
              })
              .filter((segment) => segment.count > 0)
              .sort(
                (a, b) =>
                  b.count - a.count ||
                  a.assignment.title.localeCompare(
                    b.assignment.title,
                    "zh-CN",
                  ) ||
                  a.assignmentId.localeCompare(b.assignmentId),
              );

            let bottom = 0;
            const total = segments.reduce(
              (sum, segment) => sum + segment.count,
              0,
            );

            return (
              <div key={binStart} className="asv-bin">
                <div className="asv-bin-bar">
                  {segments.map((segment) => {
                    const rawHeight =
                      maxTotal === 0
                        ? 0
                        : Math.max(
                            1,
                            Math.round(
                              (segment.count / maxTotal) * chartHeightPx,
                            ),
                          );
                    const height = Math.max(
                      MIN_SEGMENT_HEIGHT_PX,
                      rawHeight - SEGMENT_GAP_PX,
                    );
                    const style: CSSProperties = {
                      backgroundColor: segment.color,
                      height,
                      bottom,
                    };
                    bottom += height + SEGMENT_GAP_PX;
                    const isSelected =
                      selected?.binStart === binStart &&
                      selected.assignmentId === segment.assignmentId;
                    return (
                      <button
                        key={segment.assignmentId}
                        type="button"
                        className={["asv-segment", isSelected ? "selected" : ""]
                          .filter(Boolean)
                          .join(" ")}
                        style={style}
                        title={`${segment.assignment.title}：${segment.count}`}
                        aria-label={`${segment.assignment.title}：${segment.count}`}
                        onClick={() =>
                          setSelected({
                            binStart,
                            assignmentId: segment.assignmentId,
                          })
                        }
                      />
                    );
                  })}
                  {total === 0 && <div className="asv-empty-bar" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="asv-detail">
          <div className="asv-detail-header">
            <div className="asv-detail-title">
              {selectedAssignmentData ? (
                <AssignmentTitle
                  assignment={selectedAssignmentData}
                  classList="asv-assignment-title"
                />
              ) : (
                <strong className="asv-assignment-title-fallback">
                  {assignmentIndex.get(selected.assignmentId)?.assignment
                    .title ?? selected.assignmentId}
                </strong>
              )}
              <span className="asv-detail-meta">
                {selectedCounts.submissionCount} 次提交 ·{" "}
                {selectedCounts.submitterCount} 人
              </span>
            </div>
            <button
              type="button"
              className="flat"
              onClick={() => setSelected(null)}
            >
              关闭
            </button>
          </div>
          <div className="asv-detail-students">
            {selectedStudents.length === 0 ? (
              <span className="asv-detail-empty">暂无提交</span>
            ) : (
              selectedStudents.map((student) => (
                <span key={student.id} className="asv-student">
                  {student.group ? `${student.group} ` : ""}
                  {student.name}
                </span>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
