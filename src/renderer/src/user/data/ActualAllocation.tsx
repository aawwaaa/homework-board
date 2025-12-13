import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FC } from "react";

import { Badge } from "@renderer/component/Badge";

import "./Allocation.css";
import {
    type Range,
    WEEKDAYS,
    formatInputDate,
    formatMinutes,
    getDefaultRange,
    parseDateKey,
    percentFormatter,
    toUTCDate,
} from "./allocationCommon";
import { StackedBar } from "./StackedBar";

type SubjectSlice = {
    subject: Subject;
    taken: number;
};

type AssignmentSlice = {
    assignment: Assignment;
    subject: Subject;
    taken: number;
};

type DailyGroup = {
    dateKey: string;
    date: Date;
    total: number;
    eventCount: number;
    subjects: SubjectSlice[];
    assignments: AssignmentSlice[];
};

export const ActualAllocationPage: FC = () => {
    const [range, setRange] = useState<Range>(() => getDefaultRange());
    const [events, setEvents] = useState<[Date, [number, Assignment][]][]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rangeError, setRangeError] = useState<string | null>(null);
    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
    const requestIdRef = useRef(0);

    const fetchData = useCallback(async () => {
        const currentRequest = ++requestIdRef.current;
        if (!range.begin || !range.end) {
            setRangeError("请选择完整的日期范围");
            setEvents([]);
            setExpandedDays(new Set());
            setLoading(false);
            return;
        }
        const begin = toUTCDate(range.begin);
        const end = toUTCDate(range.end);
        if (begin.getTime() > end.getTime()) {
            setRangeError("起始日期不能晚于结束日期");
            setEvents([]);
            setExpandedDays(new Set());
            setLoading(false);
            return;
        }
        setRangeError(null);
        setLoading(true);
        setError(null);
        try {
            const result = await window.data.progress.within(begin, end);
            if (currentRequest === requestIdRef.current) {
                setEvents(result);
                setExpandedDays((prev) => {
                    if (prev.size === 0) {
                        return prev;
                    }
                    const valid = new Set(result.map(([date]) => formatInputDate(date)));
                    const next = new Set<string>();
                    prev.forEach((key) => {
                        if (valid.has(key)) {
                            next.add(key);
                        }
                    });
                    return next;
                });
            }
        } catch (err) {
            if (currentRequest === requestIdRef.current) {
                setError(err instanceof Error ? err.message : String(err));
                setEvents([]);
                setExpandedDays(new Set());
            }
        } finally {
            if (currentRequest === requestIdRef.current) {
                setLoading(false);
            }
        }
    }, [range.begin, range.end]);

    useEffect(() => {
        const dispose = window.data.onChanged(fetchData);
        return () => {
            dispose?.();
        };
    }, [fetchData]);

    const subjectSummary = useMemo(() => {
        const map = new Map<string, SubjectSlice>();
        let total = 0;
        events.forEach(([, entries]) => {
            entries.forEach(([taken, assignment]) => {
                const subject = assignment.subject;
                const slice = map.get(subject.id);
                if (slice) {
                    slice.taken += taken;
                } else {
                    map.set(subject.id, { subject, taken });
                }
                total += taken;
            });
        });
        const items = Array.from(map.values()).sort((a, b) => b.taken - a.taken);
        return { items, total };
    }, [events]);

    const summarySegments = useMemo(() => {
        return subjectSummary.items.map((item) => {
            const ratio = subjectSummary.total === 0 ? 0 : item.taken / subjectSummary.total;
            return {
                key: item.subject.id,
                color: item.subject.color,
                flex: item.taken,
                title: `${item.subject.name} ${percentFormatter.format(ratio)}`,
                label: (
                    <span>
                        {item.subject.name} {percentFormatter.format(ratio)}
                    </span>
                ),
                legend: (
                    <>
                        <span>{item.subject.name}</span>
                        <span>{percentFormatter.format(ratio)}</span>
                    </>
                ),
            };
        });
    }, [subjectSummary]);

    const dailyGroups = useMemo(() => {
        const map = new Map<
            string,
            {
                dateKey: string;
                date: Date;
                total: number;
                eventCount: number;
                subjectsMap: Map<string, SubjectSlice>;
                assignmentsMap: Map<string, AssignmentSlice>;
            }
        >();

        events.forEach(([created, entries]) => {
            const dateKey = formatInputDate(created);
            const group =
                map.get(dateKey) ??
                (() => {
                    const date = parseDateKey(dateKey);
                    const value = {
                        dateKey,
                        date,
                        total: 0,
                        eventCount: 0,
                        subjectsMap: new Map<string, SubjectSlice>(),
                        assignmentsMap: new Map<string, AssignmentSlice>(),
                    };
                    map.set(dateKey, value);
                    return value;
                })();

            group.eventCount += 1;
            entries.forEach(([taken, assignment]) => {
                group.total += taken;
                const subject = assignment.subject;
                const subjectSlice = group.subjectsMap.get(subject.id);
                if (subjectSlice) {
                    subjectSlice.taken += taken;
                } else {
                    group.subjectsMap.set(subject.id, { subject, taken });
                }

                const assignmentSlice = group.assignmentsMap.get(assignment.id);
                if (assignmentSlice) {
                    assignmentSlice.taken += taken;
                } else {
                    group.assignmentsMap.set(assignment.id, { assignment, subject, taken });
                }
            });
        });

        const entries: DailyGroup[] = Array.from(map.values()).map((group) => ({
            dateKey: group.dateKey,
            date: group.date,
            total: group.total,
            eventCount: group.eventCount,
            subjects: Array.from(group.subjectsMap.values()).sort((a, b) => b.taken - a.taken),
            assignments: Array.from(group.assignmentsMap.values()).sort(
                (a, b) => b.taken - a.taken || a.assignment.title.localeCompare(b.assignment.title, "zh-CN"),
            ),
        }));
        entries.sort((a, b) => a.date.getTime() - b.date.getTime());
        const maxTotal = entries.reduce((max, entry) => Math.max(max, entry.total), 0);
        return { entries, maxTotal };
    }, [events]);

    const toggleDay = (key: string) => {
        setExpandedDays((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const resetRange = () => {
        setRange(getDefaultRange());
        setExpandedDays(new Set());
    };

    const statusMessage = rangeError ?? error;

    return (
        <div className="allocation-page">
            <section className="allocation-card">
                <header className="allocation-card-header">
                    <div>
                        <h3>日期范围</h3>
                    </div>
                    <button type="button" className="outline" onClick={resetRange}>
                        重置
                    </button>
                </header>
                <div className="allocation-range">
                    <label>
                        <input
                            type="date"
                            value={range.begin}
                            onChange={(event) => setRange((prev) => ({ ...prev, begin: event.target.value }))}
                        />
                    </label>
                    <span className="allocation-range-sep">→</span>
                    <label>
                        <input
                            type="date"
                            value={range.end}
                            onChange={(event) => setRange((prev) => ({ ...prev, end: event.target.value }))}
                        />
                    </label>
                </div>
                {statusMessage && <div className="allocation-status error">{statusMessage}</div>}
                {!statusMessage && loading && <div className="allocation-status">正在加载数据…</div>}
            </section>

            <section className="allocation-card">
                <header className="allocation-card-header">
                    <div>
                        <h3>科目占比</h3>
                    </div>
                    <div className="allocation-card-meta">
                        <span>科目 {subjectSummary.items.length}</span>
                        <span>总计 {formatMinutes(subjectSummary.total)}</span>
                    </div>
                </header>
                {subjectSummary.total === 0 ? (
                    <div className="allocation-empty">选定区间内暂无数据</div>
                ) : (
                    <div className="allocation-summary">
                        <StackedBar
                            segments={summarySegments}
                            barClassName="allocation-summary-bar"
                            segmentClassName="allocation-bar-segment"
                            legendClassName="allocation-legend"
                            dotClassName="allocation-dot"
                            minLabelWidthPx={90}
                        />
                    </div>
                )}
            </section>

            <section className="allocation-card">
                <header className="allocation-card-header">
                    <div>
                        <h3>每日分配</h3>
                    </div>
                </header>
                {dailyGroups.entries.length === 0 ? (
                    <div className="allocation-empty">暂无每日数据</div>
                ) : (
                    <div className="allocation-day-list">
                        {dailyGroups.entries.map((day) => {
                            const expanded = expandedDays.has(day.dateKey);
                            const maxWidth = dailyGroups.maxTotal === 0 ? 0 : (day.total / dailyGroups.maxTotal) * 100;
                            return (
                                <div key={day.dateKey} className={expanded ? "allocation-day expanded" : "allocation-day"}>
                                    <button
                                        type="button"
                                        className="allocation-day-trigger"
                                        onClick={() => toggleDay(day.dateKey)}
                                        aria-expanded={expanded}
                                    >
                                        <div className="allocation-day-date">
                                            <span>
                                                {`${day.date.getMonth() + 1}`.padStart(2, "0")}-
                                                {`${day.date.getDate()}`.padStart(2, "0")}
                                                &nbsp;{WEEKDAYS[day.date.getDay()]}
                                            </span>
                                            <span>{formatMinutes(day.total)}</span>
                                            {/* <span className="allocation-day-subtitle"> */}
                                                {/* <span>记录 {day.eventCount}</span> */}
                                            {/* </span> */}
                                        </div>
                                        <div className="allocation-day-bar-wrapper" aria-hidden="true">
                                            <StackedBar
                                                segments={day.subjects.map((segment) => ({
                                                    key: segment.subject.id,
                                                    color: segment.subject.color,
                                                    flex: segment.taken,
                                                    label: <span>{Math.round(segment.taken)}</span>,
                                                }))}
                                                barClassName="allocation-day-bar"
                                                segmentClassName="allocation-bar-segment"
                                                style={{ width: `${maxWidth}%` }}
                                            />
                                        </div>
                                    </button>
                                    {expanded && (
                                        <div className="allocation-day-details">
                                            <table>
                                                <tbody>
                                                    {day.assignments.map((record, index) => (
                                                        <tr key={`${record.assignment.id}-${index}`}>
                                                            <td className="allocation-assignment-cell">
                                                                <Badge data={record.subject} />
                                                                <span>{record.assignment.title}</span>
                                                            </td>
                                                            <td>{formatMinutes(record.taken)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
};
