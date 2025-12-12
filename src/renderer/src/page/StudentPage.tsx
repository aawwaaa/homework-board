import { Tab } from "@renderer/component/Tab";

import "./StudentPage.css";
import { useEffect, useState } from "react";
import { AssignmentTitle } from "@renderer/component/AssignmentTitle";
import { AssignmentDetail } from "@renderer/component/AssignmentDetail";
import { SubmissionCreate } from "@renderer/component/SubmissionCreate";
import { randomId } from "@renderer/util";

const TodoPage: React.FC<{ assignments: AssignmentData[], student: Student }> = ({ assignments, student }) => {
    const [selected, setSelected] = useState<AssignmentData | null>(null);
    const [page, setPage] = useState("detail");

    const submit = async (spent = 0, feedback = "") => {
        await window.data.submission.create({
            id: randomId(),
            created: new Date(),
            assignment: selected!,
            student,
            spent: spent == 0? null: spent,
            feedback: feedback.trim() === ""? null: feedback.trim()
        }, student.name + " 提交作业 [" + selected!.subject.name + "] " + selected!.title);
        setSelected(null)
    }

    return <div className="page-todo">
        {/* 左右分栏布局 */}
        <div className="list">
            {assignments.map(assignment => <div
                key={assignment.id}
                onClick={() => {
                    setSelected(assignment)
                    setPage("detail")
                }}
                className={selected?.id === assignment.id ? "selected" : ""}
            >
                <AssignmentTitle assignment={assignment} />
            </div>
            )}
        </div>
        <div className="info">
            {selected && <>
                <div className="title">
                    <Tab tabs={[
                        ["detail", "详情"],
                        ["submit", "提交"]
                    ]} initial={page} set={setPage} />
                    <button className="outline" onClick={() => submit()}>快速提交</button>
                </div>
                <div className="content">
                    {page === "detail" && <AssignmentDetail assignment={selected} />}
                    {page === "submit" && <SubmissionCreate student={student} submit={submit} />}
                </div>
            </>}
        </div>
    </div>;
};

export const StudentPage: React.FC<{ left: string }> = ({ left }) => {
    const [page, setPage] = useState("todo");
    const [student, setStudent] = useState<Student | null>(null);
    const [assignments, setAssignments] = useState<AssignmentData[]>([]);

    useEffect(() => {
        return window.data.onChanged(async () => {
            const id = left.substring(1);
            const student = (await window.data.student.list()).find(student => student.id === id);
            if (!student) {
                return;
            }
            setStudent(student);
            const assignments = (await window.data.assignment.list(new Date(), new Date()));
            const submissions = (await window.data.submission.list(student));
            const todo = assignments.filter(assignment => !submissions.some(submission => submission.assignment.id === assignment.id));
            setAssignments(todo);
        })
    }, [left]);

    useEffect(() => {
        if (student == null) return;
        document.title = `个人数据: ${student.name}`
    }, [student]);

    return <div className="student-page">
        <div className="title">
            <Tab tabs={[
                ["todo", "未完成"],
            ]} initial={page} set={setPage} />
        </div>
        <div className="body">
            {student == null ? <div className="placeholder">加载中…</div> : <>
                {page === "todo" && <TodoPage assignments={assignments} student={student} />}
            </>}
        </div>
    </div>;
};
