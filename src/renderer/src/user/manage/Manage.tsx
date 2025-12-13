import { Tab } from "@renderer/component/Tab";
import { UserPageProps } from "@renderer/page/UserPage";
import { useState } from "react";
import { ManageConfigPage } from "./Config";
import { ManageSubjectPage } from "./Subject";
import { ManageDatabasePage } from "./Database";
import { ManageIdentityPage } from "./Identity";
import { ManageStudentPage } from "./Student";
import { ManageOperationPage } from "./Operation";
import { ManageTagPage } from "./Tag";

const pages = {
  科目: (props: UserPageProps) => <ManageSubjectPage props={props} />,
  标签: (props: UserPageProps) => <ManageTagPage props={props} />,
  学生: () => <ManageStudentPage />,
  身份: (props: UserPageProps) => <ManageIdentityPage props={props} />,
  配置: () => <ManageConfigPage />,
  操作日志: () => <ManageOperationPage />,
  数据库: () => <ManageDatabasePage />,
};

export const ManagePage: React.FC<{ props: UserPageProps }> = ({ props }) => {
  const [page, setPage] = useState<string>(Object.keys(pages)[0]);

  return (
    <div>
      <div className="title">
        <Tab
          tabs={Object.keys(pages).map((key) => [key, key])}
          set={(id: string) => setPage(id)}
          initial={page}
        />
      </div>
      <div style={{ padding: "0.1rem", overflow: "auto" }}>
        {pages[page](props)}
      </div>
    </div>
  );
};
