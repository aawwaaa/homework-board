import { FC, useState, useMemo, useEffect } from "react";

import "./AssignmentManage.css";

export const TimeStatus: FC<{ assignment: AssignmentData }> = ({
  assignment,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const data = useMemo(() => {
    const data = assignment.submissions.filter(
      (submission) => submission.spent != null,
    );
    const dataAmount = data.length;
    const average =
      data.reduce((acc, submission) => acc + submission.spent!, 0) / dataAmount;
    const median = data
      .sort((a, b) => a.spent! - b.spent!)
      .at(Math.floor(dataAmount / 2))?.spent!;
    const max = data.reduce(
      (acc, submission) => Math.max(acc, submission.spent!),
      0,
    );
    const min = data.reduce(
      (acc, submission) => Math.min(acc, submission.spent!),
      Infinity,
    );
    const sorted = data.sort((a, b) => a.spent! - b.spent!);
    return {
      sorted,
      dataAmount,
      average: Math.round(average * 10) / 10,
      median: Math.round(median * 10) / 10,
      max: Math.round(max * 10) / 10,
      min: Math.round(min * 10) / 10,
    };
  }, [assignment]);

  useEffect(() => {
    return window.data.onChanged(async () => {
      setStudents(await window.data.student.list());
    });
  }, []);

  return (
    <>
      <div>
        <div className="title">时间统计</div>
        <div>
          数据量: {data.dataAmount} / {assignment.submissions.length} (
          {Math.round((data.dataAmount / assignment.submissions.length) * 100)}
          %)
        </div>
        <div>平均值: {data.average} 分钟</div>
        <div>中位数: {data.median} 分钟</div>
        <div>最大值: {data.max} 分钟</div>
        <div>最小值: {data.min} 分钟</div>
      </div>
      <div>
        <div className="title">详细</div>
        <div className="data">
          {data.sorted.map((submission) => (
            <div key={submission.id} className="progress time-data">
              <div
                className="bar"
                style={{ width: `${(submission.spent! / data.max) * 100}%` }}
              />
              <span>
                {
                  students.find(
                    (student) => student.id === submission.student.id,
                  )?.name
                }
              </span>
              <span>{submission.spent!} 分钟</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
