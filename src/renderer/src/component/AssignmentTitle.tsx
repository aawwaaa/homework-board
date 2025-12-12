import { SubjectBadge } from "./SubjectBadge";

import "./AssignmentTitle.css";

export const AssignmentTitle: React.FC<{ assignment: AssignmentData, children?: React.ReactNode, classList?: string, style?: React.CSSProperties }> = ({ assignment, children, classList, style }) => {
    return <div className={classList ?? "assignment-title"} style={style}>
        <SubjectBadge subject={assignment.subject} />
        <h5>{assignment.title}</h5>
        {children}
    </div>
};