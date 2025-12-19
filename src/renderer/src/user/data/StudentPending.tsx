import { useCallback, useEffect, useMemo, useState } from "react";
import type { FC } from "react";

import { AssignmentTitle } from "@renderer/component/AssignmentTitle";
// import { formatInputDate } from "./allocationCommon";

import "./StudentPending.css";

type PendingAssignment = {
  assignment: AssignmentData;
  submitted: number;
};

type StudentPendingSummary = {
  student: Student;
  pendingAssignments: PendingAssignment[];
  pendingCount: number;
};

type Bucket = {
  pendingCount: number;
  students: StudentPendingSummary[];
};

export const StudentPendingPage: FC = () => {
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeBucket, setActiveBucket] = useState<number | null>(null);
  const [expandedStudents, setExpandedStudents] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignmentResult, studentResult] = await Promise.all([
        window.data.assignment.list(new Date(), null),
        window.data.student.list(),
      ]);
      setAssignments(assignmentResult);
      setStudents(studentResult);
    } catch (err) {
      setAssignments([]);
      setStudents([]);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const dispose = window.data.onChanged(loadData);
    return () => {
      dispose?.();
    };
  }, [loadData]);

  const pendingSummaries = useMemo<StudentPendingSummary[]>(() => {
    const studentMap = new Map<string, StudentPendingSummary>();

    const ensureStudent = (student: Student) => {
      const existing = studentMap.get(student.id);
      if (existing) {
        return existing;
      }
      const next = {
        student,
        pendingAssignments: [],
        pendingCount: 0,
      };
      studentMap.set(student.id, next);
      return next;
    };

    students.forEach((student) => {
      ensureStudent(student);
    });

    assignments.forEach((assignment) => {
      const submissionCounts = new Map<string, number>();
      assignment.submissions.forEach((submission) => {
        ensureStudent(submission.student);
        submissionCounts.set(
          submission.student.id,
          (submissionCounts.get(submission.student.id) ?? 0) + 1,
        );
      });

      studentMap.forEach((summary) => {
        const submitted = submissionCounts.get(summary.student.id) ?? 0;
        if (submitted === 0) {
          summary.pendingAssignments.push({
            assignment,
            submitted,
          });
        }
      });
    });

    const summaries = Array.from(studentMap.values()).map((summary) => {
      const sortedAssignments = [...summary.pendingAssignments].sort(
        (a, b) =>
          new Date(a.assignment.deadline).getTime() -
          new Date(b.assignment.deadline).getTime(),
      );
      return {
        ...summary,
        pendingAssignments: sortedAssignments,
        pendingCount: sortedAssignments.length,
      };
    });

    return summaries.sort((a, b) => {
      const diff = a.pendingCount - b.pendingCount;
      if (diff !== 0) {
        return diff;
      }
      return a.student.name.localeCompare(b.student.name, "zh-CN");
    });
  }, [assignments, students]);

  const buckets = useMemo<Bucket[]>(() => {
    const bucketMap = new Map<number, StudentPendingSummary[]>();
    pendingSummaries.forEach((summary) => {
      const list = bucketMap.get(summary.pendingCount) ?? [];
      list.push(summary);
      bucketMap.set(summary.pendingCount, list);
    });
    return Array.from(bucketMap.entries())
      .map(([pendingCount, studentList]) => ({
        pendingCount,
        students: studentList,
      }))
      .sort((a, b) => a.pendingCount - b.pendingCount);
  }, [pendingSummaries]);

  useEffect(() => {
    if (buckets.length === 0) {
      setActiveBucket(null);
      return;
    }
    if (
      activeBucket === null ||
      !buckets.some((bucket) => bucket.pendingCount === activeBucket)
    ) {
      setActiveBucket(buckets[0]?.pendingCount ?? null);
      setExpandedStudents([]);
    }
  }, [activeBucket, buckets]);

  const selectedBucket = buckets.find(
    (bucket) => bucket.pendingCount === activeBucket,
  );

  const maxBucketSize = useMemo(() => {
    return buckets.reduce(
      (max, bucket) => Math.max(max, bucket.students.length),
      1,
    );
  }, [buckets]);

  // const totalPendingAssignments = useMemo(() => {
  //   return pendingSummaries.reduce(
  //     (sum, summary) => sum + summary.pendingCount,
  //     0,
  //   );
  // }, [pendingSummaries]);

  const toggleStudent = (studentId: string) => {
    setExpandedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const statusText = (() => {
    if (error) {
      return `同步失败：${error}`;
    }
    if (loading) {
      return "同步中…";
    }
    return `共 ${students.length} 名学生` // · ${totalPendingAssignments} 个未完成作业`;
  })();

  return (
    <div className="student-pending-page">
      <section className="student-pending-card">
        <div className="student-pending-card-header">
          <h3>学生未完成作业</h3>
          <span
            className={`student-pending-status${error ? " error" : ""}${
              loading ? " loading" : ""
            }`}
          >
            {statusText}
          </span>
        </div>
        <div className="student-pending-chart">
          <div className="student-pending-chart-scroll">
            <div className="student-pending-chart-bars">
              {buckets.map((bucket) => {
                const heightRatio =
                  bucket.students.length / Math.max(maxBucketSize, 1);
                const heightPercent = Math.max(8, heightRatio * 100);
                const isActive = bucket.pendingCount === activeBucket;
                return (
                  <button
                    key={bucket.pendingCount}
                    type="button"
                    className={`student-pending-bar-button${
                      isActive ? " active" : ""
                    }`}
                    onClick={() => {
                      setActiveBucket(bucket.pendingCount);
                      setExpandedStudents([]);
                    }}
                    title={`未完成 ${bucket.pendingCount} 个：${bucket.students.length} 名学生`}
                  >
                    <span className="student-pending-bar-count">
                      {bucket.students.length}
                    </span>
                    <span
                      className="student-pending-bar"
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="student-pending-bar-label">
                      {bucket.pendingCount}
                    </span>
                  </button>
                );
              })}
              {buckets.length === 0 && (
                <div className="student-pending-empty">暂无数据</div>
              )}
            </div>
          </div>
          {/* <div className="student-pending-chart-axis">未完成作业数 →</div> */}
        </div>
      </section>

      <section className="student-pending-card">
        {/* <div className="student-pending-card-header">
          {/* <h4>
            {selectedBucket
              ? `未完成 ${selectedBucket.pendingCount} 个的学生`
              : "选择柱状图查看学生"}
          </h4> }
          {selectedBucket && (
            <span className="student-pending-status">
              {selectedBucket.students.length} 人
            </span>
          )}
        </div> */}
        {selectedBucket ? (
          <div className="student-pending-student-list">
            {selectedBucket.students.map((summary) => {
              const isExpanded = expandedStudents.includes(summary.student.id);
              return (
                <div
                  key={summary.student.id}
                  className="student-pending-student"
                >
                  <button
                    type="button"
                    className={`student-pending-student-toggle${
                      isExpanded ? " expanded" : ""
                    }`}
                    onClick={() => toggleStudent(summary.student.id)}
                  >
                    <span className="student-pending-student-name">
                      {summary.student.name}
                    </span>
                    {/* <span className="student-pending-student-meta">
                      {summary.student.group || "未分组"}
                    </span> */}
                    {/* <span className="student-pending-student-count">
                      {summary.pendingCount} 个未完成
                    </span> */}
                  </button>
                  {isExpanded && (
                    <div className="student-pending-assignment-list">
                      {summary.pendingAssignments.map((item) => {
                        // const deadline = new Date(item.assignment.deadline);
                        return (
                          <div
                            key={item.assignment.id}
                            className="student-pending-assignment"
                          >
                            <AssignmentTitle assignment={item.assignment} />
                            {/* <div className="student-pending-assignment-meta">
                              <span>未提交</span>
                              <span>截止 {formatInputDate(deadline)}</span>
                            </div> */}
                          </div>
                        );
                      })}
                      {summary.pendingAssignments.length === 0 && (
                        <div className="student-pending-empty">
                          暂无未完成作业
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="student-pending-empty">暂无学生数据</div>
        )}
      </section>
    </div>
  );
};
