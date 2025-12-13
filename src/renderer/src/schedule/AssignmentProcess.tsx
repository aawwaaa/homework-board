import { AssignmentTitle } from "@renderer/component/AssignmentTitle";
import { useEffect, useRef, useState } from "react";

import "./AssignmentProcess.css";
import { SwipeAdjustInput } from "@renderer/component/SwipeAdjustInput";

const MINUTE = 60 * 1000;

const alignToUnit = (value: number, unit: number) => Math.round(value / unit) * unit;

const solvers: Record<string, (assignments: AssignmentData[], available: number, unit: number) => Record<string, number>> = {
    "优先级均分": (assignments, available, unit) => {
        const targetFor = (assignment: AssignmentData) => {
            const now = Date.now();
            const created = assignment.created.getTime();
            const deadline = assignment.deadline.getTime();
            const range = deadline - created;
            const passed = now - created;
            return (passed / range) * assignment.estimated;
        }

        const levels: Record<number, AssignmentData[]> = {};
        const result: Record<string, number> = {};
        for (const assignment of assignments) {
            levels[assignment.priority] ??= [];
            levels[assignment.priority].push(assignment);
        }
        for (const level of Object.entries(levels).sort((a, b) => +b[0] - +a[0])) {
            const assignments = level[1];
            const comsumption = assignments.reduce((a, b) => a + Math.max(0, targetFor(b) - b.spent), 0);
            const per = Math.min(available / comsumption, 1);
            let consumed = 0;
            for (const assignment of assignments) {
                const value = alignToUnit(per * (targetFor(assignment) - assignment.spent), unit);
                result[assignment.id] = value;
                consumed += value;
            }
            available -= consumed;
            if (available <= 0) break;
        }
        return result;
    },
    "优先级逐个": (assignments, available, unit) => {
        const sorted = assignments.map(a => a).sort((a, b) => b.priority - a.priority);
        const result: Record<string, number> = {};
        let remaining = available;
        for (const assignment of sorted) {
            const value = Math.min(assignment.estimated - assignment.spent, remaining);
            result[assignment.id] = alignToUnit(value, unit);
            remaining -= alignToUnit(value, unit);
            if (remaining <= 0) break;
        }
        return result;
    }
}

export const AssignmentProcess: React.FC<{ add: (entries: ScheduleEntry[]) => void, close: () => void }> = ({ add, close }) => {
    const [assignments, setAssignments] = useState<AssignmentData[]>([]);
    const [values, setValues] = useState<Record<string, number>>({});
    const [solver, setSolver] = useState<string>(Object.keys(solvers)[0]);
    const [unit, setUnit] = useState<number>(5);
    const [available, setAvailable] = useState<number>(50);
    const sliderDraggings = useRef<Record<string, boolean>>({});

    useEffect(() => {
        return window.data.onChanged(async () => {
            setAssignments(await window.data.assignment.list(new Date(), new Date()))
        })
    }, []);

    const modifyValue = (assignmentId: string, value: number) => {
        setValues((prev) => ({ ...prev, [assignmentId]: value }));
    };
    const pointerHandler = (assignment: AssignmentData) => (e: React.PointerEvent<HTMLDivElement>) => {
        e.preventDefault()
        const per = (e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.offsetWidth;
        const value = alignToUnit(per * assignment.estimated, unit) - assignment.spent;
        modifyValue(assignment.id, Math.min(Math.max(value, 0), assignment.estimated - assignment.spent))
        setAvailable(Object.values(values).reduce((a, b) => a + b, 0))
    }

    const solve = () => {
        const func = solvers[solver];
        if (!func) return;
        setValues(func(assignments, available, unit));
    }

    const confirm = () => {
        const entries: Record<string, number> = {};
        const out: ScheduleEntry[] = [];
        Object.entries(values).forEach(([assignmentId, value]) => {
            if (value <= 0 || isNaN(value)) return;
            const assignment = assignments.find((assignment) => assignment.id === assignmentId);
            if (!assignment) return;
            out.push({
                duration: value * MINUTE,
                title: assignment.title,
                description: assignment.description.trim() === ""? void 0: assignment.description,
            })
            entries[assignmentId] = value;
        })
        window.data.progress.update(Object.entries(entries).map(([a, b]) => [b, a]), "从作业数据导入")
        add(out)
        close()
    }

    return <div className="assignment-process">
        <div className="schedule-import-source-header">
            <button onClick={close} className="flat">关闭</button>
            <select value={solver} onChange={(e) => setSolver(e.target.value)}>
                {Object.entries(solvers).map(([name, _]) => <option key={name} value={name}>{name}</option>)}
            </select>
            <SwipeAdjustInput
                type="number" value={available} onChange={(e) => setAvailable(Math.max(0, e.target.valueAsNumber))}
                swipePxPerStep={30} onSwipeAdjust={(steps) => setAvailable(Math.max(0, available + steps * unit))}
                placeholder="可用时间"
            />
            <SwipeAdjustInput
                type="number" value={unit} onChange={(e) => setUnit(Math.max(5, e.target.valueAsNumber))}
                swipePxPerStep={30} onSwipeAdjust={(steps) => setUnit(Math.max(5, unit + steps * 5))}
                placeholder="时间单位"
            />
            <button onClick={solve} className="secondary">求解</button>
            <button onClick={confirm} className="primary">确定</button>
        </div>
        <div className="schedule-import-source-body list">
            {assignments.map((assignment) => {
                const handler = pointerHandler(assignment);
                return <div key={assignment.id} className="assignment-process-item">
                    <AssignmentTitle assignment={assignment} />
                    <div className="assignment-process-slider"
                        onPointerDown={(e) => {
                            sliderDraggings.current[assignment.id] = true;
                            handler(e);
                        }}
                        onPointerMove={(e) => {
                            if (sliderDraggings.current[assignment.id]) {
                                handler(e);
                            }
                        }}
                        onPointerUp={() => sliderDraggings.current[assignment.id] = false}
                        // onPointerLeave={() => sliderDraggings.current[assignment.id] = false}
                    >
                        <div className="filled" style={{ width: (assignment.spent / assignment.estimated) * 100 + "%" }} />
                        <div className="delta" style={{ width: ((assignment.spent + (values[assignment.id] ?? 0)) / assignment.estimated) * 100 + "%" }} />
                        <div className="handle" style={{ left: ((assignment.spent + (values[assignment.id] ?? 0)) / assignment.estimated) * 100 + "%" }}/>
                        <div className="text">
                            {assignment.spent} + {values[assignment.id] ?? 0} / {assignment.estimated}
                        </div>
                    </div>
                </div>
            })}
        </div>
    </div>;
};
