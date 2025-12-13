import { StudentList } from "@renderer/component/StudentList";
import { Tab } from "@renderer/component/Tab";
import { useEffect, useState } from "react";

import "../user/assignment/AssignmentManage.css";

export const Statistics = () => {
  const [page, setPage] = useState("input");
  const [students, setStudents] = useState<Student[]>([]);
  const [data, setData] = useState<Record<string, boolean>>({});

  useEffect(() => {
    return window.data.onChanged(async () => {
      const students = await window.data.student.list();
      const data: Record<string, boolean> = {};
      for (const student of students) {
        data[student.id] ??= false;
      }
      setStudents(students);
      setData((prev) => ({ ...data, ...prev }));
    });
  }, []);

  const [inversed, setInversed] = useState(false);
  const trues = Object.values(data).filter((v) => v).length;

  return (
    <div
      className="tool-statistics assignment-manage"
      style={{ height: "100%" }}
    >
      <div className="title">
        <Tab
          tabs={[
            ["input", "输入"],
            ["output", "输出"],
          ]}
          initial={page}
          set={setPage}
        />
      </div>
      <div className="content" style={{ height: "100%" }}>
        {page === "input" ? (
          <StudentList
            selected={null}
            setSelected={(student) => {
              setData((prev) => ({ ...prev, [student.id]: !prev[student.id] }));
            }}
            active={(student) => data[student.id]}
          />
        ) : (
          <div>
            <div>
              <div className="progress">
                <div
                  className="bar"
                  style={{ width: `${(trues / students.length) * 100}%` }}
                />
                <span>
                  {trues} / {students.length}(
                  {Math.round((trues / students.length) * 100)}%)
                </span>
              </div>
            </div>
            <div>
              <div className="title" style={{ width: "100%" }}>
                <span>{!inversed ? "已选择" : "未选择"}</span>
                <a
                  style={{
                    float: "right",
                    fontWeight: "normal",
                    cursor: "pointer",
                  }}
                  onClick={() => setInversed(!inversed)}
                >
                  切换
                </a>
              </div>
              <div className="unsubmitted">
                {(() => {
                  const target = students.filter(
                    (student) => inversed != data[student.id],
                  );
                  return target.map((student) => (
                    <span key={student.id}>{student.name}</span>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
