import { Component } from "@renderer/page/CompPage";
import { FC, useEffect, useState } from "react";

import "./Base.css";
import {
  CompBaseConfig,
  ComponentBaseConfig,
  componentBaseDefaults,
  ComponentConfigHelper,
  componentStyle,
  useComponentConfigState,
} from "./Base";
import { TimelineView } from "@renderer/view/timeline/TimelineView";

export type ComponentTimelineConfig = ComponentBaseConfig & {
  originOffset: number; // days
  unitWidth: number;
};

const defaultValue: ComponentTimelineConfig = {
  ...componentBaseDefaults,
  originOffset: -1,
  unitWidth: 200,
};

export const CompTimelineConfig: FC<{
  config: ComponentTimelineConfig;
  setConfig: (config: any) => void;
}> = ({ config, setConfig }) => {
  const { stateConfig, setStateConfig } =
    useComponentConfigState<ComponentTimelineConfig>(
      defaultValue,
      config,
      setConfig as (config: ComponentTimelineConfig) => void,
    );
  const helper = new ComponentConfigHelper(stateConfig, setStateConfig);

  return (
    <>
      <CompBaseConfig config={stateConfig} setConfig={setStateConfig} />
      <div className="comp-config-group">
        <h3>时间轴</h3>
        {helper.swipeInput("originOffset", "原点偏移", 0.2, "天")}
        {helper.swipeInput("unitWidth", "单位宽度", 50, "px")}
      </div>
    </>
  );
};

const CompTimeline: FC<{
  config: ComponentTimelineConfig;
  openConfigWindow: (() => void) | null;
}> = ({ config: conf, openConfigWindow }) => {
  const config = { ...defaultValue, ...conf };

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className="comp" style={componentStyle(config)}>
        <TimelineView
          // key={config.originOffset + " " + now.getTime()}
          origin={
            new Date(now.getTime() + config.originOffset * 24 * 60 * 60 * 1000)
          }
          unitWidth={config.unitWidth}
          touchable={false}
          // scale={config.scale}
        />
      </div>
      {openConfigWindow && (
        <button className="config-button primary" onClick={openConfigWindow}>
          配置
        </button>
      )}
    </>
  );
};

export const compTimeline: Component<ComponentTimelineConfig> = {
  type: "timeline",
  body: (config, openConfigWindow) => (
    <CompTimeline config={config} openConfigWindow={openConfigWindow} />
  ),
  config: (config, setConfig) => (
    <CompTimelineConfig config={config} setConfig={setConfig} />
  ),
};
