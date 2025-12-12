import { Component } from "@renderer/page/CompPage";
import { FC, useId, useMemo } from "react";

import "./Base.css"
import { CompBaseConfig, ComponentBaseConfig, componentBaseDefaults, ComponentConfigHelper, componentStyle, useComponentConfigState } from "./Base";

export type ComponentNoticeConfig = ComponentBaseConfig & {
    text: string;
}

const defaultValue: ComponentNoticeConfig = {
    ...componentBaseDefaults,
    text: "Some text\n# BOLD\n* ITALIC\n[red] RED"
}

export const CompNoticeConfig: FC<{config: ComponentNoticeConfig, setConfig: (config: any) => void}> = ({config, setConfig}) => {
    const {stateConfig, setStateConfig} = useComponentConfigState<ComponentNoticeConfig>(
        defaultValue,
        config,
        setConfig as (config: ComponentNoticeConfig) => void
    );
    const textInputId = useId();
    const helper = new ComponentConfigHelper(stateConfig, setStateConfig);

    return <>
        <CompBaseConfig config={stateConfig} setConfig={setStateConfig}/>
        <div className="comp-config-group">
            <h3>通知</h3>
            {helper.input(
                "text",
                "文本",
                {
                    id: textInputId,
                    textarea: true,
                    textareaProps: {style: {display: "block", width: "100%", height: "300px"}}
                }
            )}
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
        <div className="comp" style={componentStyle(config)}>
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
