import { useEffect, useState } from "react";
import { SwipeAdjustInput } from "./SwipeAdjustInput";

import "./SubmissionCreate.css";

export const SubmissionCreate: React.FC<{
  student: Student | null;
  submit: (spent: number, feedback: string) => void;
}> = ({ student, submit }) => {
  const [spent, setSpent] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("");

  useEffect(() => {
    setSpent(0);
    setFeedback("");
  }, [student]);

  return (
    <div className="submission-create">
      <div className="spent">
        <h5>用时</h5>
        <SwipeAdjustInput
          type="number"
          value={spent}
          onChange={(e) => setSpent(Number(e.target.value))}
          onSwipeAdjust={(steps) => setSpent(Math.max(0, spent + steps * 5))}
          swipePxPerStep={34}
        />
        分钟
      </div>
      <div>
        <h5>反馈</h5>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        ></textarea>
      </div>
      <button
        disabled={student == null}
        onClick={() => submit(spent, feedback)}
      >
        提交
      </button>
    </div>
  );
};
