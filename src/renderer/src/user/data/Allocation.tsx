import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FC } from "react";

import { SubjectBadge } from "@renderer/component/SubjectBadge";

import "./Allocation.css";

type Range = {
    begin: string;
    end: string;
};

type SubjectSlice = {
    subject: Subject;
    taken: number;
};

type DailyGroup = {
    dateKey: string;
    date: Date;
    total: number;
    subjects: SubjectSlice[];
    records: DayRecord[];
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

const percentFormatter = new Intl.NumberFormat("zh-CN", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
});

const minuteFormatter = new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
});

const formatInputDate = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const toUTCDate = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
};

const parseDateKey = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
};

const getDefaultRange = (): Range => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    return {
        begin: formatInputDate(lastWeek),
        end: formatInputDate(nextWeek),
    };
};

const formatMinutes = (value: number) => `${minuteFormatter.format(value)} 分钟`;

export const AllocationPage: FC = () => {
    const [range, setRange] = useState<Range>(() => getDefaultRange());
    const [records, setRecords] = useState<Record<string, DayRecord[]>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rangeError, setRangeError] = useState<string | null>(null);
    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
    const requestIdRef = useRef(0);
    const summaryBarRef = useRef<HTMLDivElement | null>(null);
    const [summaryBarWidth, setSummaryBarWidth] = useState(0);

    useEffect(() => {
        const element = summaryBarRef.current;
        if (!element) {
            return;
        }
        const updateWidth = () => {
            setSummaryBarWidth(element.getBoundingClientRect().width);
        };
        updateWidth();
        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", updateWidth);
            return () => {
                window.removeEventListener("resize", updateWidth);
            };
        }
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                setSummaryBarWidth(entry.contentRect.width);
            }
        });
        observer.observe(element);
        return () => {
            observer.disconnect();
        };
    }, []);

    const fetchData = useCallback(async () => {
        const currentRequest = ++requestIdRef.current;
        if (!range.begin || !range.end) {
            setRangeError("请选择完整的日期范围");
            setRecords({});
            setExpandedDays(new Set());
            setLoading(false);
            return;
        }
        const begin = toUTCDate(range.begin);
        const end = toUTCDate(range.end);
        if (begin.getTime() > end.getTime()) {
            setRangeError("起始日期不能晚于结束日期");
            setRecords({});
            setExpandedDays(new Set());
            setLoading(false);
            return;
        }
        setRangeError(null);
        setLoading(true);
        setError(null);
        try {
            const result = await window.data.day.get(begin, end);
            if (currentRequest === requestIdRef.current) {
                setRecords(result);
                setExpandedDays((prev) => {
                    if (prev.size === 0) {
                        return prev;
                    }
                    const valid = new Set(Object.keys(result));
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
                setRecords({});
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
        Object.values(records).forEach((dayRecords) => {
            dayRecords.forEach((record) => {
                const slice = map.get(record.subject.id);
                if (slice) {
                    slice.taken += record.taken;
                } else {
                    map.set(record.subject.id, { subject: record.subject, taken: record.taken });
                }
                total += record.taken;
            });
        });
        const items = Array.from(map.values()).sort((a, b) => b.taken - a.taken);
        return { items, total };
    }, [records]);

    const summarySegments = useMemo(() => {
        if (!summaryBarWidth || subjectSummary.total === 0) {
            return subjectSummary.items.map((item) => ({
                ...item,
                ratio: subjectSummary.total === 0 ? 0 : item.taken / subjectSummary.total,
                showLabel: false,
            }));
        }
        return subjectSummary.items.map((item) => {
            const ratio = item.taken / subjectSummary.total;
            const width = summaryBarWidth * ratio;
            return {
                ...item,
                ratio,
                showLabel: width >= 60,
            };
        });
    }, [subjectSummary, summaryBarWidth]);

    const dailyGroups = useMemo(() => {
        const entries: DailyGroup[] = Object.entries(records).map(([dateKey, dayRecords]) => {
            const date = parseDateKey(dateKey);
            const total = dayRecords.reduce((sum, record) => sum + record.taken, 0);
            const subjectsMap = new Map<string, SubjectSlice>();
            dayRecords.forEach((record) => {
                const existing = subjectsMap.get(record.subject.id);
                if (existing) {
                    existing.taken += record.taken;
                } else {
                    subjectsMap.set(record.subject.id, { subject: record.subject, taken: record.taken });
                }
            });
            return {
                dateKey,
                date,
                total,
                subjects: Array.from(subjectsMap.values()).sort((a, b) => b.taken - a.taken),
                records: dayRecords
                    .slice()
                    .sort((a, b) => b.taken - a.taken || a.assignment.title.localeCompare(b.assignment.title, "zh-CN")),
            } satisfies DailyGroup;
        });
        entries.sort((a, b) => a.date.getTime() - b.date.getTime());
        const maxTotal = entries.reduce((max, entry) => Math.max(max, entry.total), 0);
        return { entries, maxTotal };
    }, [records]);

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
                        <div className="allocation-summary-bar" ref={summaryBarRef}>
                            {summarySegments.map((segment) => (
                                <div
                                    key={segment.subject.id}
                                    className="allocation-bar-segment"
                                    style={{ backgroundColor: segment.subject.color, flex: segment.taken }}
                                    title={`${segment.subject.name} ${percentFormatter.format(segment.ratio ?? 0)}`}
                                >
                                    {segment.showLabel && (
                                        <span>
                                            {segment.subject.name} {percentFormatter.format(segment.ratio ?? 0)}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                        {summarySegments.some((segment) => !segment.showLabel) && (
                            <ul className="allocation-legend">
                                {summarySegments
                                    .filter((segment) => !segment.showLabel)
                                    .map((segment) => (
                                        <li key={segment.subject.id}>
                                            <span
                                                className="allocation-dot"
                                                style={{ backgroundColor: segment.subject.color }}
                                            />
                                            <span>{segment.subject.name}</span>
                                            <span>{percentFormatter.format(segment.ratio ?? 0)}</span>
                                        </li>
                                    ))}
                            </ul>
                        )}
                    </div>
                )}
            </section>

            <section className="allocation-card">
                <header className="allocation-card-header">
                    <div>
                        <h3>每日占比</h3>
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
                                        </div>
                                        <div className="allocation-day-bar-wrapper" aria-hidden="true">
                                            <div className="allocation-day-bar" style={{ width: `${maxWidth}%` }}>
                                                {day.subjects.map((segment) => (
                                                    <div
                                                        key={segment.subject.id}
                                                        className="allocation-bar-segment"
                                                        style={{ backgroundColor: segment.subject.color, flex: segment.taken }}
                                                    >
                                                        <span>
                                                            {/* {segment.subject.name} * {formatMinutes(segment.taken)} */}
                                                            {Math.round(segment.taken)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </button>
                                    {expanded && (
                                        <div className="allocation-day-details">
                                            <table>
                                                <tbody>
                                                    {day.records.map((record, index) => (
                                                        <tr key={`${record.assignment.id}-${index}`}>
                                                            <td className="allocation-assignment-cell">
                                                                <SubjectBadge subject={record.subject} />
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
