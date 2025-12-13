import { Component } from "@renderer/page/CompPage";
import { FC, useId } from "react";

import "./Base.css";
import {
  CompBaseConfig,
  ComponentBaseConfig,
  componentBaseDefaults,
  ComponentConfigHelper,
  componentStyle,
  useComponentConfigState,
} from "./Base";
import { Markdown } from "@renderer/component/Markdown";

export type ComponentNoticeConfig = ComponentBaseConfig & {
  text: string;
};

const defaultValue: ComponentNoticeConfig = {
  ...componentBaseDefaults,
  text: "Some text\n\n# Heading\n\n**Bold** and *italic*\n\n[[[#ff0000\nRed text block\n]]]",
};

export const CompNoticeConfig: FC<{
  config: ComponentNoticeConfig;
  setConfig: (config: any) => void;
}> = ({ config, setConfig }) => {
  const { stateConfig, setStateConfig } =
    useComponentConfigState<ComponentNoticeConfig>(
      defaultValue,
      config,
      setConfig as (config: ComponentNoticeConfig) => void,
    );
  const textInputId = useId();
  const helper = new ComponentConfigHelper(stateConfig, setStateConfig);

  return (
    <>
      <CompBaseConfig config={stateConfig} setConfig={setStateConfig} />
      <div className="comp-config-group">
        <h3>通知</h3>
        {helper.input("text", "文本", {
          id: textInputId,
          textarea: true,
          textareaProps: {
            style: { display: "block", width: "100%", height: "300px" },
          },
        })}
      </div>
    </>
  );
};

const CompNotice: FC<{
  config: ComponentNoticeConfig;
  openConfigWindow: (() => void) | null;
}> = ({ config: conf, openConfigWindow }) => {
  const config = { ...defaultValue, ...conf };

  return (
    <>
      <div className="comp" style={componentStyle(config)}>
        <Markdown text={config.text} />
      </div>
      {openConfigWindow && (
        <button className="config-button primary" onClick={openConfigWindow}>
          配置
        </button>
      )}
    </>
  );
};

export const compNotice: Component<ComponentNoticeConfig> = {
  type: "notice",
  body: (config, openConfigWindow) => (
    <CompNotice config={config} openConfigWindow={openConfigWindow} />
  ),
  config: (config, setConfig) => (
    <CompNoticeConfig config={config} setConfig={setConfig} />
  ),
};
