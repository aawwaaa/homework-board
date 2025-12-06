import { AssignmentList } from "@renderer/component/AssignmentList";
import { FC } from "react";

export const SignPage: FC = () => {
    return <>
        <AssignmentList onClick={(assignment => {
            window.api.showDetail(assignment.id);
            window.close();
        })} />
    </>;
}