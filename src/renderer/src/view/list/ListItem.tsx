import { FC, KeyboardEvent } from "react";

import "./ListItem.css";
import { toRelativeTime } from "@renderer/util";
import { AssignmentTitle } from "@renderer/component/AssignmentTitle";
import { Markdown } from "@renderer/component/Markdown";

export type ListItemState = "submitted" | "submitting" | "normal";

export type ListItemProps = {
  assignment: AssignmentData;
  state?: ListItemState;
  showDescription?: boolean;
  onClick?: (assignment: AssignmentData) => void;
  className?: string;
};

// type ExtendedAssignment = AssignmentData & { totalRequiredSubmissions?: number };

// const formatProgress = (spent: number, estimated: number) => {
//     if (!estimated) {
//         return "0%";
//     }
//     const percent = Math.min(Math.round(spent / estimated * 100), 999);
//     return `${percent}%`;
// };

// const formatSubmissionProgress = (assignment: ExtendedAssignment) => {
//     const required = assignment.totalRequiredSubmissions ?? assignment.submissions.length;
//     if (!required) {
//         return "0%";
//     }
//     const percent = Math.min(Math.round(assignment.submissions.length / required * 100), 999);
//     return `${percent}%`;
// };

export const ListItem: FC<ListItemProps> = ({
  assignment,
  state = "normal",
  showDescription = false,
  onClick,
  className,
}) => {
  const classes = [
    "list-view-item",
    `state-${state}`,
    onClick ? "actionable" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleActivate = () => {
    onClick?.(assignment);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onClick) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleActivate();
    }
  };

  // const extendedAssignment = assignment as ExtendedAssignment;
  // const totalRequired = extendedAssignment.totalRequiredSubmissions ?? assignment.submissions.length;
  // const submissionPercent = formatSubmissionProgress(extendedAssignment);
  // const timePercent = formatProgress(assignment.spent, assignment.estimated);
  const descriptionText = showDescription ? assignment.description.trim() : "";
  const hasDescription = descriptionText.length > 0;

  return (
    <article
      className={classes}
      onClick={onClick ? handleActivate : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
    >
      <AssignmentTitle
        assignment={assignment}
        classList="list-view-item-header"
      >
        {/* <span className="list-view-item-priority">P{assignment.priority}</span> */}
        <time
          className="list-view-item-deadline"
          dateTime={assignment.deadline.toISOString()}
        >
          {toRelativeTime(assignment.deadline)}
        </time>
      </AssignmentTitle>
      {hasDescription && (
        <Markdown
          className="list-view-item-description"
          text={descriptionText}
        />
      )}
      {/* <footer className="list-view-item-meta">
                <span>创建 {assignment.created.toLocaleString()}</span>
                <span>
                    用时 {assignment.spent} / {assignment.estimated} 分钟 ({timePercent})
                </span>
                <span>
                    提交 {assignment.submissions.length} / {totalRequired} ({submissionPercent})
                </span>
            </footer> */}
    </article>
  );
};
