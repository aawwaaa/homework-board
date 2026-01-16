import { FC, ReactNode, useEffect, useRef, useState } from "react";
import { ComponentConfig } from "..";

import "./CompPage.css";
import { compBase } from "@renderer/comp/Base";
import { compTimeline } from "@renderer/comp/Timeline";
import { compList } from "@renderer/comp/List";
import { compNotice } from "@renderer/comp/Notice";
import { compScheduledNotice } from "@renderer/comp/ScheduledNotice";
import { compMemorize } from "@renderer/comp/Memorize";

export type Component<T = object> = {
  type: string;

  body: (config: T, showConfigWindow: (() => void) | null) => ReactNode; // showConfigWindow means it is in edit mode
  config: (config: T, setConfig: (config: unknown) => void) => ReactNode;
};

export const components: Component<any>[] = [
  compBase,
  compTimeline,
  compList,
  compNotice,
  compScheduledNotice,
  compMemorize,
];

export const CompPage: FC<{ left: string }> = ({ left }) => {
  const [id, mode] = left.substring(1).split("/").concat([""]);
  const [config, setConfig] = useState<ComponentConfig | null>(null);
  const ignoreUpdate = useRef<boolean>(false);

  useEffect(() => {
    return window.data.onChanged(async () => {
      if (ignoreUpdate.current) return;
      const config = await window.data.component.get(id);
      setConfig(config);
    });
  }, [id]);

  const type = config?.type;
  const comp = components.find((c) => c.type === type);

  const setConfigCallback = async (cfg: unknown) => {
    ignoreUpdate.current = true;
    config!.config = cfg;
    config!.x = (cfg as any).x;
    config!.y = (cfg as any).y;
    config!.width = (cfg as any).width;
    config!.height = (cfg as any).height;
    await window.data.component.update(config!);
    ignoreUpdate.current = false;
  };

  const showConfigWindow =
    mode === "edit"
      ? () => {
          window.api.showConfigWindow(id);
        }
      : null;
  
  const exposedConfig = config? {
    ...config.config!,
    x: config.x,
    y: config.y,
    width: config.width,
    height: config.height
  }: null

  useEffect(() => {
    if (mode === "edit")
      document.body.style.background = "#888"
    else
      document.body.style.background = "transparent"
  }, [mode]);

  return config == null ? (
    <div>加载组件 {id} 中...</div>
  ) : comp == null ? (
    <div>
      组件 {id}: {type} 不存在
    </div>
  ) : mode === "config" ? (
    <div style={{ overflowY: "auto", height: "100vh" }}>
      {comp.config(exposedConfig, setConfigCallback)}
    </div>
  ) : (
    comp.body(config.config!, showConfigWindow)
  );
};
