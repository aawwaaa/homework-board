import { SwipeAdjustInput } from "@renderer/component/SwipeAdjustInput";
import { Component } from "@renderer/page/CompPage";
import {
  ChangeEvent,
  FC,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";

import "./Base.css";
import WindowAdjust from "@renderer/component/WindowAdjust";

export type ComponentBaseConfig = {
  scale: number;
  fontSize: string;

  x: number;
  y: number;
  width: number;
  height: number;
};

export const componentBaseDefaults: ComponentBaseConfig = {
  scale: 1,
  fontSize: "1rem",

  x: 100,
  y: 100,
  width: 100,
  height: 100
};

type ConfigStateSetter<T> = (config: T) => void;
type NumberKeys<T> = {
  [K in keyof T]: T[K] extends number ? K : never;
}[keyof T];
type StringKeys<T> = {
  [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

type SwipeInputOptions = {
  id?: string;
  swipePxPerStep?: number;
};

type TextInputOptions = {
  id?: string;
  textarea?: boolean;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  textareaProps?: TextareaHTMLAttributes<HTMLTextAreaElement>;
};

export const useComponentConfigState = <T extends Record<string, unknown>>(
  defaults: T,
  config: T,
  setConfig: (config: T) => void,
) => {
  const [stateConfig, _setStateConfig] = useState<T>(() => ({
    ...defaults,
    ...config,
  }));

  const setStateConfig = useCallback(
    (next: T) => {
      setConfig(next);
      _setStateConfig(next);
    },
    [setConfig],
  );

  useEffect(() => {
    const applied = { ...defaults, ...config };
    if (JSON.stringify(applied) !== JSON.stringify(config)) {
      setStateConfig(applied);
    } else {
      _setStateConfig(applied);
    }
  }, [config, defaults, setStateConfig]);

  return { stateConfig, setStateConfig };
};

export class ComponentConfigHelper<T extends Record<string, unknown>> {
  constructor(
    private stateConfig: T,
    private setStateConfig: ConfigStateSetter<T>,
  ) {}

  private commit<K extends keyof T>(key: K, value: T[K]) {
    this.stateConfig = { ...this.stateConfig, [key]: value };
    this.setStateConfig(this.stateConfig);
  }

  swipeInput<K extends NumberKeys<T>>(
    key: K,
    name: string,
    step: number,
    unit: string = "",
    options?: SwipeInputOptions,
  ) {
    const id = options?.id ?? String(key);
    const swipePxPerStep = options?.swipePxPerStep ?? 38;

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const nextValue = Number(e.target.value) as T[K];
      this.commit(key, nextValue);
    };

    return (
      <div className="comp-config-item">
        <label htmlFor={id}>{name}</label>
        <SwipeAdjustInput
          id={id}
          type="number"
          value={this.stateConfig[key] as number}
          onChange={handleChange}
          swipePxPerStep={swipePxPerStep}
          onSwipeAdjust={(steps) => {
            const current = this.stateConfig[key] as number;
            this.commit(key, (current + steps * step) as T[K]);
          }}
        />
        {unit && <span>{unit}</span>}
      </div>
    );
  }

  input<K extends StringKeys<T>>(
    key: K,
    name: string,
    options?: TextInputOptions,
  ) {
    const id = options?.id ?? String(key);
    const handleChange = (
      e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      this.commit(key, e.target.value as T[K]);
    };

    const sharedProps = {
      id,
      value: this.stateConfig[key] as string,
      onChange: handleChange,
    };

    return (
      <div
        className={
          "comp-config-item" + (options?.textarea ? " textarea-included" : "")
        }
      >
        <label htmlFor={id}>{name}</label>
        {options?.textarea ? (
          <textarea {...sharedProps} {...options.textareaProps} />
        ) : (
          <input type="text" {...sharedProps} {...options?.inputProps} />
        )}
      </div>
    );
  }
}

export const componentStyle = (config: ComponentBaseConfig) => {
  return {
    transformOrigin: "left top",
    transform: `scale(${config.scale})`,
    "--base-font-size": config.fontSize,
    "--base-height": "calc(var(--base-font-size) * 2)",
    "--small-font-size": `calc(var(--base-font-size) * 0.9)`,
    "--h1-font-size": `calc(var(--base-font-size) * 2)`,
    "--h2-font-size": `calc(var(--base-font-size) * 1.6)`,
    "--h3-font-size": `calc(var(--base-font-size) * 1.2)`,
    width: `${100 / config.scale}%`,
    height: `${100 / config.scale}%`,
  };
};

export const CompBaseConfig: FC<{
  config: ComponentBaseConfig;
  setConfig: (config: any) => void;
}> = ({ config, setConfig }) => {
  const { stateConfig, setStateConfig } = useComponentConfigState(
    componentBaseDefaults,
    config,
    setConfig,
  );
  const scaleInputId = useId();
  const fontSizeInputId = useId();
  const helper = new ComponentConfigHelper(stateConfig, setStateConfig);

  return (
    <div className="comp-config-group">
      <h3>基础</h3>
      <WindowAdjust value={stateConfig} set={({x, y, width, height}) => {
        setStateConfig({ ...stateConfig, x, y, width, height })
      }} />
      {helper.swipeInput("scale", "缩放", 0.2, "", { id: scaleInputId })}
      {helper.input("fontSize", "字体大小", { id: fontSizeInputId })}
    </div>
  );
};

const CompBase: FC<{
  config: ComponentBaseConfig;
  openConfigWindow: (() => void) | null;
}> = ({ config: conf, openConfigWindow }) => {
  const config = { ...componentBaseDefaults, ...conf };
  const containerClassName =
    openConfigWindow == null ? "comp-base" : "comp-base comp-base--with-action";
  return (
    <div className={containerClassName}>
      <div className="comp-base-preview">
        <div className="comp-base-content" style={componentStyle(config)}>
          <p>Hello world!</p>
          <p className="comp-base-scale-note">
            Scale preview: {config.scale.toFixed(2)}
          </p>
        </div>
      </div>
      {openConfigWindow && (
        <button className="config-button primary" onClick={openConfigWindow}>
          配置
        </button>
      )}
    </div>
  );
};

export const compBase: Component<ComponentBaseConfig> = {
  type: "base",
  body: (config, openConfigWindow) => (
    <CompBase config={config} openConfigWindow={openConfigWindow} />
  ),
  config: (config, setConfig) => (
    <CompBaseConfig config={config} setConfig={setConfig} />
  ),
};
