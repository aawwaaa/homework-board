import { AssignmentEdit } from "@renderer/component/AssignmentEdit";
import { UserPageProps } from "@renderer/page/UserPage";
import { randomId } from "@renderer/util";
import { useState } from "react";

export const CreateAssignment: React.FC<{
  subject: Subject;
  props: UserPageProps;
}> = ({ subject, props }) => {
  const [assignment, setAssignment] = useState<Assignment>({
    id: randomId(),
    estimated: 30,
    spent: 0,
    created: new Date(),
    deadline: new Date(Date.now() + 60 * 60 * 24 * 1000),
    priority: 1,
    title: "",
    description: "",
    subject: subject,
    config: {
      tags: [],
    },
  });

  const handleChange = (
    key: keyof Assignment,
    value: Assignment[keyof Assignment],
  ) => {
    setAssignment((prev) => ({ ...prev, [key]: value }));
  };

  const confirm = () => {
    window.data.assignment.create(
      assignment,
      `[${subject.name}] 布置作业 ${assignment.title}`,
    );
    props.popPage();
  };

  return (
    <div>
      <AssignmentEdit
        value={assignment}
        presets={subject.config.assignmentPresets}
        onChange={handleChange}
      />
      <button onClick={confirm}>添加</button>
    </div>
  );
};
