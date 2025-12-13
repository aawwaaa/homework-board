import { AssignmentEdit } from "@renderer/component/AssignmentEdit";
import { Tab } from "@renderer/component/Tab";
import { UserPageProps } from "@renderer/page/UserPage";
import { useEffect, useState } from "react";

import "./AssignmentManage.css";
import { SubmissionStatus } from "./SubmissionStatus";
import { TimeStatus } from "./TimeStatus";

export const AssignmentManage: React.FC<{ assignment: AssignmentData, props: UserPageProps }> = ({ assignment: assign, props }) => {
    const [assignment, setAssignment] = useState(assign);
    const [page, setPage] = useState("edit");

    const [editingAssignment, setEditingAssignment] = useState(assignment);

    const confirmEdit = () => {
        window.data.assignment.modify(editingAssignment, `[${editingAssignment.subject.name}] 修改作业 ${editingAssignment.title}`);
        props.popPage();
    };
    const handleChange = (key: keyof Assignment, value: Assignment[keyof Assignment]) => {
        setEditingAssignment(prev => ({ ...prev, [key]: value }));
    };

    useEffect(() => {
        return window.data.onChanged(async () => {
            setAssignment(await window.data.assignment.get(assign.id));
        });
    }, []);

    return <div className="assignment-manage">
        <div className="title">
            <Tab
                tabs={[["edit", "编辑"], ["submission", "提交"], ["time", "时间"]]} 
                set={(id: string) => setPage(id)}
                initial={page}
            />
        </div>
        {page === "edit" && (<>
            <AssignmentEdit value={editingAssignment} onChange={handleChange} />
            <div>
                <button onClick={confirmEdit}>保存</button>
                <button className="danger" onClick={() => {
                    window.data.assignment.remove(assignment.id, `[${assignment.subject.name}] 删除作业 ${assignment.title}`);
                    props.popPage();
                }}>删除</button>
            </div>
        </>)}
        {page === "submission" && (<SubmissionStatus assignment={assignment} />)}
        {page === "time" && (<TimeStatus assignment={assignment} />)}
    </div>;
}
