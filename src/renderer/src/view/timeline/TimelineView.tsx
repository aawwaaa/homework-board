import React, { FC, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import "./TimelineView.css";
import { standardTimelineItemBuilder } from "./TimelineItem";

const DAY = 24 * 60 * 60 * 1000;

export const TimelineView: FC<{
    origin: Date;
    filter?: (assignment: AssignmentData) => boolean;
    builder?: (assignment: AssignmentData, props: {x: number, width: number}) => React.ReactNode;
    unitWidth?: number; // per day
    touchable?: boolean;
    scale?: number;
}> = ({origin, filter, builder, unitWidth, touchable, scale: argScale}) => {
    filter ??= () => true;
    builder ??= standardTimelineItemBuilder;
    unitWidth ??= 200;
    touchable ??= true;

    const [originalOrigin] = useState(origin);

    const [lowerBoundary, setLowerBoundary] = useState<Date>(origin);
    const [upperBoundary, setUpperBoundary] = useState<Date>(origin);
    const [viewX, setViewX] = useState(0);
    const [viewY, setViewY] = useState(0);
    const [scale, setScale] = useState<number>(argScale ?? 1);
    const [viewSize, setViewSize] = useState<{width: number, height: number}>({ width: 0, height: 0 });
    const view = useRef<HTMLDivElement>(null);
    const ticks = useRef<React.ReactNode[]>([]);
    const ticksAdded = useRef(new Set<string>());

    useLayoutEffect(() => {
        const ele = view.current;
        if (!ele) {
            return;
        }

        const updateSize = () => {
            setViewSize({ width: ele.offsetWidth, height: ele.offsetHeight });
            load(positionToTime(viewX + ele.offsetWidth));
        };

        updateSize();

        if (typeof ResizeObserver !== "undefined") {
            const observer = new ResizeObserver(updateSize);
            observer.observe(ele);
            return () => observer.disconnect();
        }

        window.addEventListener("resize", updateSize);
        return () => window.removeEventListener("resize", updateSize);
    }, []);

    useEffect(() => {
        if (touchable) return;
        setViewX(0);
        setViewY(0);
        setScale(argScale ?? 1);
    }, [origin, touchable])

    const viewW = viewSize.width;

    const unit = unitWidth ?? 1;
    const timeToPosition = useCallback((time: Date, origin?: Date) => {
        const diff = time.getTime() - (origin ?? originalOrigin).getTime();
        return diff / DAY * unit;
    }, [originalOrigin, unit]);
    const positionToTime = useCallback((position: number, origin?: Date) => {
        const diff = position / unit * DAY;
        return new Date((origin ?? originalOrigin).getTime() + diff);
    }, [originalOrigin, unit]);

    type Track = {
        id: number;
        children: React.ReactNode[];
        ranges: [Date, Date][];
    };
    const loaded = useRef<Set<string>>(new Set());
    const nextTrackId = useRef(0);
    const tracks = useRef<Track[]>([]);

    const floorDay = (time: Date) => {
        const local = time.getTime() - time.getTimezoneOffset() * 60 * 1000;
        return new Date((local - local % DAY) + time.getTimezoneOffset() * 60 * 1000);
    };

    const findTrack = useCallback((assignment: AssignmentData) => {
        const track = tracks.current.find((track) => track.ranges.every(([start, end]) => end <= assignment.created || start >= assignment.deadline));
        if (!track) {
            const newTrack: Track = {
                id: nextTrackId.current++,
                children: [],
                ranges: [],
            };
            tracks.current.push(newTrack);
            return newTrack;
        }
        return track;
    }, []);

    const place = useCallback((assignment: AssignmentData) => {
        const track = findTrack(assignment);
        track.ranges.push([assignment.created, assignment.deadline]);
        const result = builder(assignment, {
            x: timeToPosition(assignment.created),
            width: timeToPosition(assignment.deadline) - timeToPosition(assignment.created),
        });
        if (result) {
            track.children.push(result);
        }
    }, [findTrack, builder, timeToPosition]);

    const addTicks = useCallback((lower: Date, upper: Date) => {
        for (let i = floorDay(lower); i <= floorDay(upper); i = new Date(i.getTime() + DAY)) {
            if (ticksAdded.current.has(i.toISOString())) {
                continue;
            }
            ticksAdded.current.add(i.toISOString());
            ticks.current.push(<div className="tick" key={i.getTime()} style={{ left: timeToPosition(i) }}>{i.toLocaleDateString()}</div>);
        }
    }, [timeToPosition]);

    const load = useCallback(async (target: Date) => {
        const targetTime = target.getTime();
        const lower = targetTime < lowerBoundary.getTime() ? target : lowerBoundary;
        const upper = targetTime > upperBoundary.getTime() ? target : upperBoundary;
        if (upper.getTime() < lower.getTime()) {
            return;
        }
        const assignments = (await window.data.assignment.list(lower, upper))
            .filter(assignment => !loaded.current.has(assignment.id) && filter(assignment));
        assignments.forEach((assignment) => {
            loaded.current.add(assignment.id);
            place(assignment);
        });
        addTicks(lower, upper);
        if (lower.getTime() < lowerBoundary.getTime()) {
            setLowerBoundary(lower);
        }
        if (upper.getTime() > upperBoundary.getTime()) {
            setUpperBoundary(upper);
        }
    }, [lowerBoundary, upperBoundary, filter, place, addTicks]);

    const originOffset = timeToPosition(originalOrigin, origin) * scale;

    const ensureRangeLoaded = useCallback((x: number) => {
        if (viewW === 0) {
            return;
        }
        const left = positionToTime(x);
        const right = positionToTime(x + viewW);
        load(left);
        load(right);
    }, [viewW, positionToTime, load]);

    ensureRangeLoaded(originOffset);

    const move = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (!touchable) return;
        if (e.touches.length !== 1) {
            if (e.touches.length === 2) {
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const dx = touch1.clientX - touch2.clientX;
                const dy = touch1.clientY - touch2.clientY;
                setScale(scale => scale * Math.sqrt(dx * dx + dy * dy));
            }
            return;
        }

        const touch = e.touches[0];
        const nextViewX = touch.clientX + viewX;
        const nextViewY = touch.clientY + viewY;
        setViewX(nextViewX);
        setViewY(nextViewY);

        ensureRangeLoaded(nextViewX);
    }, [viewX, viewY, ensureRangeLoaded]);
    const dragState = useRef<{ startX: number; startY: number; startViewX: number; startViewY: number } | null>(null);
    const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!touchable) return;
        e.preventDefault();
        dragState.current = {
            startX: e.clientX,
            startY: e.clientY,
            startViewX: viewX,
            startViewY: viewY,
        };
    }, [viewX, viewY]);
    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!touchable) return;
        if (!dragState.current) {
            return;
        }
        e.preventDefault();
        const dx = e.clientX - dragState.current.startX;
        const dy = e.clientY - dragState.current.startY;
        const nextViewX = dragState.current.startViewX - dx;
        const nextViewY = dragState.current.startViewY - dy;
        setViewX(nextViewX);
        setViewY(nextViewY);
        ensureRangeLoaded(nextViewX);
    }, [ensureRangeLoaded]);
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
    const wheel = useCallback((e: WheelEvent) => {
        if (!touchable) return;
        e.preventDefault();
        const dx = e.deltaY;
        // const dy = e.deltaY;
        setViewX((prev) => {
            const next = prev + dx;
            ensureRangeLoaded(next);
            return next;
        });
        // setViewY((prev) => prev + dy);
    }, [ensureRangeLoaded]);

    useEffect(() => {
        view.current?.addEventListener("wheel", wheel, {
            passive: false,
        })
        return () => {
            view.current?.removeEventListener("wheel", wheel)
        }
    }, [view, wheel]);

    return <div
        className="timeline-view"
        ref={view}
        onTouchMove={move}
        onMouseDown={onMouseDown}
    >
        <div style={{
            transformOrigin: "left top",
            transform: `translate(${-viewX + originOffset}px, ${-viewY}px) scale(${scale})`
        }}>
            {...ticks.current}
            <div className="now" style={{ left: timeToPosition(new Date()) }}></div>
            {tracks.current.map((track) => <div className="track" key={track.id}>{track.children}</div>)}
        </div>
    </div>;
}
