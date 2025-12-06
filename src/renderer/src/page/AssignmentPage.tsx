import { StudentList } from "@renderer/component/StudentList";
import { SwipeAdjustInput } from "@renderer/component/SwipeAdjustInput";
import { Tab } from "@renderer/component/Tab";
import { randomId } from "@renderer/util";
import { useCallback, useEffect, useMemo, useState } from "react";

import "./AssignmentPage.css";
import { AssignmentDetail } from "@renderer/component/AssignmentDetail";

const SignPage: React.FC<{ assignment: AssignmentData }> = ({ assignment }) => {
    const [selected, setSelected] = useState<Student | null>(null);
    const [spent, setSpent] = useState<number>(0);
    const [feedback, setFeedback] = useState<string>("");
    const submissions = useMemo(() => new Set(assignment.submissions.map(a => a.student.id)), [assignment]);

    const confirm = useCallback(() => {
        if (selected == null) return;
        window.data.submission.create({
            id: randomId(),
            assignment: assignment,
            student: selected,
            created: new Date(),
            spent: spent == 0 ? null : spent,
            feedback: feedback.trim() === "" ? null : feedback,
        }, `${selected.name} 提交作业 [${assignment.subject.name}] ${assignment.title}`)
        setSelected(null);
        setSpent(0);
        setFeedback("");
    }, [selected, spent, feedback]);

    return <div className="sign-page">
        <StudentList selected={selected} setSelected={setSelected} onConfirm={confirm} filter={student => !submissions.has(student.id)} />
        <span>双击快速签到，或填写信息后提交</span>
        <hr />
        <div className="spent">
            <h5>用时</h5>
            <SwipeAdjustInput
                type="number"
                value={spent}
                onChange={(e => setSpent(Number(e.target.value)))}
                onSwipeAdjust={(steps => setSpent(Math.max(0, spent + steps * 5)))}
                swipePxPerStep={34}
            />
            分钟
        </div>
        <div>
            <h5>反馈</h5>
            <textarea value={feedback} onChange={(e => setFeedback(e.target.value))}></textarea>
        </div>
        <button disabled={selected == null} onClick={confirm}>提交</button>
    </div>;
};

const DetailPage: React.FC<{ assignment: AssignmentData }> = ({ assignment }) => {
    return <AssignmentDetail assignment={assignment} />;
};

export const AssignmentPage: React.FC<{ left: string }> = ({ left }) => {
    const [page, setPage] = useState<string>("sign");

    const [assignment, setAssignment] = useState<AssignmentData | null>(null);

    useEffect(() => {
        return window.data.onChanged(async () => {
            const id = left.substring(1);
            const assignment = await window.data.assignment.get(id);
            setAssignment(assignment);
        })
    }, [left]);

    return <div>
        <div className="title">
            <Tab tabs={[
                ["sign", "签到"],
                ["detail", "详情"],
            ]} initial={page} set={setPage} />
        </div>
        {assignment == null ? <div>加载中…</div> : <div>
            {page === "sign" && <SignPage assignment={assignment} />}
            {page === "detail" && <DetailPage assignment={assignment} />}
        </div>}
    </div>;
};
