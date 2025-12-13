import { Tab } from "@renderer/component/Tab";
import { UserPageProps } from "@renderer/page/UserPage";
import { useState } from "react";
import { ActualAllocationPage } from "./ActualAllocation";
import { AllocationPage } from "./Allocation";
import { OverviewPage } from "./Overview";
import { SubmissionTimelinePage } from "./SubmissionTimeline";

const pages = {
    "总览": () => <OverviewPage />,
    "估计": () => <AllocationPage />,
    "实际": () => <ActualAllocationPage />,
    "提交时间线": () => <SubmissionTimelinePage />,
}

export const DataPage: React.FC<{ props: UserPageProps }> = ({props}) => {
    const [page, setPage] = useState<string>(Object.keys(pages)[0]);

    return <div>
        <div className="title">
            <Tab
                tabs={Object.keys(pages).map(key => [key, key])}
                set={(id: string) => setPage(id)}
                initial={page}
            />
        </div>
        <div style={{ padding: "0.1rem" }}>
            {pages[page](props)}
        </div>
    </div>;
}
