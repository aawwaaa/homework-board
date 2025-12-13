import "./AssignmentDetail.css";
import { AssignmentTitle } from "./AssignmentTitle";
import { Markdown } from "./Markdown";

export const AssignmentDetail: React.FC<{ assignment: AssignmentData }> = ({
  assignment,
}) => {
  return (
    <div className="assignment-detail">
      <AssignmentTitle assignment={assignment} />
      <div className="content">
        <Markdown text={assignment.description} />
      </div>
      <div className="footer">
        创建时间: {assignment.created.toLocaleString()}
        <br />
        截止时间: {assignment.deadline.toLocaleString()}
        <br />
        时间: {assignment.spent} 分钟 / {assignment.estimated} 分钟
      </div>
    </div>
  );
};
