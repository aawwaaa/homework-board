import { Component } from "@renderer/page/CompPage";
import { FC, useEffect, useState } from "react";

import "./Base.css"
import { CompBaseConfig, ComponentBaseConfig, componentBaseDefaults, ComponentConfigHelper, componentStyle, useComponentConfigState } from "./Base";
import { ListView } from "@renderer/view/list/ListView";

export type ComponentListConfig = ComponentBaseConfig & {
    submittedDuration: number // hours
    submittingDuration: number // hours
    forward: number // days
}

const defaultValue: ComponentListConfig = {
    ...componentBaseDefaults,
    submittedDuration: 4,
    submittingDuration: 6,
    forward: 7
}

export const CompListConfig: FC<{config: ComponentListConfig, setConfig: (config: any) => void}> = ({config, setConfig}) => {
    const {stateConfig, setStateConfig} = useComponentConfigState<ComponentListConfig>(
        defaultValue,
        config,
        setConfig as (config: ComponentListConfig) => void
    );
    const helper = new ComponentConfigHelper(stateConfig, setStateConfig);

    return <>
        <CompBaseConfig config={stateConfig} setConfig={setStateConfig}/>
        <div className="comp-config-group">
            <h3>列表</h3>
            {helper.swipeInput(
                "submittedDuration",
                "已提交区间",
                1,
                "小时"
            )}
            {helper.swipeInput(
                "submittingDuration",
                "提交中区间",
                1,
                "小时"
            )}
            {helper.swipeInput(
                "forward",
                "前向",
                1,
                "天"
            )}
        </div>
    </>
}

const CompList: FC<{config: ComponentListConfig, openConfigWindow: (() => void) | null}> = ({config: conf, openConfigWindow}) => {
    const config = {...defaultValue, ...conf};

    const [origin, setOrigin] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => {
            setOrigin(new Date());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    return <>
        <div className="comp" style={componentStyle(config)}>
            <ListView
                origin={origin}
                submittedDuration={config.submittedDuration}
                submittingDuration={config.submittingDuration}
                forward={config.forward}
            />
        </div>
        {openConfigWindow && <button className="config-button primary" onClick={openConfigWindow}>配置</button>}
    </>
}

export const compList: Component<ComponentListConfig> = {
    type: "list",
    body: (config, openConfigWindow) => <CompList config={config} openConfigWindow={openConfigWindow}/>,
    config: (config, setConfig) => <CompListConfig config={config} setConfig={setConfig}/>,
}
