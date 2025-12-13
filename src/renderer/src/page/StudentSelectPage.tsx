import { StudentList } from "@renderer/component/StudentList";

export const StudentSelectPage: React.FC<{}> = () => {
  return (
    <StudentList
      setSelected={(student) => {
        window.api.showStudentPage(student.id);
        window.close();
      }}
      onConfirm={() => {}}
    />
  );
};
