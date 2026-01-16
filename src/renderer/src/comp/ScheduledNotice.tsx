import { Component } from "@renderer/page/CompPage";
import { FC, useEffect, useId, useMemo, useState } from "react";

import "./Base.css";
import {
  CompBaseConfig,
  ComponentConfigHelper,
  componentStyle,
  useComponentConfigState,
} from "./Base";
import { Markdown } from "@renderer/component/Markdown";
import { ComponentNoticeConfig, defaultNoticeValue } from "./Notice";

export type ComponentScheduledNoticeConfig = ComponentNoticeConfig & {
  begin: string; // "hh:mm"
  end: string; // "hh:mm"
  debugShow: boolean;
};

const defaultValue: ComponentScheduledNoticeConfig = {
  ...defaultNoticeValue,
  begin: "00:00",
  end: "23:59",
  debugShow: false,
};

const parseTimeToMinutes = (value: string) => {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
};

const isWithinRange = (nowMinutes: number, begin: string, end: string) => {
  const beginMinutes = parseTimeToMinutes(begin);
  const endMinutes = parseTimeToMinutes(end);
  if (beginMinutes == null || endMinutes == null) return true;
  if (beginMinutes <= endMinutes) {
    return nowMinutes >= beginMinutes && nowMinutes <= endMinutes;
  }
  return nowMinutes >= beginMinutes || nowMinutes <= endMinutes;
};

export const CompScheduledNoticeConfig: FC<{
  config: ComponentScheduledNoticeConfig;
  setConfig: (config: any) => void;
}> = ({ config, setConfig }) => {
  const { stateConfig, setStateConfig } =
    useComponentConfigState<ComponentScheduledNoticeConfig>(
      defaultValue,
      config,
      setConfig as (config: ComponentScheduledNoticeConfig) => void,
    );
  const textInputId = useId();
  const beginInputId = useId();
  const endInputId = useId();
  const debugShowInputId = useId();
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
        {helper.input("backgroundColor", "背景色", {
          inputProps: { placeholder: "留空为默认" },
        })}
      </div>
      <div className="comp-config-group">
        <h3>显示时间</h3>
        {helper.input("begin", "开始", {
          id: beginInputId,
          inputProps: { type: "time" },
        })}
        {helper.input("end", "结束", {
          id: endInputId,
          inputProps: { type: "time" },
        })}
        <div className="comp-config-item">
          <label htmlFor={debugShowInputId}>调试显示</label>
          <input
            id={debugShowInputId}
            type="checkbox"
            checked={stateConfig.debugShow}
            onChange={(event) => {
              setStateConfig({
                ...stateConfig,
                debugShow: event.target.checked,
              });
            }}
          />
        </div>
      </div>
    </>
  );
};

const CompScheduledNotice: FC<{
  config: ComponentScheduledNoticeConfig;
  openConfigWindow: (() => void) | null;
}> = ({ config: conf, openConfigWindow }) => {
  const config = useMemo(() => ({ ...defaultValue, ...conf }), [conf]);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(Date.now());
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const nowMinutes = useMemo(() => {
    const now = new Date(nowTick);
    return now.getHours() * 60 + now.getMinutes();
  }, [nowTick]);

  if (!config.debugShow && !isWithinRange(nowMinutes, config.begin, config.end)) {
    if (!openConfigWindow) return null;
    return (
      <button className="config-button primary" onClick={openConfigWindow}>
        配置
      </button>
    );
  }

  const style = {
    ...componentStyle(config),
    ...(config.backgroundColor ? { backgroundColor: config.backgroundColor } : {}),
    textAlign: "center" as const,
  };

  return (
    <>
      <div className="comp" style={style}>
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

export const compScheduledNotice: Component<ComponentScheduledNoticeConfig> = {
  type: "scheduled-notice",
  body: (config, openConfigWindow) => (
    <CompScheduledNotice config={config} openConfigWindow={openConfigWindow} />
  ),
  config: (config, setConfig) => (
    <CompScheduledNoticeConfig config={config} setConfig={setConfig} />
  ),
};
