import { Badge } from "./Badge";

import "./AssignmentTitle.css";
import { useEffect, useState } from "react";

export const AssignmentTitle: React.FC<{
  assignment: Assignment | AssignmentData;
  children?: React.ReactNode;
  classList?: string;
  style?: React.CSSProperties;
}> = ({ assignment, children, classList, style }) => {
  const [tags, setTags] = useState<AssignmentTag[]>([])

  useEffect(() => void (async () => {
    if ("tags" in assignment){
      setTags(assignment.tags)
      return
    }
    const all = await window.data.tag.list();
    setTags(assignment.config.tags.map(v => all.find(a => a.id == v)).filter(Boolean) as AssignmentTag[])
  })(), [assignment])

  return (
    <div className={classList ?? "assignment-title"} style={style}>
      <Badge data={assignment.subject} />
      {tags?.map((tag) => (
        <Badge key={tag.id} data={tag} />
      ))}
      <h5>{assignment.title}</h5>
      {children}
    </div>
  );
};
