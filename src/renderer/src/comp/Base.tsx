import { SwipeAdjustInput } from "@renderer/component/SwipeAdjustInput";
import { Component } from "@renderer/page/CompPage";
import { FC, useEffect, useId, useState } from "react";

import "./Base.css"

export type ComponentBaseConfig = {
    scale: number;
    fontSize: string;
}

const defaultValue: ComponentBaseConfig = {
    scale: 1,
    fontSize: "1rem"
}

export const CompBaseConfig: FC<{config: ComponentBaseConfig, setConfig: (config: ComponentBaseConfig) => void}> = ({config, setConfig}) => {
    useEffect(() => {
        const applied = {...defaultValue, ...config};
        if (JSON.stringify(applied) !== JSON.stringify(config)) {
            setConfig(applied);
            setScale(applied.scale);
            setFontSize(applied.fontSize);
        }
    }, [config])

    const update = (key: keyof ComponentBaseConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
        config[key] = (typeof config[key] == "number"? Number(e.target.value): e.target.value) as never;
        setConfig(config);
        if (key === "scale") {
            setScale(config.scale);
        } else if (key === "fontSize") {
            setFontSize(config.fontSize);
        }
    }

    const [scale, setScale] = useState(config.scale);
    const [fontSize, setFontSize] = useState(config.fontSize);
    const scaleInputId = useId();
    const fontSizeInputId = useId();

    return <div className="comp-config-group">
        <h3>基础</h3>
        <div className="comp-config-item">
            <label htmlFor={scaleInputId}>缩放</label>
            <SwipeAdjustInput id={scaleInputId} type="number" value={scale} onChange={update("scale")}
                swipePxPerStep={38} onSwipeAdjust={steps => {
                    config.scale += steps * 0.2;
                    setScale(config.scale);
                    setConfig(config);
                }}/>
        </div>
        <div className="comp-config-item">
            <label htmlFor={fontSizeInputId}>字体大小</label>
            <input type="text" id={fontSizeInputId} value={fontSize} onChange={update("fontSize")}/>
        </div>
    </div>
}

const CompBase: FC<{config: ComponentBaseConfig, openConfigWindow: (() => void) | null}> = ({config: conf, openConfigWindow}) => {
    const config = {...defaultValue, ...conf};
    const containerClassName = openConfigWindow == null? "comp-base": "comp-base comp-base--with-action";
    return <div className={containerClassName}>
        <div className="comp-base-preview">
            <div className="comp-base-content" style={{transform: `scale(${config.scale})`, fontSize: config.fontSize}}>
                <p>Hello world!</p>
                <p className="comp-base-scale-note">Scale preview: {config.scale.toFixed(2)}</p>
            </div>
        </div>
        {openConfigWindow && <button className="config-button primary" onClick={openConfigWindow}>配置</button>}
    </div>
}

export const compBase: Component<ComponentBaseConfig> = {
    type: "base",
    body: (config, openConfigWindow) => <CompBase config={config} openConfigWindow={openConfigWindow}/>,
    config: (config, setConfig) => <CompBaseConfig config={config} setConfig={setConfig}/>,
}
