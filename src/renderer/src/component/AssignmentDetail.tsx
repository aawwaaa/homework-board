import { SubjectBadge } from "./SubjectBadge";

import "./AssignmentDetail.css";

export const AssignmentDetail: React.FC<{ assignment: AssignmentData }> = ({ assignment }) => {
    return <div className="assignment-detail">
        <div className="title">
            <SubjectBadge subject={assignment.subject} />
            <h5>{assignment.title}</h5>
            <span>{assignment.priority}</span>
        </div>
        <div className="content">
            <p>{assignment.description}</p>
        </div>
        <div className="footer">
            创建时间: {assignment.created.toLocaleString()}<br/>
            截止时间: {assignment.deadline.toLocaleString()}<br/>
            时间: {assignment.spent} 分钟 / {assignment.estimated} 分钟
        </div>
    </div>;
};