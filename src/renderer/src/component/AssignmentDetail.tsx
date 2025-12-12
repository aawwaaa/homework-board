import "./AssignmentDetail.css";
import { AssignmentTitle } from "./AssignmentTitle";

export const AssignmentDetail: React.FC<{ assignment: AssignmentData }> = ({ assignment }) => {
    return <div className="assignment-detail">
        <AssignmentTitle assignment={assignment} />
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