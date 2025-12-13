import { useState } from "react";
import type { FC } from "react";

import { AssignmentSubmissionView } from "../../view/AssignmentSubmissionView";
// import { formatInputDate } from "./allocationCommon";

import "./SubmissionTimeline.css";

// const parseLocalInputDate = (value: string) => {
//     const [year, month, day] = value.split("-").map(Number);
//     return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, 0, 0, 0, 0);
// };

// const endOfLocalDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);

export const SubmissionTimelinePage: FC = () => {
    const [range, setRange] = useState(() => {
        const end = new Date();
        const start = new Date(end);
        start.setDate(start.getDate() - 14);
        return { start, end };
    });

    // const beginValue = useMemo(() => formatInputDate(range.start), [range.start]);
    // const endValue = useMemo(() => formatInputDate(range.end), [range.end]);

    // const resetRange = () => {
    //     const end = new Date();
    //     const start = new Date(end);
    //     start.setDate(start.getDate() - 3);
    //     setRange({ start, end });
    // };

    return (
        <div className="submission-timeline-page">
            {/* <section className="submission-timeline-card">
                <header className="submission-timeline-card-header">
                    <div>
                        <h3>日期范围</h3>
                    </div>
                    <button type="button" className="outline" onClick={resetRange}>
                        重置
                    </button>
                </header>
                <div className="submission-timeline-range">
                    <label>
                        <input
                            type="date"
                            value={beginValue}
                            onChange={(event) => {
                                const start = parseLocalInputDate(event.target.value);
                                setRange((prev) => ({ ...prev, start }));
                            }}
                        />
                    </label>
                    <span className="submission-timeline-range-sep">→</span>
                    <label>
                        <input
                            type="date"
                            value={endValue}
                            onChange={(event) => {
                                const end = endOfLocalDay(parseLocalInputDate(event.target.value));
                                setRange((prev) => ({ ...prev, end }));
                            }}
                        />
                    </label>
                </div>
            </section> */}

            {/* <section className="submission-timeline-card"> */}
                {/* <header className="submission-timeline-card-header">
                    <div>
                        <h3>提交时间轴</h3>
                    </div>
                </header> */}
                <AssignmentSubmissionView
                    start={range.start}
                    end={range.end}
                    onRangeChange={(start, end) => setRange({ start, end })}
                    heightPx={400}
                />
            {/* </section> */}
        </div>
    );
};

