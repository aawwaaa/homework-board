import {
  ReactNode,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import "./Tab.css";

export type TabProps = {
  tabs: [string, string][];
  set?: Dispatch<SetStateAction<string>> | ((name: string) => void);
  initial?: string;
  className?: string;
};

type TabItem = {
  name: string;
  label: ReactNode;
};

/**
 * Simple tab component that only renders the tab header using each child's `name` prop.
 */
export const Tab = ({ tabs: data, set, initial, className }: TabProps) => {
  const tabs = useMemo<TabItem[]>(() => {
    return data.map(([name, label]) => ({
      name: name,
      label: label,
    }));
  }, [data]);

  const defaultName = useMemo(() => {
    if (initial && tabs.some((tab) => tab.name === initial)) {
      return initial;
    }
    return tabs[0]?.name ?? "";
  }, [initial, tabs]);

  const [active, setActive] = useState<string>(defaultName);

  useEffect(() => {
    if (initial == null) return;
    setActive(initial);
  }, [initial]);

  useEffect(() => {
    if (!tabs.length) {
      if (active) {
        setActive("");
      }
      return;
    }

    if (!active || !tabs.some((tab) => tab.name === active)) {
      setActive(defaultName);
    }
  }, [active, defaultName, tabs]);

  useEffect(() => {
    if (set && active) {
      set(active);
    }
  }, [active, set]);

  if (!tabs.length) {
    return null;
  }

  const containerClass = ["tab-container", className].filter(Boolean).join(" ");

  return (
    <div className={containerClass}>
      <div className="tab-header" role="tablist">
        {tabs.map(({ name, label }) => (
          <button
            type="button"
            role="tab"
            key={name}
            aria-selected={name === active}
            className={name === active ? "active" : ""}
            onClick={() => setActive(name)}
          >
            {label ?? name}
          </button>
        ))}
      </div>
    </div>
  );
};
