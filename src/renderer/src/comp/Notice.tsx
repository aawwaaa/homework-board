import { Component } from "@renderer/page/CompPage";
import { FC, useEffect, useMemo, useState } from "react";

import "./Base.css"
import { CompBaseConfig, ComponentBaseConfig } from "./Base";

export type ComponentNoticeConfig = ComponentBaseConfig & {
    text: string;
}

const defaultValue: ComponentNoticeConfig = {
    scale: 1,
    fontSize: "1rem",
    text: "Some text\n# BOLD\n* ITALIC\n[red] RED"
}

export const CompNoticeConfig: FC<{config: ComponentNoticeConfig, setConfig: (config: unknown) => void}> = ({config, setConfig}) => {
    const [text, setText] = useState(config.text);

    useEffect(() => {
        const applied = {...defaultValue, ...config};
        if (JSON.stringify(applied) !== JSON.stringify(config)) {
            setConfig(applied);
            setText(applied.text);
        }
    }, [config])

    const update = (key: keyof ComponentNoticeConfig) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        config[key] = (typeof config[key] == "number"? Number(e.target.value): e.target.value) as never;
        setConfig(config);
        setText(config.text);
    }

    return <>
        <CompBaseConfig config={config} setConfig={setConfig}/>
        <div className="comp-config-group">
            <h3>通知</h3>
            <div className="comp-config-item">
                <label htmlFor="text">文本</label>
                <textarea id="text" value={text} onChange={update("text")} style={{display: "block", width: "100%", height: "300px"}}>
                </textarea>
            </div>
        </div>
    </>
}

const CompNotice: FC<{config: ComponentNoticeConfig, openConfigWindow: (() => void) | null}> = ({config: conf, openConfigWindow}) => {
    const config = {...defaultValue, ...conf};

    const rendered = useMemo(() => {
        const output: React.ReactNode[] = [];
        const lines = config.text.split("\n");
        for (const line of lines) {
            if (line.startsWith("#")) {
                output.push(<span style={{fontWeight: "bolder"}}>{line.slice(1)}<br/></span>);
            } else if (line.startsWith("*")) {
                output.push(<span style={{fontStyle: "italic"}}>{line.slice(1)}<br/></span>);
            } else if (line.startsWith("[")) {
                const color = line.slice(1, line.indexOf("]"));
                output.push(<span style={{color}}>{line.slice(line.indexOf("]") + 1)}<br/></span>);
            } else if (line.startsWith("!")) {
                output.push(<span style={{fontSize: `calc(${config.fontSize} * 2)`, fontWeight: "bolder"}}>{line.slice(1)}<br/></span>);
            } else if (line.startsWith(">")) {
                output.push(<span dangerouslySetInnerHTML={{__html: line.slice(1)}}><br/></span>);
            }else {
                output.push(<span>{line}<br/></span>);
            }
        }
        return output;
    }, [config.text]);

    return <>
        <div className="comp" style={{
            transformOrigin: "left top",
            transform: `scale(${config.scale})`,
            fontSize: config.fontSize,
            width: "100vw",
            height: "100vh"
        }}>
            {rendered}
        </div>
        {openConfigWindow && <button className="config-button primary" onClick={openConfigWindow}>配置</button>}
    </>
}

export const compNotice: Component<ComponentNoticeConfig> = {
    type: "notice",
    body: (config, openConfigWindow) => <CompNotice config={config} openConfigWindow={openConfigWindow}/>,
    config: (config, setConfig) => <CompNoticeConfig config={config} setConfig={setConfig}/>,
}