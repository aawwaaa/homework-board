import { ChangeEvent, useMemo, useRef } from "react";

import { Badge, type BadgeSupported } from "./Badge";

import "./BadgeEdit.css";

/*

T extends BadgeSupported
<BadgeEdit value={T[]} setValue={(T[]) => void} available={T[]} />

样式:
<Badge value={T} /> <Badge value={T} /> ... <select><option>添加</option>...</select>

*/

type BadgeEditProps<T extends BadgeSupported> = {
  value?: readonly T[];
  setValue?: (value: T[]) => void;
  available?: readonly T[];
  getKey?: (item: T) => string | number;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
};

type MaybeWithId = BadgeSupported & { id?: string | number };

const defaultKeySelector = (item: BadgeSupported) => {
  const maybeWithId = item as MaybeWithId;
  if (maybeWithId.id != null) {
    return String(maybeWithId.id);
  }
  return item.name;
};

export const BadgeEdit = <T extends BadgeSupported>({
  value,
  setValue,
  available,
  getKey,
  className,
  placeholder = "添加",
  disabled = false,
}: BadgeEditProps<T>) => {
  const selectRef = useRef<HTMLSelectElement | null>(null);
  const keySelector = getKey ?? defaultKeySelector;
  const selected = (value ?? []) as T[];
  const canEdit = Boolean(setValue) && !disabled;

  const availableOptions = useMemo(() => {
    if (!available?.length) {
      return [] as T[];
    }
    const selectedKeys = new Set(selected.map((item) => keySelector(item)));
    return available.filter(
      (item) => !selectedKeys.has(keySelector(item)),
    ) as T[];
  }, [available, keySelector, selected]);

  const resetSelect = () => {
    const element = selectRef.current;
    if (element) {
      element.value = "";
    }
  };

  const removeValue = (item: T) => {
    if (!setValue || !canEdit) {
      return;
    }
    const key = keySelector(item);
    const next = selected.filter((current) => keySelector(current) !== key);
    setValue(next);
  };

  const addValue = (event: ChangeEvent<HTMLSelectElement>) => {
    if (!setValue || !canEdit) {
      resetSelect();
      return;
    }
    const key = event.target.value;
    if (!key) {
      return;
    }
    const option = availableOptions.find(
      (item) => String(keySelector(item)) === key,
    );
    if (!option) {
      resetSelect();
      return;
    }
    const optionKey = keySelector(option);
    if (selected.some((item) => keySelector(item) === optionKey)) {
      resetSelect();
      return;
    }
    setValue([...selected, option]);
    resetSelect();
  };

  const containerClass = ["badge-edit", className].filter(Boolean).join(" ");

  return (
    <div className={containerClass}>
      <div>
        {selected.map((item) => {
          const key = String(keySelector(item));
          return (
            <Badge
              key={key}
              data={item}
              onClick={canEdit ? () => removeValue(item) : undefined}
            />
          );
        })}
      </div>
      {setValue ? (
        <select
          ref={selectRef}
          onChange={addValue}
          disabled={!canEdit || availableOptions.length === 0}
          defaultValue=""
        >
          <option value="">{placeholder}</option>
          {availableOptions.map((item) => {
            const key = String(keySelector(item));
            return (
              <option key={key} value={key}>
                {item.name}
              </option>
            );
          })}
        </select>
      ) : null}
    </div>
  );
};
