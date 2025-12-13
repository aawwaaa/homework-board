import { useCallback, useEffect, useMemo, useState } from "react";
import type { FC } from "react";

import "./Overview.css";

const numberFormatter = new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const formatMinutes = (value: number) => `${numberFormatter.format(value)} 分钟`;

export const OverviewPage: FC = () => {
    const [assignments, setAssignments] = useState<AssignmentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadAssignments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await window.data.assignment.list(new Date(), null);
            setAssignments(result);
        } catch (err) {
            setAssignments([]);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAssignments();
    }, [loadAssignments]);

    useEffect(() => {
        const dispose = window.data.onChanged(loadAssignments);
        return () => {
            dispose?.();
        };
    }, [loadAssignments]);

    const { ongoingCount, remainingMinutes } = useMemo(() => {
        const ongoingAssignments = assignments.filter(
            (assignment) => assignment.estimated > assignment.spent,
        );
        const remaining = ongoingAssignments.reduce((sum, assignment) => {
            const rest = assignment.estimated - assignment.spent;
            return sum + (rest > 0 ? rest : 0);
        }, 0);
        return {
            ongoingCount: ongoingAssignments.length,
            remainingMinutes: remaining,
        };
    }, [assignments]);

    // const statusText = (() => {
    //     if (error) {
    //         return `同步失败：${error}`;
    //     }
    //     if (loading) {
    //         return "同步中…";
    //     }
    //     return `已同步 ${assignments.length} 个作业`;
    // })();

    const statusClass = ["overview-status"];
    if (error) {
        statusClass.push("error");
    } else if (loading) {
        statusClass.push("loading");
    }

    return (
        <div className="overview-page">
            <section className="overview-card">
                <div className="overview-card-header">
                    <h3>总览</h3>
                    {/* <span className={statusClass.join(" ")}>{statusText}</span> */}
                </div>
                <div className="overview-metric-grid">
                    <div className="overview-metric">
                        <span>进行中的作业</span>
                        <strong>{numberFormatter.format(ongoingCount)}</strong>
                        {/* <p>统计 estimated &gt; spent 的记录</p> */}
                    </div>
                    <div className="overview-metric">
                        <span>预计剩余</span>
                        <strong>{formatMinutes(remainingMinutes)}</strong>
                        {/* <p>∑(estimated - spent)</p> */}
                    </div>
                </div>
            </section>
            {/* <p className="overview-note">
                仅统计今日及之后的作业，数据随修改自动同步。
            </p> */}
        </div>
    );
};
