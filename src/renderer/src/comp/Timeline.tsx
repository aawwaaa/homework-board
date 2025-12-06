import { SwipeAdjustInput } from "@renderer/component/SwipeAdjustInput";
import { Component } from "@renderer/page/CompPage";
import { FC, useEffect, useState } from "react";

import "./Base.css"
import { CompBaseConfig, ComponentBaseConfig } from "./Base";
import { TimelineView } from "@renderer/view/timeline/TimelineView";

export type ComponentTimelineConfig = ComponentBaseConfig & {
    originOffset: number // days
    unitWidth: number
}

const defaultValue: ComponentTimelineConfig = {
    scale: 1,
    fontSize: "1rem",
    originOffset: -1,
    unitWidth: 200
}

export const CompTimelineConfig: FC<{config: ComponentTimelineConfig, setConfig: (config: unknown) => void}> = ({config, setConfig}) => {
    const [originOffset, setOriginOffset] = useState(config.originOffset);
    const [unitWidth, setUnitWidth] = useState(config.unitWidth);

    useEffect(() => {
        const applied = {...defaultValue, ...config};
        if (JSON.stringify(applied) !== JSON.stringify(config)) {
            setConfig(applied);
            setOriginOffset(applied.originOffset);
            setUnitWidth(applied.unitWidth);
        }
    }, [config])

    const update = (key: keyof ComponentTimelineConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
        config[key] = (typeof config[key] == "number"? Number(e.target.value): e.target.value) as never;
        setConfig(config);
        ({
            originOffset: setOriginOffset,
            unitWidth: setUnitWidth
        }[key])?.(config[key]);
    }

    return <>
        <CompBaseConfig config={config} setConfig={setConfig}/>
        <div className="comp-config-group">
            <h3>时间轴</h3>
            <div className="comp-config-item">
                <label htmlFor="originOffset">原点偏移</label>
                <SwipeAdjustInput id="originOffset" type="number" value={originOffset} onChange={update("originOffset")}
                    swipePxPerStep={38} onSwipeAdjust={steps => {
                        config.originOffset += steps * 0.2;
                        setOriginOffset(config.originOffset);
                        setConfig(config);
                    }}/>
                <span>天</span>
            </div>
            <div className="comp-config-item">
                <label htmlFor="unitWidth">单位宽度</label>
                <SwipeAdjustInput id="unitWidth" type="number" value={unitWidth} onChange={update("unitWidth")}
                    swipePxPerStep={38} onSwipeAdjust={steps => {
                        config.unitWidth += steps * 50;
                        setUnitWidth(config.unitWidth);
                        setConfig(config);
                    }}/>
                <span>px</span>
            </div>
        </div>
    </>
}

const CompTimeline: FC<{config: ComponentTimelineConfig, openConfigWindow: (() => void) | null}> = ({config: conf, openConfigWindow}) => {
    const config = {...defaultValue, ...conf};

    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return <>
        <div className="comp" style={{
            fontSize: config.fontSize,
            width: "100vw",
            height: "100vh"
        }}>
            <TimelineView
                // key={config.originOffset + " " + now.getTime()}
                origin={new Date(now.getTime() + config.originOffset * 24 * 60 * 60 * 1000)}
                unitWidth={config.unitWidth}
                touchable={false}
                scale={config.scale}
            />
        </div>
        {openConfigWindow && <button className="config-button primary" onClick={openConfigWindow}>配置</button>}
    </>
}

export const compTimeline: Component<ComponentTimelineConfig> = {
    type: "timeline",
    body: (config, openConfigWindow) => <CompTimeline config={config} openConfigWindow={openConfigWindow}/>,
    config: (config, setConfig) => <CompTimelineConfig config={config} setConfig={setConfig}/>,
}