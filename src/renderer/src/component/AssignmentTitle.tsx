import { Badge } from "./Badge";

import "./AssignmentTitle.css";

export const AssignmentTitle: React.FC<{ assignment: AssignmentData, children?: React.ReactNode, classList?: string, style?: React.CSSProperties }> = ({ assignment, children, classList, style }) => {
    return <div className={classList ?? "assignment-title"} style={style}>
        <Badge data={assignment.subject} />
        {assignment.tags?.map(tag => <Badge key={tag.id} data={tag} />)}
        <h5>{assignment.title}</h5>
        {children}
    </div>
};