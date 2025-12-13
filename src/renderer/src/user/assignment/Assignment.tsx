import { Tab } from "@renderer/component/Tab";
import { UserPageProps } from "@renderer/page/UserPage";
import { isSubjectAccessible } from "@renderer/util";
import { useEffect, useState } from "react";
import { CreateAssignment } from "./CreateAssignment";

import "./Assignment.css"
import { TimelineView } from "@renderer/view/timeline/TimelineView";
import { standardTimelineItemBuilder } from "@renderer/view/timeline/TimelineItem";
import { AssignmentManage } from "./AssignmentManage";

export const AssignmentPage: React.FC<{ props: UserPageProps }> = ({ props }) => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [subject, setSubject] = useState<Subject | null>(null);

    const tabs: [string, string][] = [];
    if (subjects.length > 1) tabs.push(['$all', '所有'])
    tabs.push(...subjects.map(subject => [subject.id, subject.name]) as [string, string][]);

    useEffect(() => {
        return window.data.onChanged(async () => {
            if (props.identity == null) return;
            setSubjects((await window.data.subject.list())
                .filter(subject => isSubjectAccessible(props.identity, subject)));
            setSubject(subject ?? subjects[0]);
        })
    }, []);

    return <div className="assignment-page">
        <div className="assignment-page__header">
            <Tab
                tabs={tabs}
                set={(id: string) => setSubject(subjects.find(subject => subject.id === id)!)}
                initial={subject?.id}
            />
            <button
                onClick={() => props.updatePage("addHomework", <CreateAssignment key={Math.random()} subject={subject!} props={props} />)}
                disabled={subject == null}
            >
                添加
            </button>
        </div>
        <div className="assignment-page__timeline">
            <TimelineView
                key={subject?.id ?? "all"}
                origin={new Date()}
                filter={(assignment) => subject == null || assignment.subject.id === subject!.id}
                builder={(a, p) => standardTimelineItemBuilder(a, p,
                    () => props.updatePage("homeworkDetail", <AssignmentManage key={Math.random()} assignment={a} props={props} />)
                )}
            />
        </div>
    </div>;
}
