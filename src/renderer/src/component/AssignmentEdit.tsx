import { ChangeEvent, useEffect, useRef, useState } from "react";

import { Priority } from "./Priority";

import "./AssignmentEdit.css";
import { Badge } from "./Badge";
import { SwipeAdjustInput } from "./SwipeAdjustInput";
import { BadgeEdit } from "./BadgeEdit";
import { Markdown } from "./Markdown";

/*

<AssignmentEdit value={assignment} onChange={(key, value) => void} />

显示:

input[type="text"] 100%width 作业标题，加粗 br
textarea 100%width 400pxheight 作业详情 br
{"duration" in assignment? (
  // assignment is AssignmentPreset
  input 持续时间(天，小时)，选择合适的元素
  input 估计时长（小时，分钟），选择合适的元素
): (
  // assignment is Assignment
  input[type="date-time-local"] 开始时间
  input[type="date-time-local"] 结束时间
  input 估计时长（小时，分钟），选择合适的元素
)}
Priority br

*/

const MINUTE_IN_MS = 60 * 1000;
const HOUR_IN_MS = 60 * MINUTE_IN_MS;
const DAY_IN_MS = 24 * HOUR_IN_MS;
const DATE_SWIPE_MINUTES = 15;
const ESTIMATE_MINUTE_STEP = 5;

const pad = (value: number) => value.toString().padStart(2, "0");

const clampNumber = (value: number) => (Number.isFinite(value) ? Math.max(value, 0) : 0);

const formatDateTimeLocal = (value?: Date | string | number | null) => {
    if (!value) {
        return "";
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const parseDateTimeLocal = (value: string) => {
    if (!value) {
        return null;
    }
    const [datePart, timePart] = value.split("T");
    if (!datePart || !timePart) {
        return null;
    }
    const [yearStr, monthStr, dayStr] = datePart.split("-");
    const [hourStr, minuteStr] = timePart.split(":");
    const parsed = [yearStr, monthStr, dayStr, hourStr, minuteStr].map(part => Number(part));
    if (parsed.some(part => Number.isNaN(part))) {
        return null;
    }
    const [year, month, day, hours, minutes] = parsed;
    return new Date(year, month - 1, day, hours, minutes);
};

const splitDuration = (ms: number) => {
    const safe = clampNumber(Math.round(ms));
    const days = Math.floor(safe / DAY_IN_MS);
    const hours = Math.floor((safe % DAY_IN_MS) / HOUR_IN_MS);
    return { days, hours };
};

const combineDuration = (days: number, hours: number) => {
    const safeDays = clampNumber(days);
    const safeHours = clampNumber(hours);
    return Math.round(safeDays) * DAY_IN_MS + Math.round(safeHours) * HOUR_IN_MS;
};

const splitMinutes = (minutes: number) => {
    const safe = clampNumber(Math.round(minutes));
    const hours = Math.floor(safe / 60);
    const mins = safe % 60;
    return { hours, minutes: mins };
};

const combineMinutes = (hours: number, minutes: number) => {
    const safeHours = clampNumber(hours);
    const safeMinutes = clampNumber(minutes);
    return Math.round(safeHours * 60 + safeMinutes);
};

const combineMinutesToMs = (hours: number, minutes: number) => combineMinutes(hours, minutes) * MINUTE_IN_MS;

type BaseProps = {
    className?: string;
    readOnly?: boolean;
};

type AssignmentEditAssignmentProps = BaseProps & {
    value: Assignment;
    presets?: AssignmentPreset[];
    onChange: <K extends keyof Assignment>(key: K, value: Assignment[K]) => void;
};

type AssignmentEditPresetProps = BaseProps & {
    value: AssignmentPreset;
    onChange: <K extends keyof AssignmentPreset>(key: K, value: AssignmentPreset[K]) => void;
};

type AssignmentEditProps = AssignmentEditAssignmentProps | AssignmentEditPresetProps;

const isAssignmentProps = (props: AssignmentEditProps): props is AssignmentEditAssignmentProps => {
    return "subject" in props.value;
};

const isPresetProps = (props: AssignmentEditProps): props is AssignmentEditPresetProps => {
    return "duration" in props.value;
};

const toNumber = (value: string) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
};

export const AssignmentEdit = (props: AssignmentEditProps) => {
    const { className, readOnly = false, value } = props;
    const disabled = Boolean(readOnly);
    const assignment = isAssignmentProps(props) ? props : null;
    const preset = isPresetProps(props) ? props : null;

    const containerClass = ["assignment-edit", className].filter(Boolean).join(" ");

    const titleValue = assignment ? assignment.value.title ?? "" : preset?.value.name ?? "";
    const descriptionValue = value.description ?? "";

    const estimatedMinutes = assignment
        ? assignment.value.estimated ?? 0
        : Math.round((preset?.value.estimated ?? 0) / MINUTE_IN_MS);
    const estimatedParts = splitMinutes(estimatedMinutes);
    const durationParts = preset ? splitDuration(preset.value.duration ?? 0) : null;

    const createdRef = useRef<Date | null>(assignment ? new Date(assignment.value.created) : null);
    const deadlineRef = useRef<Date | null>(assignment ? new Date(assignment.value.deadline) : null);
    const durationRef = useRef<number>(preset?.value.duration ?? 0);
    const estimatedMinutesRef = useRef<number>(estimatedMinutes);
    const presetSelectRef = useRef<HTMLSelectElement>(null);

    const [tags, setTags] = useState<Record<string, AssignmentTag> | null>(null);
    const [descriptionPreview, setDescriptionPreview] = useState(false);

    useEffect(() => {
        if (disabled) {
            setDescriptionPreview(false);
        }
    }, [disabled]);

    useEffect(() => {
        return window.data.onChanged(async () => {
            setTags(Object.fromEntries((await window.data.tag.list()).map(a => [a.id, a])));
        });
    }, []);

    useEffect(() => {
        if (assignment) {
            createdRef.current = new Date(assignment.value.created);
            deadlineRef.current = new Date(assignment.value.deadline);
        } else {
            createdRef.current = null;
            deadlineRef.current = null;
        }
    }, [assignment, assignment?.value.created, assignment?.value.deadline]);

    useEffect(() => {
        durationRef.current = preset?.value.duration ?? 0;
    }, [preset, preset?.value.duration]);

    useEffect(() => {
        estimatedMinutesRef.current = estimatedMinutes;
    }, [estimatedMinutes]);

    const adjustDateBySwipe = (key: "created" | "deadline", steps: number) => {
        if (disabled || !assignment || steps === 0) {
            return;
        }
        const ref = key === "created" ? createdRef : deadlineRef;
        const base = ref.current ?? new Date();
        const next = new Date(base.getTime());
        next.setMinutes(next.getMinutes() + steps * DATE_SWIPE_MINUTES);
        ref.current = next;
        assignment.onChange(key, next);
    };

    const adjustDurationBySwipe = (unit: "days" | "hours", steps: number) => {
        if (disabled || !preset || steps === 0) {
            return;
        }
        const delta = steps * (unit === "days" ? DAY_IN_MS : HOUR_IN_MS);
        const next = Math.max(0, (durationRef.current ?? 0) + delta);
        durationRef.current = next;
        preset.onChange("duration", next);
    };

    const adjustEstimatedBySwipe = (unit: "hours" | "minutes", steps: number) => {
        if (disabled || steps === 0) {
            return;
        }
        const delta = steps * (unit === "hours" ? 60 : ESTIMATE_MINUTE_STEP);
        const next = Math.max(0, (estimatedMinutesRef.current ?? 0) + delta);
        estimatedMinutesRef.current = next;
        if (assignment) {
            assignment.onChange("estimated", next);
        } else if (preset) {
            preset.onChange("estimated", next * MINUTE_IN_MS);
        }
    };

    const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (disabled) {
            return;
        }
        if (assignment) {
            assignment.onChange("title", event.target.value);
        } else if (preset) {
            preset.onChange("name", event.target.value);
        }
    };

    const handleDescriptionChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        if (disabled) {
            return;
        }
        if (assignment) {
            assignment.onChange("description", event.target.value);
        } else if (preset) {
            preset.onChange("description", event.target.value);
        }
    };

    const handleDateChange = (key: "created" | "deadline") => (event: ChangeEvent<HTMLInputElement>) => {
        if (disabled || !assignment) {
            return;
        }
        const next = parseDateTimeLocal(event.target.value);
        if (!next) {
            return;
        }
        if (key === "created") {
            createdRef.current = next;
        } else {
            deadlineRef.current = next;
        }
        assignment.onChange(key, next);
    };

    const handleDurationChange = (part: "days" | "hours") => (event: ChangeEvent<HTMLInputElement>) => {
        if (disabled || !preset || !durationParts) {
            return;
        }
        const nextValue = toNumber(event.target.value);
        const nextDays = part === "days" ? nextValue : durationParts.days;
        const nextHours = part === "hours" ? nextValue : durationParts.hours;
        preset.onChange("duration", combineDuration(nextDays, nextHours));
    };

    const handleEstimatedChange = (part: "hours" | "minutes") => (event: ChangeEvent<HTMLInputElement>) => {
        if (disabled) {
            return;
        }
        const nextValue = toNumber(event.target.value);
        const nextHours = part === "hours" ? nextValue : estimatedParts.hours;
        const nextMinutes = part === "minutes" ? nextValue : estimatedParts.minutes;
        if (assignment) {
            assignment.onChange("estimated", combineMinutes(nextHours, nextMinutes));
        } else if (preset) {
            preset.onChange("estimated", combineMinutesToMs(nextHours, nextMinutes));
        }
    };

    const handlePriorityChange = (priority: number) => {
        if (disabled) {
            return;
        }
        if (assignment) {
            assignment.onChange("priority", priority);
        } else if (preset) {
            preset.onChange("priority", priority);
        }
    };

    const handlePresetChange = (event: ChangeEvent<HTMLSelectElement>) => {
        if (disabled || !assignment) {
            return;
        }
        const next = event.target.value;
        if (!next) {
            return;
        }
        const preset = assignment.presets!.find(p => p.name === next);
        if (!preset) {
            return;
        }
        assignment.onChange("title", preset.name);
        assignment.onChange("description", preset.description);
        assignment.onChange("estimated", preset.estimated / MINUTE_IN_MS);
        assignment.onChange("created", new Date());
        assignment.onChange("deadline", new Date(Date.now() + preset.duration));
        assignment.onChange("priority", preset.priority);
        assignment.onChange("config", { ...assignment.value.config, tags: preset.tags });

        presetSelectRef.current!.value = "";
        presetSelectRef.current!.blur()
    };

    return (
        <div className={containerClass} aria-readonly={disabled}>
            <label className="assignment-field">
                {assignment? <Badge data={assignment.value.subject}/>: null}
                <input
                    type="text"
                    className="assignment-title-input"
                    value={titleValue}
                    onChange={handleTitleChange}
                    placeholder="请输入作业标题"
                    disabled={disabled}
                />
                {assignment && assignment.presets? <select onChange={handlePresetChange} ref={presetSelectRef}>
                    <option value="">填充预设 (覆盖)</option>
                    {assignment.presets.map(preset => (
                        <option key={preset.name} value={preset.name}>
                            {preset.name}
                        </option>
                    ))}
                </select>: null}
            </label>

            <div className="assignment-field assignment-description-field">
                <textarea
                    className="assignment-description"
                    value={descriptionValue}
                    onChange={handleDescriptionChange}
                    placeholder="请输入作业详情（支持 Markdown）"
                    disabled={disabled || descriptionPreview}
                />
                <div className="assignment-description-tools">
                    <button
                        type="button"
                        className="flat"
                        onClick={() => setDescriptionPreview((value) => !value)}
                        disabled={disabled}
                    >
                        {descriptionPreview ? "继续编辑" : "预览"}
                    </button>
                </div>
            </div>
            {descriptionPreview ? (
                <div className="assignment-field assignment-description-preview">
                    <Markdown text={descriptionValue} />
                </div>
            ) : null}

            {assignment ? (
                <div className="assignment-field">
                    <div className="assignment-inline-group">
                        <label className="assignment-inline-input">
                            <SwipeAdjustInput
                                type="datetime-local"
                                value={formatDateTimeLocal(assignment.value.created)}
                                onChange={handleDateChange("created")}
                                disabled={disabled}
                                onSwipeAdjust={(steps) => adjustDateBySwipe("created", steps)}
                                swipeDisabled={disabled || !assignment}
                                swipePxPerStep={2}
                            />
                        </label>
                        <span>到</span>
                        <label className="assignment-inline-input">
                            <SwipeAdjustInput
                                type="datetime-local"
                                value={formatDateTimeLocal(assignment.value.deadline)}
                                onChange={handleDateChange("deadline")}
                                disabled={disabled}
                                onSwipeAdjust={(steps) => adjustDateBySwipe("deadline", steps)}
                                swipeDisabled={disabled || !assignment}
                                swipePxPerStep={2}
                            />
                        </label>
                    </div>
                </div>
            ) : (
                <div className="assignment-field">
                    <div className="assignment-inline-group">
                    <span>持续时间</span>
                        <label className="assignment-inline-input">
                            <SwipeAdjustInput
                                type="number"
                                min={0}
                                step={1}
                                value={durationParts?.days ?? 0}
                                onChange={handleDurationChange("days")}
                                disabled={disabled}
                                onSwipeAdjust={(steps) => adjustDurationBySwipe("days", steps)}
                                swipeDisabled={disabled || !preset}
                                swipePxPerStep={34}
                            />
                        </label>
                        <span>天</span>
                        <label className="assignment-inline-input">
                            <SwipeAdjustInput
                                type="number"
                                min={0}
                                step={1}
                                value={durationParts?.hours ?? 0}
                                onChange={handleDurationChange("hours")}
                                disabled={disabled}
                                onSwipeAdjust={(steps) => adjustDurationBySwipe("hours", steps)}
                                swipeDisabled={disabled || !preset}
                            />
                        </label>
                        <span>小时</span>
                    </div>
                </div>
            )}

            <div className="assignment-field">
                <div className="assignment-inline-group">
                    <span>估计时长</span>
                    <label className="assignment-inline-input">
                        <SwipeAdjustInput
                            type="number"
                            min={0}
                            step={1}
                            value={estimatedParts.hours}
                            onChange={handleEstimatedChange("hours")}
                            disabled={disabled}
                            onSwipeAdjust={(steps) => adjustEstimatedBySwipe("hours", steps)}
                            swipeDisabled={disabled}
                        />
                    </label>
                    <span>小时</span>
                    <label className="assignment-inline-input">
                        <SwipeAdjustInput
                            type="number"
                            min={0}
                            step={1}
                            value={estimatedParts.minutes}
                            onChange={handleEstimatedChange("minutes")}
                            disabled={disabled}
                            onSwipeAdjust={(steps) => adjustEstimatedBySwipe("minutes", steps)}
                            swipeDisabled={disabled}
                            swipePxPerStep={18}
                        />
                    </label>
                    <span>分钟</span>
                </div>
            </div>

            <div className="assignment-priority-field">
                <span>优先级</span>
                <Priority
                    value={value.priority ?? 1}
                    onChange={disabled ? undefined : handlePriorityChange}
                />
            </div>

            <div className="assignment-field">
                <div className="assignment-inline-group">
                    <span>标签</span>
                    {tags && <BadgeEdit
                        value={((assignment? assignment.value.config.tags: preset!.value.tags) ?? []).map(a => tags[a]).filter(Boolean)}
                        setValue={(tags) => {
                            tags ??= []
                            if (assignment) {
                                assignment.onChange("config", { ...assignment.value.config, tags: tags.map(t => t.id) });
                            } else {
                                preset!.onChange("tags", tags.map(t => t.id));
                            }
                        }}
                        available={Object.values(tags)}
                    />}
                </div>
            </div>

            {assignment && !preset && <div className="assignment-field">
                <div className="assignment-inline-group">
                    <span>已使用</span>
                    <SwipeAdjustInput
                        type="number"
                        min={0}
                        step={1}
                        value={assignment.value.spent}
                        onChange={(value) => assignment.onChange("spent", +value.target.value)}
                        disabled={disabled}
                        onSwipeAdjust={(steps) => assignment.onChange("spent", assignment.value.spent + steps * 5)}
                        swipeDisabled={disabled}
                    />
                    <span>分钟</span>
                </div>
            </div>}
        </div>
    );
};
