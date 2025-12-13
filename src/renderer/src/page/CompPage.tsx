import { FC, ReactNode, useEffect, useRef, useState } from "react";
import { ComponentConfig } from "..";

import "./CompPage.css"
import { compBase } from "@renderer/comp/Base";
import { compTimeline } from "@renderer/comp/Timeline";
import { compList } from "@renderer/comp/List";
import { compNotice } from "@renderer/comp/Notice";

export type Component<T = object> = {
    type: string;

    body: (config: T, showConfigWindow: (() => void) | null) => ReactNode; // showConfigWindow means it is in edit mode
    config: (config: T, setConfig: (config: unknown) => void) => ReactNode;
}

export const components: Component<any>[] = [
    compBase,
    compTimeline,
    compList,
    compNotice
];

export const CompPage: FC<{left: string}> = ({left}) => {
    const [id, mode] = left.substring(1).split("/").concat([""]);
    const [config, setConfig] = useState<ComponentConfig | null>(null);
    const ignoreUpdate = useRef<boolean>(false);

    useEffect(() => {
        return window.data.onChanged(async () => {
            if (ignoreUpdate.current) return;
            const config = await window.data.component.get(id);
            setConfig(config);
        })
    }, [id])

    const type = config?.type;
    const comp = components.find(c => c.type === type);

    const setConfigCallback = async (cfg: unknown) => {
        ignoreUpdate.current = true;
        config!.config = cfg
        await window.data.component.update(config!);
        ignoreUpdate.current = false;
    }

    const showConfigWindow = mode === "edit"? () => {
        window.api.showConfigWindow(id);
    }: null

    return config == null?
        <div>加载组件 {id} 中...</div>:
        comp == null?
        <div>组件 {id}: {type} 不存在</div>:
        mode === "config"?
        <div style={{overflowY: "auto", height: "100vh"}}>{comp.config(config.config!, setConfigCallback)}</div>:
        comp.body(config.config!, showConfigWindow)
}
