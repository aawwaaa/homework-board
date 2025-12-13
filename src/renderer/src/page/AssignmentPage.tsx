import { StudentList } from "@renderer/component/StudentList";
import { Tab } from "@renderer/component/Tab";
import { randomId } from "@renderer/util";
import { useCallback, useEffect, useMemo, useState } from "react";

import "./AssignmentPage.css";
import { AssignmentDetail } from "@renderer/component/AssignmentDetail";
import { SubmissionCreate } from "@renderer/component/SubmissionCreate";

const SignPage: React.FC<{ assignment: AssignmentData }> = ({ assignment }) => {
  const [selected, setSelected] = useState<Student | null>(null);
  const submissions = useMemo(
    () => new Set(assignment.submissions.map((a) => a.student.id)),
    [assignment],
  );

  const confirm = useCallback(
    (spent: number = 0, feedback: string = "") => {
      if (selected == null) return;
      window.data.submission.create(
        {
          id: randomId(),
          assignment: assignment,
          student: selected,
          created: new Date(),
          spent: spent == 0 ? null : spent,
          feedback: feedback.trim() === "" ? null : feedback,
        },
        `${selected.name} 提交作业 [${assignment.subject.name}] ${assignment.title}`,
      );
      setSelected(null);
    },
    [selected],
  );

  return (
    <div className="sign-page">
      <StudentList
        selected={selected}
        setSelected={setSelected}
        onConfirm={() => confirm()}
        filter={(student) => !submissions.has(student.id)}
      />
      <span>双击快速签到，或填写信息后提交</span>
      <hr />
      <SubmissionCreate student={selected} submit={confirm} />
    </div>
  );
};

const DetailPage: React.FC<{ assignment: AssignmentData }> = ({
  assignment,
}) => {
  return <AssignmentDetail assignment={assignment} />;
};

export const AssignmentPage: React.FC<{ left: string }> = ({ left }) => {
  const [page, setPage] = useState<string>("sign");

  const [assignment, setAssignment] = useState<AssignmentData | null>(null);

  useEffect(() => {
    return window.data.onChanged(async () => {
      const id = left.substring(1);
      const assignment = await window.data.assignment.get(id);
      setAssignment(assignment);
    });
  }, [left]);

  useEffect(() => {
    if (assignment == null) return;
    document.title = `${assignment.title}`;
  }, [assignment]);

  return (
    <div className="assignment-page">
      <div className="title">
        <Tab
          tabs={[
            ["sign", "签到"],
            ["detail", "详情"],
          ]}
          initial={page}
          set={setPage}
        />
        <button
          onClick={() => {
            window.api.showSignWindow();
            window.close();
          }}
          className="outline"
        >
          返回
        </button>
      </div>
      {assignment == null ? (
        <div>加载中…</div>
      ) : (
        <div>
          {page === "sign" && <SignPage assignment={assignment} />}
          {page === "detail" && <DetailPage assignment={assignment} />}
        </div>
      )}
    </div>
  );
};
