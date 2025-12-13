import { FC, useCallback, useEffect, useState } from "react";
import { ListItem } from "./ListItem";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const ListView: FC<{
  origin: Date;
  filter?: (assignment: AssignmentData) => boolean;
  submittedDuration: number;
  submittingDuration: number;
  forward: number;
}> = ({ origin, filter, submittedDuration, submittingDuration, forward }) => {
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);

  const load = useCallback(async () => {
    const result = await window.data.assignment.list(
      new Date(origin.getTime() - submittedDuration * HOUR),
      new Date(origin.getTime() + forward * DAY),
    );
    const filtered = filter ? result.filter(filter) : result;
    filtered.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
    setAssignments(filtered);
  }, [filter, forward, origin, submittedDuration, submittingDuration]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return window.data.onChanged(load);
  }, [load]);

  return (
    <>
      {assignments.map((assignment) => (
        <ListItem
          key={assignment.id}
          assignment={assignment}
          state={
            assignment.deadline < origin
              ? "submitted"
              : assignment.deadline <
                  new Date(origin.getTime() + submittingDuration * HOUR)
                ? "submitting"
                : "normal"
          }
          showDescription={
            assignment.deadline >= origin &&
            assignment.submissions.length < assignment.totalRequiredSubmissions
          }
        />
      ))}
    </>
  );
};
