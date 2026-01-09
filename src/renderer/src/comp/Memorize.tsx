import { Component } from "@renderer/page/CompPage";
import {
  CSSProperties,
  DragEvent,
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./Base.css";
import "./Memorize.css";
import {
  CompBaseConfig,
  ComponentBaseConfig,
  componentBaseDefaults,
  ComponentConfigHelper,
  componentStyle,
  useComponentConfigState,
} from "./Base";
import { SwipeAdjustInput } from "@renderer/component/SwipeAdjustInput";

export type ComponentMemorizeConfig = ComponentBaseConfig & {
  interval: number; // minutes
  display: number;
  normalColor: string;
  highlightColor: string;
};

type MemorizeResource = {
  entries: string[];
  shown: boolean[];
  weight: number;
};

type MemorizeState = {
  data: Record<string, MemorizeResource>;
  lasts: [string, number][];
  lastUpdated: number;
};

const defaultValue: ComponentMemorizeConfig = {
  ...componentBaseDefaults,
  interval: 10,
  display: 3,
  normalColor: "#fff",
  highlightColor: "#fa3",
};

const defaultState: MemorizeState = {
  data: {},
  lasts: [],
  lastUpdated: 0,
};

const getCompId = () => window.location.hash.split("/")[2] ?? "";

const parseEntries = (text: string) => {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
};

const normalizeResource = (resource?: Partial<MemorizeResource>) => {
  const entries = Array.isArray(resource?.entries) ? resource!.entries : [];
  const shownRaw = Array.isArray(resource?.shown) ? resource!.shown : [];
  const shown = entries.map((_, index) => Boolean(shownRaw[index]));
  const weight = typeof resource?.weight === "number" ? resource!.weight : 1;
  return { entries, shown, weight } as MemorizeResource;
};

const normalizeState = (state?: MemorizeState) => {
  const rawData = state?.data ?? {};
  const data: Record<string, MemorizeResource> = {};
  Object.entries(rawData).forEach(([name, resource]) => {
    data[name] = normalizeResource(resource ?? {});
  });
  const lasts = (state?.lasts ?? []).filter(([name, index]) => {
    const resource = data[name];
    return resource && index >= 0 && index < resource.entries.length;
  });
  const lastUpdated = typeof state?.lastUpdated === "number" ? state!.lastUpdated : 0;
  return { data, lasts, lastUpdated } as MemorizeState;
};

const pickWeighted = (names: string[], data: Record<string, MemorizeResource>) => {
  const weights = names.map((name) => Math.max(0, data[name]?.weight ?? 0));
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return names[Math.floor(Math.random() * names.length)];
  }
  let cursor = Math.random() * total;
  for (let index = 0; index < names.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) {
      return names[index];
    }
  }
  return names[names.length - 1];
};

const applyNext = (state: MemorizeState, display: number) => {
  const normalized = normalizeState(state);
  const names = Object.keys(normalized.data).filter(
    (name) => normalized.data[name].entries.length > 0,
  );
  if (!names.length) {
    return normalized;
  }

  const recentNames = new Set(normalized.lasts.map(([name]) => name));
  let candidates = names.filter((name) => !recentNames.has(name));
  if (!candidates.length) {
    candidates = names;
  }

  const name = pickWeighted(candidates, normalized.data);
  const resource = normalizeResource(normalized.data[name]);
  let available = resource.entries
    .map((_, index) => index)
    .filter((index) => !resource.shown[index]);
  if (!available.length) {
    resource.shown = resource.entries.map(() => false);
    available = resource.entries.map((_, index) => index);
  }
  if (!available.length) {
    return normalized;
  }
  const pickedIndex = available[Math.floor(Math.random() * available.length)];
  resource.shown = [...resource.shown];
  resource.shown[pickedIndex] = true;

  const lasts = [...normalized.lasts, [name, pickedIndex] as [string, number]];
  const trimmedLasts = display > 0 ? lasts.slice(-display) : [];

  return {
    data: { ...normalized.data, [name]: resource },
    lasts: trimmedLasts,
    lastUpdated: Date.now(),
  };
};

const useMemorizeApi = () => {
  const id = useMemo(() => getCompId(), []);
  return useMemo(() => window.api.comp<MemorizeState>(id), [id]);
};

const useMemorizeState = () => {
  const api = useMemorizeApi();
  const [state, setState] = useState<MemorizeState>(defaultState);

  useEffect(() => {
    let active = true;
    const sync = async () => {
      const data = await api.data();
      if (!active) return;
      setState(normalizeState(data ?? defaultState));
    };
    api.init(defaultState).then(sync);
    const dispose = api.onChanged(sync);
    return () => {
      active = false;
      dispose?.();
    };
  }, [api]);

  return { api, state, setState };
};

export const CompMemorizeConfig: FC<{
  config: ComponentMemorizeConfig;
  setConfig: (config: any) => void;
}> = ({ config, setConfig }) => {
  const { stateConfig, setStateConfig } =
    useComponentConfigState<ComponentMemorizeConfig>(
      defaultValue,
      config,
      setConfig as (config: ComponentMemorizeConfig) => void,
    );
  const helper = new ComponentConfigHelper(stateConfig, setStateConfig);

  const { api, state } = useMemorizeState();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [addName, setAddName] = useState("");
  const [addText, setAddText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingName && !state.data[editingName]) {
      setEditingName(null);
      setEditingText("");
    }
  }, [editingName, state.data]);

  const toggleExpanded = (name: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const runNext = useCallback(async () => {
    await api.data((data) => applyNext(data ?? defaultState, stateConfig.display));
  }, [api, stateConfig.display]);

  const updateResource = useCallback(
    async (name: string, text: string) => {
      const entries = parseEntries(text);
      await api.data((data) => {
        const normalized = normalizeState(data ?? defaultState);
        const current = normalized.data[name] ?? {
          entries: [],
          shown: [],
          weight: 1,
        };
        const nextResource: MemorizeResource = {
          entries,
          shown: entries.map(() => false),
          weight: current.weight ?? 1,
        };
        const lasts = normalized.lasts.filter(
          ([resourceName, index]) =>
            resourceName !== name &&
            index >= 0 &&
            index < (normalized.data[resourceName]?.entries.length ?? 0),
        );
        return {
          ...normalized,
          data: { ...normalized.data, [name]: nextResource },
          lasts,
        };
      });
    },
    [api],
  );

  const handleReset = async (name: string) => {
    await api.data((data) => {
      const normalized = normalizeState(data ?? defaultState);
      const current = normalized.data[name];
      if (!current) return normalized;
      const nextResource = {
        ...current,
        shown: current.entries.map(() => false),
      };
      return {
        ...normalized,
        data: { ...normalized.data, [name]: nextResource },
      };
    });
  };

  const handleDelete = async (name: string) => {
    await api.data((data) => {
      const normalized = normalizeState(data ?? defaultState);
      if (!normalized.data[name]) return normalized;
      const nextData = { ...normalized.data };
      delete nextData[name];
      const lasts = normalized.lasts.filter(([resourceName]) => resourceName !== name);
      return {
        ...normalized,
        data: nextData,
        lasts,
      };
    });
  };

  const handleWeightChange = async (name: string, weight: number) => {
    const nextWeight = Math.max(0, weight);
    await api.data((data) => {
      const normalized = normalizeState(data ?? defaultState);
      const current = normalized.data[name];
      if (!current) return normalized;
      return {
        ...normalized,
        data: {
          ...normalized.data,
          [name]: { ...current, weight: nextWeight },
        },
      };
    });
  };

  const startEditing = (name: string) => {
    const resource = state.data[name];
    setEditingName(name);
    setEditingText(resource?.entries?.join("\n") ?? "");
    setExpanded((current) => new Set(current).add(name));
  };

  const cancelEditing = () => {
    setEditingName(null);
    setEditingText("");
  };

  const handleUpdateSubmit = async () => {
    if (!editingName) return;
    await updateResource(editingName, editingText);
    setEditingName(null);
    setEditingText("");
  };

  const handleAdd = async () => {
    const trimmedName = addName.trim();
    if (!trimmedName) {
      setError("请输入资源名称。");
      return;
    }
    if (state.data[trimmedName]) {
      setError("资源已存在，请更换名称。");
      return;
    }
    const entries = parseEntries(addText);
    if (!entries.length) {
      setError("请输入至少一行内容。");
      return;
    }
    setError(null);
    await api.data((data) => {
      const normalized = normalizeState(data ?? defaultState);
      return {
        ...normalized,
        data: {
          ...normalized.data,
          [trimmedName]: {
            entries,
            shown: entries.map(() => false),
            weight: 1,
          },
        },
      };
    });
    setAdding(false);
    setAddName("");
    setAddText("");
  };

  const handleAddCancel = () => {
    setAdding(false);
    setAddName("");
    setAddText("");
    setError(null);
  };

  const handleUpdateDrop = async (name: string, files: FileList | null) => {
    if (!files?.length) return;
    const text = await files[0].text();
    await updateResource(name, text);
    setEditingName(null);
    setEditingText("");
  };

  const handleAddDrop = async (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    const text = await file.text();
    const entries = parseEntries(text);
    if (!entries.length) {
      setError("文件中没有可用的条目。");
      return;
    }
    let name = addName.trim();
    if (!name) {
      name = file.name.replace(/\.[^.]+$/, "") || file.name;
    }
    if (state.data[name]) {
      setError("资源已存在，请更换名称。");
      return;
    }
    setError(null);
    await api.data((data) => {
      const normalized = normalizeState(data ?? defaultState);
      return {
        ...normalized,
        data: {
          ...normalized.data,
          [name]: {
            entries,
            shown: entries.map(() => false),
            weight: 1,
          },
        },
      };
    });
    setAdding(false);
    setAddName("");
    setAddText("");
  };

  const preventDrop = (event: DragEvent) => {
    event.preventDefault();
  };

  const resources = Object.entries(state.data);

  return (
    <>
      <CompBaseConfig config={stateConfig} setConfig={setStateConfig} />
      <div className="comp-config-group">
        <h3>记忆</h3>
        {helper.swipeInput("interval", "间隔", 1, "分钟")}
        {helper.swipeInput("display", "显示", 1, "条")}
        {helper.input("normalColor", "正常颜色", {
          inputProps: { placeholder: "#fff" },
        })}
        {helper.input("highlightColor", "高亮颜色", {
          inputProps: { placeholder: "#af3" },
        })}
      </div>
      <div className="comp-config-group">
        <h3>控制</h3>
        <div className="memorize-control">
          <button className="primary" type="button" onClick={runNext}>
            下一条
          </button>
        </div>
      </div>
      <div className="comp-config-group">
        <h3>资源</h3>
        {error && <div className="memorize-error">{error}</div>}
        <div className="memorize-resource-list">
          {resources.length === 0 && (
            <div className="memorize-empty">暂无资源。</div>
          )}
          {resources.map(([name, resource]) => {
            const expandedRow = expanded.has(name);
            const shownCount = resource.shown.filter(Boolean).length;
            const isEditing = editingName === name;
            return (
              <div className="memorize-resource-card" key={name}>
                <div className="memorize-resource-header">
                  <button
                    className="memorize-resource-toggle"
                    type="button"
                    onClick={() => toggleExpanded(name)}
                    aria-expanded={expandedRow}
                  >
                    {name}
                  </button>
                  <div className="memorize-resource-actions">
                    <button
                      className="outline"
                      type="button"
                      onClick={() => startEditing(name)}
                      onDragOver={preventDrop}
                      onDrop={(event) => {
                        event.preventDefault()
                        handleUpdateDrop(name, event.dataTransfer.files)
                      }}
                    >
                      更新
                    </button>
                    <button
                      className="outline"
                      type="button"
                      onClick={() => handleReset(name)}
                    >
                      重置
                    </button>
                    <button
                      className="outline"
                      type="button"
                      onClick={() => handleDelete(name)}
                    >
                      删除
                    </button>
                  </div>
                </div>
                <div className="memorize-resource-subheader">
                  <span>
                    已展示: {shownCount} / {resource.entries.length}
                  </span>
                  <div className="memorize-resource-weight">
                    <span>权重:</span>
                    <SwipeAdjustInput
                      type="number"
                      value={resource.weight}
                      onChange={(event) =>
                        handleWeightChange(name, Number(event.target.value))
                      }
                      swipePxPerStep={38}
                      onSwipeAdjust={(steps) =>
                        handleWeightChange(name, resource.weight + steps)
                      }
                    />
                  </div>
                </div>
                {expandedRow && (
                  <div className="memorize-resource-entries">
                    {resource.entries.map((entry, index) => (
                      <div className="memorize-resource-entry" key={index}>
                        <span
                          className={
                            resource.shown[index]
                              ? "memorize-dot memorize-dot--shown"
                              : "memorize-dot memorize-dot--hidden"
                          }
                        />
                        <span>{entry}</span>
                      </div>
                    ))}
                  </div>
                )}
                {isEditing && (
                  <div className="memorize-update-panel">
                    <textarea
                      value={editingText}
                      onChange={(event) => setEditingText(event.target.value)}
                      placeholder="每行一个条目，支持使用 _ 分隔高亮部分"
                    />
                    <div className="memorize-update-actions">
                      <button
                        className="primary"
                        type="button"
                        onClick={handleUpdateSubmit}
                      >
                        更新
                      </button>
                      <button
                        className="outline"
                        type="button"
                        onClick={cancelEditing}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!adding && (
          <button
            className="outline memorize-add-trigger"
            type="button"
            onClick={() => setAdding(true)}
            onDragOver={preventDrop}
            onDrop={(event) => {
              event.preventDefault()
              handleAddDrop(event.dataTransfer.files)
            }}
          >
            添加
          </button>
        )}
        {adding && (
          <div className="memorize-add-panel">
            <input
              type="text"
              value={addName}
              onChange={(event) => setAddName(event.target.value)}
              placeholder="资源名称"
            />
            <textarea
              value={addText}
              onChange={(event) => setAddText(event.target.value)}
              placeholder="每行一个条目，支持使用 _ 分隔高亮部分"
            />
            <div className="memorize-update-actions">
              <button className="primary" type="button" onClick={handleAdd}>
                添加
              </button>
              <button className="outline" type="button" onClick={handleAddCancel}>
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const CompMemorize: FC<{
  config: ComponentMemorizeConfig;
  openConfigWindow: (() => void) | null;
}> = ({ config: conf, openConfigWindow }) => {
  const config = { ...defaultValue, ...conf };
  const { api, state } = useMemorizeState();
  const lastUpdatedRef = useRef(state.lastUpdated);

  useEffect(() => {
    lastUpdatedRef.current = state.lastUpdated;
  }, [state.lastUpdated]);

  const runNext = useCallback(async () => {
    await api.data((data) => applyNext(data ?? defaultState, config.display));
  }, [api, config.display]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const intervalMs = config.interval * 60 * 1000;
      if (Date.now() >= lastUpdatedRef.current + intervalMs) {
        runNext();
      }
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [config.interval, runNext]);

  const style = {
    ...componentStyle(config),
    "--memorize-normal-color": config.normalColor || "#fff",
    "--memorize-highlight-color": config.highlightColor || "#af3",
  } as CSSProperties;
  const visibleLasts =
    config.display > 0 ? state.lasts.slice(-config.display) : [];

  return (
    <>
      <div className="comp comp-memorize" style={style}>
        {visibleLasts.map(([name, entryIndex], index) => {
          const resource = state.data[name];
          const value = resource?.entries?.[entryIndex];
          if (!value) return null;
          const shouldHide = index !== visibleLasts.length - 1;
          const parsed = value.split("_");
          return (
            <div className="entry" key={`${name}-${index}-${entryIndex}`}>
              {parsed.map((data, entryIndex) => (
                <span
                  key={entryIndex}
                  className={
                    entryIndex % 2 === 1
                      ? shouldHide
                        ? "underline-only"
                        : "highlight"
                      : "normal"
                  }
                >
                  {data}
                </span>
              ))}
            </div>
          );
        })}
      </div>
      {openConfigWindow && (
        <button className="config-button primary" onClick={openConfigWindow}>
          配置
        </button>
      )}
    </>
  );
};

export const compMemorize: Component<ComponentMemorizeConfig> = {
  type: "memorize",
  body: (config, openConfigWindow) => (
    <CompMemorize config={config} openConfigWindow={openConfigWindow} />
  ),
  config: (config, setConfig) => (
    <CompMemorizeConfig config={config} setConfig={setConfig} />
  ),
};
