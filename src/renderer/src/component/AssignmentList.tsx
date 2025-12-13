import { useCallback, useEffect, useMemo, useState } from "react";

import "./AssignmentList.css";
import { AssignmentTitle } from "./AssignmentTitle";

type AssignmentListProps = {
  onClick?: (assignment: AssignmentData) => void;
  className?: string;
};

const ALL_SUBJECT = "$all";

export const AssignmentList: React.FC<AssignmentListProps> = ({
  onClick,
  className,
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>(ALL_SUBJECT);
  const [loading, setLoading] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [subjectList, assignmentList] = await Promise.all([
        window.data.subject.list(),
        window.data.assignment.list(new Date(), null),
      ]);
      setSubjects(subjectList);
      setAssignments(assignmentList);
    } catch (error) {
      console.error("Failed to load assignments", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const dispose = window.data.onChanged(refresh);
    return () => {
      dispose?.();
    };
  }, [refresh]);

  useEffect(() => {
    if (selectedSubject === ALL_SUBJECT) {
      return;
    }
    if (!subjects.some((subject) => subject.id === selectedSubject)) {
      setSelectedSubject(ALL_SUBJECT);
    }
  }, [subjects, selectedSubject]);

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [],
  );

  const visibleAssignments = useMemo(() => {
    const filtered =
      selectedSubject === ALL_SUBJECT
        ? assignments
        : assignments.filter(
            (assignment) => assignment.subject.id === selectedSubject,
          );
    return filtered
      .slice()
      .sort(
        (a, b) =>
          a.deadline.getTime() - b.deadline.getTime() ||
          a.created.getTime() - b.created.getTime(),
      );
  }, [assignments, selectedSubject]);

  const activeSubjectLabel = useMemo(() => {
    if (selectedSubject === ALL_SUBJECT) {
      return "全部作业";
    }
    const subject = subjects.find((entry) => entry.id === selectedSubject);
    return subject ? subject.name : "全部作业";
  }, [selectedSubject, subjects]);

  const containerClass = ["assignment-list", className]
    .filter(Boolean)
    .join(" ");

  const renderAssignment = (assignment: AssignmentData) => {
    const clickable = Boolean(onClick);
    const handleActivate = () => {
      onClick?.(assignment);
    };
    return (
      <li
        key={assignment.id}
        className={
          clickable ? "assignment-list-item clickable" : "assignment-list-item"
        }
        onClick={clickable ? handleActivate : undefined}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={
          clickable
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleActivate();
                }
              }
            : undefined
        }
      >
        <AssignmentTitle
          assignment={assignment}
          classList="assignment-list-item-title"
        />
        <div className="assignment-list-deadline">
          截止 {formatter.format(assignment.deadline)}
        </div>
      </li>
    );
  };

  return (
    <div className={containerClass}>
      <aside className="assignment-list-sidebar">
        <div>
          <ul>
            <li>
              <button
                type="button"
                className={selectedSubject === ALL_SUBJECT ? "active" : ""}
                onClick={() => setSelectedSubject(ALL_SUBJECT)}
              >
                全部
              </button>
            </li>
            {subjects.map((subject) => (
              <li key={subject.id}>
                <button
                  type="button"
                  className={selectedSubject === subject.id ? "active" : ""}
                  onClick={() => setSelectedSubject(subject.id)}
                >
                  {subject.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <section className="assignment-list-content">
        <div className="assignment-list-meta">
          <span>{activeSubjectLabel}</span>
          <span>
            {loading ? "加载中…" : `共 ${visibleAssignments.length} 个`}
          </span>
        </div>
        {loading ? (
          <div className="assignment-list-empty">正在加载作业…</div>
        ) : visibleAssignments.length === 0 ? (
          <div className="assignment-list-empty">暂无作业</div>
        ) : (
          <ul className="assignment-list-items">
            {visibleAssignments.map(renderAssignment)}
          </ul>
        )}
      </section>
    </div>
  );
};
