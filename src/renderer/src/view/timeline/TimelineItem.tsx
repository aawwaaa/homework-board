import { SubjectBadge } from "@renderer/component/SubjectBadge";
import { FC } from "react";

import "./TimelineItem.css";

export const StandardTimelineItem: FC<{assignment: AssignmentData, x: number, width: number, onClick?: () => void}> = ({assignment, x, width, onClick}) => {
    return <div className="timeline-item" style={{left: x, width}} key={assignment.id}>
        <div className={"timeline-item-bar" + " priority-" + assignment.priority} onClick={onClick} style={{cursor: onClick ? "pointer" : "default"}}>
            <SubjectBadge subject={assignment.subject} />
            <span>{assignment.title}</span>
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
        
        <div className="timeline-item-description">
            <span>{assignment.description}</span>
        </div>
    </div>
}

export const standardTimelineItemBuilder = (assignment: AssignmentData, {x, width}: {x: number, width: number}) => {
    return <StandardTimelineItem assignment={assignment} x={x} width={width} />;
}