import { Tab } from "@renderer/component/Tab";
import { UserPageProps } from "@renderer/page/UserPage";
import { useState } from "react";
import { AllocationPage } from "./Allocation";

const pages = {
    "占比": () => <AllocationPage />,
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
