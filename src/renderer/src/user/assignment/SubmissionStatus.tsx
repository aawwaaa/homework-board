import { FC, useState, useMemo, useEffect } from "react";

import "./AssignmentManage.css"

export const SubmissionStatus: FC<{ assignment: AssignmentData }> = ({ assignment }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [inversed, setInversed] = useState(false);
    const submissionSet = useMemo(() => new Set(assignment.submissions.map(submission => submission.student.id)), [assignment]);

    useEffect(() => {
        return window.data.onChanged(async () => {
            setStudents(await window.data.student.list());
        });
    }, []);

    return <>
        <div>
            <div className="progress">
                <div className="bar" style={{ width: `${assignment.submissions.length / assignment.totalRequiredSubmissions * 100}%` }} />
                <span>提交进度 {assignment.submissions.length} / {assignment.totalRequiredSubmissions}
                ({Math.round(assignment.submissions.length / assignment.totalRequiredSubmissions * 100)}%)</span>
            </div>
        </div>
        <div>
            <div className="title" style={{width: "100%"}}>
                <span>{!inversed? "未提交": "已提交"}</span>
                <a style={{float: "right", fontWeight: "normal", cursor: "pointer" }} onClick={() => setInversed(!inversed)}>切换</a>
            </div>
            <div className="unsubmitted">
                {(() => {
                    const target = students.filter(student => inversed != !submissionSet.has(student.id))
                    return target.map(student => <span key={student.id}>{student.name}</span>);
                })()}
            </div>
        </div>
        <div>
            <div className="title">反馈</div>
            <div className="feedback">
                {assignment.submissions.filter(submission => submission.feedback).map(submission =>
                    <div key={submission.id}>{submission.feedback}</div>
                )}
            </div>
        </div>
    </>
}