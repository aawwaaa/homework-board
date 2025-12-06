import { CSSProperties, ReactNode, useEffect, useMemo, useRef } from "react";

import "./Priority.css";

/*

<Priority value={value} onChange={(value) => void} />

显示:

最低 [1] [2] [3] [4] [5] 最高

颜色渐变，突出选中，点击切换。

*/

const range = [1, 5] as const;

export type PriorityProps = {
    value?: number | null;
    onChange?: (value: number) => void;
    min?: number;
    max?: number;
    labels?: [ReactNode, ReactNode];
    className?: string;
    disabled?: boolean;
};

const DEFAULT_LABELS: [ReactNode, ReactNode] = ["最低", "最高"];

const buildValues = (min: number, max: number) => {
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
        return [] as number[];
    }
    const step = min <= max ? 1 : -1;
    const length = Math.abs(max - min) + 1;
    return Array.from({ length }, (_, idx) => min + idx * step);
};

const normalizeHue = (value: number) => {
    const normalized = value % 360;
    return normalized < 0 ? normalized + 360 : normalized;
};

const getColorForIndex = (index: number, total: number) => {
    const ratio = total <= 1 ? 0 : index / (total - 1);
    const startHue = 239; //hsl(240, 100.00%, 92.40%)
    const endHue = 240; // 239 is the hue value forhsl(240, 100.00%, 80.00%)
    const hue = normalizeHue(startHue + (endHue - startHue) * ratio);
    const saturation = 70;
    const startLightness = 92;
    const endLightness = 60;
    const lightness = startLightness + (endLightness - startLightness) * ratio;
    const solid = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    const soft = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.25)`;
    return { solid, soft };
};

export const Priority = ({
    value,
    onChange,
    min = range[0],
    max = range[1],
    labels = DEFAULT_LABELS,
    className,
    disabled = false,
}: PriorityProps) => {
    const values = useMemo(() => buildValues(min, max), [min, max]);
    const activeValue =
        typeof value === "number" && values.includes(value) ? value : undefined;

    const isDisabled = disabled || !onChange;
    const isPointerActive = useRef(false);

    useEffect(() => {
        if (typeof window === "undefined") {
            return undefined;
        }
        const endPointer = () => {
            isPointerActive.current = false;
        };
        window.addEventListener("pointerup", endPointer);
        window.addEventListener("pointercancel", endPointer);
        return () => {
            window.removeEventListener("pointerup", endPointer);
            window.removeEventListener("pointercancel", endPointer);
        };
    }, []);

    const handleSelect = (next: number) => {
        if (isDisabled || !onChange) {
            return;
        }
        onChange(next);
    };

    if (!values.length) {
        return null;
    }

    const [lowLabel, highLabel] = labels ?? DEFAULT_LABELS;
    const containerClass = [
        "priority-picker",
        className,
        isDisabled ? "disabled" : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={containerClass}>
            <span className="priority-label priority-label-low">{lowLabel}</span>
            <div
                className="priority-scale"
                role="radiogroup"
                aria-label="优先级"
                aria-disabled={isDisabled}
            >
                {values.map((itemValue, index) => {
                    const isActive = activeValue === itemValue;
                    const color = getColorForIndex(index, values.length);
                    const style = {
                        "--priority-color": color.solid,
                        "--priority-color-soft": color.soft,
                    } as CSSProperties;
                    return (
                        <button
                            key={itemValue}
                            type="button"
                            role="radio"
                            aria-checked={isActive}
                            aria-label={`优先级 ${itemValue}`}
                            title={`优先级 ${itemValue}`}
                            className={isActive ? "active" : undefined}
                            style={style}
                            disabled={isDisabled}
                            onClick={() => handleSelect(itemValue)}
                            onPointerDown={(event) => {
                                if (isDisabled) {
                                    return;
                                }
                                if (event.pointerType === "touch") {
                                    event.preventDefault();
                                }
                                isPointerActive.current = true;
                                handleSelect(itemValue);
                            }}
                            onPointerEnter={() => {
                                if (!isPointerActive.current || isDisabled) {
                                    return;
                                }
                                handleSelect(itemValue);
                            }}
                        >
                            {itemValue}
                        </button>
                    );
                })}
            </div>
            <span className="priority-label priority-label-high">{highLabel}</span>
        </div>
    );
};
