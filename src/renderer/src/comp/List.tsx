import { SwipeAdjustInput } from "@renderer/component/SwipeAdjustInput";
import { Component } from "@renderer/page/CompPage";
import { FC, useEffect, useState } from "react";

import "./Base.css"
import { CompBaseConfig, ComponentBaseConfig } from "./Base";
import { ListView } from "@renderer/view/list/ListView";

export type ComponentListConfig = ComponentBaseConfig & {
    submittedDuration: number // hours
    submittingDuration: number // hours
    forward: number // days
}

const defaultValue: ComponentListConfig = {
    scale: 1,
    fontSize: "1rem",
    submittedDuration: 4,
    submittingDuration: 6,
    forward: 7
}

export const CompListConfig: FC<{config: ComponentListConfig, setConfig: (config: unknown) => void}> = ({config, setConfig}) => {
    const [submittedDuration, setSubmittedDuration] = useState(config.submittedDuration);
    const [submittingDuration, setSubmittingDuration] = useState(config.submittingDuration);
    const [forward, setForward] = useState(config.forward);

    useEffect(() => {
        const applied = {...defaultValue, ...config};
        if (JSON.stringify(applied) !== JSON.stringify(config)) {
            setConfig(applied);
            setSubmittedDuration(applied.submittedDuration);
            setSubmittingDuration(applied.submittingDuration);
            setForward(applied.forward);
        }
    }, [config])

    const update = (key: keyof ComponentListConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
        config[key] = (typeof config[key] == "number"? Number(e.target.value): e.target.value) as never;
        setConfig(config);
        ({
            submittedDuration: setSubmittedDuration,
            submittingDuration: setSubmittingDuration,
            forward: setForward
        }[key])?.(config[key]);
    }

    return <>
        <CompBaseConfig config={config} setConfig={setConfig}/>
        <div className="comp-config-group">
            <h3>列表</h3>
            <div className="comp-config-item">
                <label htmlFor="submittedDuration">已提交区间</label>
                <SwipeAdjustInput id="submittedDuration" type="number" value={submittedDuration} onChange={update("submittedDuration")}
                    swipePxPerStep={38} onSwipeAdjust={steps => {
                        config.submittedDuration += steps * 1;
                        setSubmittedDuration(config.submittedDuration);
                        setConfig(config);
                    }}/>
                <span>小时</span>
            </div>
            <div className="comp-config-item">
                <label htmlFor="submittingDuration">提交中区间</label>
                <SwipeAdjustInput id="submittingDuration" type="number" value={submittingDuration} onChange={update("submittingDuration")}
                    swipePxPerStep={38} onSwipeAdjust={steps => {
                        config.submittingDuration += steps * 1;
                        setSubmittingDuration(config.submittingDuration);
                        setConfig(config);
                    }}/>
                <span>小时</span>
            </div>
            <div className="comp-config-item">
                <label htmlFor="forward">前向</label>
                <SwipeAdjustInput id="forward" type="number" value={forward} onChange={update("forward")}
                    swipePxPerStep={38} onSwipeAdjust={steps => {
                        config.forward += steps * 1;
                        setForward(config.forward);
                        setConfig(config);
                    }}/>
                <span>天</span>
            </div>
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
        <div className="comp" style={{
            transformOrigin: "left top",
            transform: `scale(${config.scale})`,
            fontSize: config.fontSize,
            width: "100vw",
            height: "100vh"
        }}>
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