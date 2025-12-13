import { FC, useEffect, useState } from "react";

import "./StudentList.css";

const UNALLOCATED = "未分配";

export const StudentList: FC<{
  selected?: Student | null;
  setSelected: (student: Student) => void;
  onConfirm?: (student: Student) => void;
  filter?: (student: Student) => boolean;
  active?: (student: Student) => boolean;
}> = ({ selected, setSelected, onConfirm, filter, active }) => {
  const [students, setStudents] = useState<Record<string, Student[]> | null>(
    null,
  );
  const [groups, setGroups] = useState<string[]>([]);

  useEffect(() => {
    return window.data.onChanged(async () => {
      const students = await window.data.student.list();
      const groups = [UNALLOCATED];
      const grouped: Record<string, Student[]> = {};

      for (const student of students) {
        const group = student.group || UNALLOCATED;
        if (!groups.includes(group)) {
          groups.push(group);
        }
        grouped[group] ??= [];
        grouped[group].push(student);
      }

      setGroups(groups);
      setStudents(grouped);
    });
  }, []);

  return (
    <div>
      {students == null ? (
        <div className="content">加载中…</div>
      ) : (
        groups
          .filter((group) => students?.[group]?.length > 0)
          .map((group) => (
            <div key={group} className="student-list-group">
              <h3>{group}</h3>
              <div className="list">
                {students[group].map((student) => (
                  <button
                    key={student.id}
                    className={
                      "outline" +
                      (selected?.id === student.id || active?.(student)
                        ? " selected"
                        : "")
                    }
                    onClick={() => {
                      if (selected?.id === student.id) {
                        onConfirm?.(selected);
                      } else {
                        setSelected(student);
                      }
                    }}
                    disabled={filter?.(student) === false}
                  >
                    {student.name}
                  </button>
                ))}
              </div>
            </div>
          ))
      )}
    </div>
  );
};
