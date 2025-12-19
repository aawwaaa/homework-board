import React, {
  FC,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./TimelineView.css";
import { standardTimelineItemBuilder } from "./TimelineItem";

const DAY = 24 * 60 * 60 * 1000;

type Interval = {
  start: number;
  end: number;
};

type TouchPoint = Touch | React.Touch;

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

const overlapsAssignmentRange = (
  assignment: AssignmentData,
  interval: Interval,
) => {
  const start = assignment.created.getTime();
  const end = assignment.deadline.getTime();
  return end >= interval.start && start <= interval.end;
};

const floorDay = (time: Date) => {
  const local = time.getTime() - time.getTimezoneOffset() * 60 * 1000;
  return new Date(local - (local % DAY) + time.getTimezoneOffset() * 60 * 1000);
};

const defaultAssignmentFilter: (assignment: AssignmentData) => boolean = () =>
  true;

export const TimelineView: FC<{
  origin: Date;
  filter?: (assignment: AssignmentData) => boolean;
  builder?: (
    assignment: AssignmentData,
    props: { x: number; width: number },
  ) => React.ReactNode;
  unitWidth?: number; // per day
  touchable?: boolean;
  scale?: number;
}> = ({ origin, filter, builder, unitWidth, touchable, scale: argScale }) => {
  filter = filter ?? defaultAssignmentFilter;
  builder ??= standardTimelineItemBuilder;
  unitWidth ??= 200;
  touchable ??= true;

  const [originalOrigin] = useState(origin);

  const [viewX, setViewX] = useState(0);
  const [viewY, setViewY] = useState(0);
  const [scale, setScale] = useState<number>(argScale ?? 1);
  const [viewSize, setViewSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const view = useRef<HTMLDivElement>(null);
  const viewXRef = useRef(0);
  useEffect(() => {
    viewXRef.current = viewX;
  }, [viewX]);
  const viewYRef = useRef(0);
  useEffect(() => {
    viewYRef.current = viewY;
  }, [viewY]);

  const [assignmentMap, setAssignmentMap] = useState<
    Map<string, AssignmentData>
  >(() => new Map());
  const loadedIntervals = useRef<Interval[]>([]);
  const tickSetRef = useRef<Set<number>>(new Set());
  const [tickDates, setTickDates] = useState<number[]>([]);
  const scaleRef = useRef(scale);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  const touchPanState = useRef<{
    identifier: number;
    startX: number;
    startY: number;
    startViewX: number;
    startViewY: number;
  } | null>(null);
  const pinchState = useRef<{
    startDistance: number;
    startScale: number;
  } | null>(null);

  const unit = unitWidth ?? 1;
  const timeToPosition = useCallback(
    (time: Date, originDate?: Date) => {
      const diff = time.getTime() - (originDate ?? originalOrigin).getTime();
      return (diff / DAY) * unit;
    },
    [originalOrigin, unit],
  );
  const positionToTime = useCallback(
    (position: number, originDate?: Date) => {
      const diff = (position / unit) * DAY;
      return new Date((originDate ?? originalOrigin).getTime() + diff);
    },
    [originalOrigin, unit],
  );
  const viewW = viewSize.width;

  useEffect(() => {
    if (touchable) return;
    viewXRef.current = 0;
    viewYRef.current = 0;
    scaleRef.current = argScale ?? 1;
    setViewX(0);
    setViewY(0);
    setScale(argScale ?? 1);
  }, [origin, touchable, argScale]);

  const startTouchPan = useCallback((touch: TouchPoint) => {
    touchPanState.current = {
      identifier: touch.identifier,
      startX: touch.clientX,
      startY: touch.clientY,
      startViewX: viewXRef.current,
      startViewY: viewYRef.current,
    };
    pinchState.current = null;
  }, []);

  const startPinch = useCallback((touch1: TouchPoint, touch2: TouchPoint) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    const distance = Math.max(Math.hypot(dx, dy), 0.0001);
    pinchState.current = {
      startDistance: distance,
      startScale: scaleRef.current,
    };
    touchPanState.current = null;
  }, []);

  const addTicks = useCallback((lower: Date, upper: Date) => {
    const start = floorDay(lower).getTime();
    const end = floorDay(upper).getTime();
    if (end < start) {
      return;
    }
    let changed = false;
    for (let cursor = start; cursor <= end; cursor += DAY) {
      if (!tickSetRef.current.has(cursor)) {
        tickSetRef.current.add(cursor);
        changed = true;
      }
    }
    if (changed) {
      setTickDates(Array.from(tickSetRef.current).sort((a, b) => a - b));
    }
  }, []);

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
        : getMissingIntervals(loadedIntervals.current, normalized);
      if (intervalsToFetch.length === 0) {
        return;
      }
      try {
        const responses = await Promise.all(
          intervalsToFetch.map((interval) =>
            window.data.assignment.list(
              new Date(interval.start),
              new Date(interval.end),
            ),
          ),
        );
        setAssignmentMap((prev) => {
          const next = new Map(prev);
          let changed = false;
          if (options?.force) {
            next.forEach((assignment, id) => {
              if (
                intervalsToFetch.some((interval) =>
                  overlapsAssignmentRange(assignment, interval),
                )
              ) {
                next.delete(id);
                changed = true;
              }
            });
          }
          responses.forEach((assignments) => {
            assignments.forEach((assignment) => {
              if (filter(assignment)) {
                const prevAssignment = next.get(assignment.id);
                if (prevAssignment !== assignment) {
                  next.set(assignment.id, assignment);
                  changed = true;
                }
              } else if (next.has(assignment.id)) {
                next.delete(assignment.id);
                changed = true;
              }
            });
          });
          return changed ? next : prev;
        });
        intervalsToFetch.forEach((interval) =>
          addTicks(new Date(interval.start), new Date(interval.end)),
        );
        loadedIntervals.current = mergeIntervals([
          ...loadedIntervals.current,
          normalized,
        ]);
      } catch (error) {
        console.error("Failed to load assignments for timeline", error);
      }
    },
    [filter, addTicks],
  );

  useLayoutEffect(() => {
    const ele = view.current;
    if (!ele) {
      return;
    }

    const updateSize = () => {
      const nextWidth = ele.offsetWidth;
      const nextHeight = ele.offsetHeight;
      setViewSize((prev) => {
        if (prev.width === nextWidth && prev.height === nextHeight) {
          return prev;
        }
        return { width: nextWidth, height: nextHeight };
      });
      const left = positionToTime(viewXRef.current);
      const right = positionToTime(viewXRef.current + nextWidth);
      void loadRange(left, right);
    };

    updateSize();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateSize);
      observer.observe(ele);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [positionToTime, loadRange]);

  const ensureRangeLoaded = useCallback(
    (x: number) => {
      if (viewW === 0) {
        return;
      }
      const left = positionToTime(x);
      const right = positionToTime(x + viewW);
      void loadRange(left, right);
    },
    [viewW, positionToTime, loadRange],
  );

  const originOffset = timeToPosition(originalOrigin, origin) * scale;

  useEffect(() => {
    if (viewW === 0) {
      return;
    }
    ensureRangeLoaded(originOffset);
  }, [ensureRangeLoaded, originOffset, viewW]);

  useEffect(() => {
    const unsubscribe = window.data.onChanged(() => {
      if (loadedIntervals.current.length === 0) {
        return;
      }
      loadedIntervals.current.forEach((interval) => {
        void loadRange(new Date(interval.start), new Date(interval.end), {
          force: true,
        });
      });
    });
    return unsubscribe;
  }, [loadRange]);

  useEffect(() => {
    setAssignmentMap((prev) => {
      const next = new Map(prev);
      let changed = false;
      prev.forEach((assignment, id) => {
        if (!filter(assignment)) {
          next.delete(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    if (loadedIntervals.current.length === 0) {
      return;
    }
    loadedIntervals.current.forEach((interval) => {
      void loadRange(new Date(interval.start), new Date(interval.end), {
        force: true,
      });
    });
  }, [filter, loadRange]);

  type LaneItem = { assignment: AssignmentData; x: number; width: number };
  const laneData = useMemo<LaneItem[][]>(() => {
    if (assignmentMap.size === 0) {
      return [];
    }
    const sorted = Array.from(assignmentMap.values()).sort(
      (a, b) => a.created.getTime() - b.created.getTime(),
    );
    const lanes: { end: number; items: LaneItem[] }[] = [];
    sorted.forEach((assignment) => {
      const startTime = assignment.created.getTime();
      const endTime = assignment.deadline.getTime();
      const x = timeToPosition(assignment.created);
      const width = Math.max(timeToPosition(assignment.deadline) - x, 50);
      let lane = lanes.find((candidate) => candidate.end <= startTime);
      if (!lane) {
        lane = { end: endTime, items: [] };
        lanes.push(lane);
      } else {
        lane.end = endTime;
      }
      lane.items.push({ assignment, x, width });
    });
    return lanes.map((lane) => lane.items);
  }, [assignmentMap, timeToPosition]);

  const trackElements = useMemo<React.ReactNode[]>(() => {
    if (laneData.length === 0) {
      return [];
    }
    return laneData.map((lane, index) => {
      const children: React.ReactNode[] = [];
      lane.forEach(({ assignment, x, width }) => {
        const content = builder(assignment, { x, width });
        if (!content) {
          return;
        }
        const keyedNode = React.isValidElement(content) ? (
          React.cloneElement(content, { key: assignment.id })
        ) : (
          <React.Fragment key={assignment.id}>{content}</React.Fragment>
        );
        children.push(keyedNode);
      });
      return (
        <div className="track" key={`track-${index}`}>
          {children}
        </div>
      );
    });
  }, [laneData, builder]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!touchable) return;
      if (e.touches.length === 1) {
        startTouchPan(e.touches[0]);
        return;
      }
      if (e.touches.length >= 2) {
        startPinch(e.touches[0], e.touches[1]);
      }
    },
    [touchable, startTouchPan, startPinch],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!touchable) return;
      if (e.touches.length >= 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        if (!pinchState.current) {
          startPinch(touch1, touch2);
          return;
        }
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        const distance = Math.max(Math.hypot(dx, dy), 0.0001);
        const ratio = distance / pinchState.current.startDistance;
        const nextScale = pinchState.current.startScale * ratio;
        setScale(() => {
          scaleRef.current = nextScale;
          return nextScale;
        });
        return;
      }

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        if (
          !touchPanState.current ||
          touchPanState.current.identifier !== touch.identifier
        ) {
          startTouchPan(touch);
        }
        const state = touchPanState.current;
        if (!state) {
          return;
        }
        const dx = touch.clientX - state.startX;
        const dy = touch.clientY - state.startY;
        const nextViewX = state.startViewX - dx;
        const nextViewY = state.startViewY - dy / scale;
        setViewX(() => {
          viewXRef.current = nextViewX;
          return nextViewX;
        });
        setViewY(() => {
          viewYRef.current = nextViewY;
          return nextViewY;
        });
        ensureRangeLoaded(nextViewX);
      }
    },
    [touchable, ensureRangeLoaded, startTouchPan, startPinch],
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!touchable) return;
      if (e.touches.length >= 2) {
        startPinch(e.touches[0], e.touches[1]);
        return;
      }
      if (e.touches.length === 1) {
        startTouchPan(e.touches[0]);
        return;
      }
      touchPanState.current = null;
      pinchState.current = null;
    },
    [touchable, startTouchPan, startPinch],
  );

  const onTouchCancel = useCallback(() => {
    touchPanState.current = null;
    pinchState.current = null;
  }, []);
  const dragState = useRef<{
    startX: number;
    startY: number;
    startViewX: number;
    startViewY: number;
  } | null>(null);
  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!touchable) return;
      e.preventDefault();
      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        startViewX: viewX,
        startViewY: viewY,
      };
    },
    [touchable, viewX, viewY],
  );
  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!touchable) return;
      if (!dragState.current) {
        return;
      }
      e.preventDefault();
      const dx = e.clientX - dragState.current.startX;
      const dy = e.clientY - dragState.current.startY;
      const nextViewX = dragState.current.startViewX - dx;
      const nextViewY = dragState.current.startViewY - dy;
      setViewX(() => {
        viewXRef.current = nextViewX;
        return nextViewX;
      });
      setViewY(() => {
        viewYRef.current = nextViewY;
        return nextViewY;
      });
      ensureRangeLoaded(nextViewX);
    },
    [touchable, ensureRangeLoaded],
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
    (e: WheelEvent) => {
      if (!touchable) return;
      e.preventDefault();
      if (e.ctrlKey) {
        const dy = e.deltaY / 1000;
        setScale((prev) => {
          const next = prev * (1 - dy);
          scaleRef.current = next;
          return next;
        });
        return;
      }
      const dx = e.deltaY;
      // const dy = e.deltaY;
      setViewX((prev) => {
        const next = prev + dx;
        viewXRef.current = next;
        ensureRangeLoaded(next);
        return next;
      });
      // setViewY((prev) => prev + dy);
    },
    [touchable, ensureRangeLoaded],
  );

  useEffect(() => {
    const element = view.current;
    if (!element) {
      return;
    }
    element.addEventListener("wheel", wheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", wheel);
    };
  }, [wheel]);

  type TimelineStyle = React.CSSProperties & { "--timeline-view-x"?: string };
  const timelineStyle = useMemo<TimelineStyle>(() => {
    // viewX tracks how much the user has panned relative to the initial origin, but when
    // `origin` changes we also shift the content by `originOffset`. The CSS variable is used
    // by items to understand where the viewport actually starts, so it must account for both.
    const viewportLeft = viewX - originOffset;
    return {
      transformOrigin: "left top",
      transform: `translateX(${-viewX + originOffset}px) scale(${scale})`,
      "--timeline-view-x": `${viewportLeft / scale}px`,
    };
  }, [originOffset, scale, viewX]);

  return (
    <div
      className="timeline-view"
      ref={view}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      onMouseDown={onMouseDown}
    >
      <div style={timelineStyle}>
        {tickDates.map((timestamp) => {
          const date = new Date(timestamp);
          return (
            <div
              className="tick"
              key={timestamp}
              style={{ left: timeToPosition(date) }}
            >
              {date.toLocaleDateString()}
            </div>
          );
        })}
        <div className="now" style={{ left: timeToPosition(new Date()) }}></div>
        <div style={{ transform: `translateY(${-viewY}px)` }}>
          {trackElements}
        </div>
      </div>
    </div>
  );
};
