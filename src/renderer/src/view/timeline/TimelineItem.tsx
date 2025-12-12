import { CSSProperties, FC } from "react";

import "./TimelineItem.css";
import { AssignmentTitle } from "@renderer/component/AssignmentTitle";

type TimelineItemStyle = CSSProperties & {
    "--timeline-item-x"?: string;
    "--timeline-item-width"?: string;
};

export const StandardTimelineItem: FC<{assignment: AssignmentData, x: number, width: number, onClick?: () => void}> = ({assignment, x, width, onClick}) => {
    const style: TimelineItemStyle = {
        left: x,
        width,
        "--timeline-item-x": `${x}px`,
        "--timeline-item-width": `${width}px`,
    };
    return <div className="timeline-item" style={style} key={assignment.id}>
        <div className={"timeline-item-bar" + " priority-" + assignment.priority} onClick={onClick} style={{cursor: onClick ? "pointer" : "default"}}>
            <AssignmentTitle assignment={assignment} />
            <div className="timeline-item-time-progress" style={{width: width * assignment.spent / assignment.estimated}}>
                <span>{assignment.spent}</span>
                <span> / </span>
                <span>{assignment.estimated}</span>
                <span> ({Math.round(assignment.spent / assignment.estimated * 100)}%)</span>
            </div>
            <div className="timeline-item-submission-progress" style={{width: width * assignment.submissions.length / assignment.totalRequiredSubmissions}}>
                <span>{assignment.submissions.length}</span>
                <span> / </span>
                <span>{assignment.totalRequiredSubmissions}</span>
                <span> ({Math.round(assignment.submissions.length / assignment.totalRequiredSubmissions * 100)}%)</span>
            </div>
        </div>
        
        {/* <div className="timeline-item-description">
            <span>{assignment.description}</span>
        </div> */}
    </div>
}

export const standardTimelineItemBuilder = (assignment: AssignmentData, {x, width}: {x: number, width: number}, onClick?: () => void) => {
    return <StandardTimelineItem assignment={assignment} x={x} width={width} onClick={onClick} />;
}
