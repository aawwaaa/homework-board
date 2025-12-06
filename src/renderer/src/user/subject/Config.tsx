import { AssignmentEdit } from "@renderer/component/AssignmentEdit";
import { Tab } from "@renderer/component/Tab";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import "./Config.css";

const MINUTE_IN_MS = 60 * 1000;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const presetTabId = (index: number) => `preset-${index}`;

const parsePresetIndex = (tabName: string) => {
    if (!tabName.startsWith("preset-")) {
        return -1;
    }
    const value = Number(tabName.replace("preset-", ""));
    return Number.isFinite(value) ? value : -1;
};

const createPreset = (index: number): AssignmentPreset => ({
    name: `预设 ${index + 1}`,
    description: "",
    duration: 2 * DAY_IN_MS,
    estimated: 30 * MINUTE_IN_MS,
    priority: 1,
});

export const SubjectConfigPage = ({ subject }: { subject: Subject }) => {
    const [currentSubject, setCurrentSubject] = useState<Subject>(subject);
    const [activePresetTab, setActivePresetTab] = useState<string>("");
    const [tabResetKey, setTabResetKey] = useState(0);
    const isUpdatingRef = useRef(false);

    const presets = currentSubject.config.assignmentPresets ?? [];

    useEffect(() => {
        setCurrentSubject(subject);
    }, [subject]);

    const persistSubject = useCallback((next: Subject) => {
        isUpdatingRef.current = true;
        void window.data.subject
            .update(next)
            .catch((error) => console.error("更新科目配置失败", error))
            .finally(() => {
                isUpdatingRef.current = false;
            });
    }, []);

    const updateSubject = useCallback(
        (updater: (prev: Subject) => Subject) => {
            setCurrentSubject((prev) => {
                const next = updater(prev);
                persistSubject(next);
                return next;
            });
        },
        [persistSubject],
    );

    useEffect(() => {
        return window.data.onChanged(async () => {
            if (isUpdatingRef.current) {
                return;
            }
            const subjects = await window.data.subject.list();
            const latest = subjects.find((item) => item.id === subject.id);
            if (latest) {
                setCurrentSubject(latest);
            }
        });
    }, [subject.id]);

    const presetTabs = useMemo<[string, string][]>(() => {
        return presets.map((preset, index) => {
            const label = preset.name?.trim() ? preset.name : `预设 ${index + 1}`;
            return [presetTabId(index), label];
        });
    }, [presets]);

    const handleTabChange = useCallback((name: string) => {
        setActivePresetTab(name);
    }, []);

    const handleAddPreset = useCallback(() => {
        const nextIndex = presets.length;
        updateSubject((prev) => {
            const nextPresets = [...(prev.config.assignmentPresets ?? []), createPreset(nextIndex)];
            return {
                ...prev,
                config: {
                    ...prev.config,
                    assignmentPresets: nextPresets,
                },
            };
        });
        const nextTab = presetTabId(nextIndex);
        setActivePresetTab(nextTab);
        setTabResetKey((key) => key + 1);
    }, [presets.length, updateSubject]);

    const activePresetIndex = parsePresetIndex(activePresetTab);
    const activePreset = presets[activePresetIndex];

    const updatePresetField = useCallback(
        (index: number, key: keyof AssignmentPreset, value: AssignmentPreset[keyof AssignmentPreset]) => {
            updateSubject((prev) => {
                const existing = prev.config.assignmentPresets ?? [];
                if (!existing[index]) {
                    return prev;
                }
                const nextPresets = existing.slice();
                nextPresets[index] = {
                    ...nextPresets[index],
                    [key]: value,
                } as AssignmentPreset;
                return {
                    ...prev,
                    config: {
                        ...prev.config,
                        assignmentPresets: nextPresets,
                    },
                };
            });
        },
        [updateSubject],
    );

    const handleRemovePreset = useCallback(() => {
        if (activePresetIndex < 0) {
            return;
        }
        updateSubject((prev) => {
            const existing = prev.config.assignmentPresets ?? [];
            if (!existing[activePresetIndex]) {
                return prev;
            }
            const nextPresets = existing.slice();
            nextPresets.splice(activePresetIndex, 1);
            return {
                ...prev,
                config: {
                    ...prev.config,
                    assignmentPresets: nextPresets,
                },
            };
        });
    }, [activePresetIndex, updateSubject]);

    return (
        <div className="subject-config-page">
            <section className="subject-config-section">
                <div className="subject-config-toolbar">
                    {presetTabs.length ? (
                        <Tab
                            key={tabResetKey}
                            tabs={presetTabs}
                            set={handleTabChange}
                            initial={activePresetTab}
                            className="subject-config-tab"
                        />
                    ) : (
                        <div className="subject-config-tab-placeholder">暂无预设</div>
                    )}
                    <button className="outline" onClick={handleAddPreset}>
                        添加预设
                    </button>
                </div>

                {!presetTabs.length ? (
                    <div className="subject-config-empty">
                        <p>暂未创建任何作业预设。</p>
                        <button onClick={handleAddPreset}>立即添加</button>
                    </div>
                ) : activePreset ? (
                    <>
                        <AssignmentEdit
                            key={activePresetTab}
                            value={activePreset}
                            onChange={(key, value) => updatePresetField(activePresetIndex, key, value)}
                        />
                        <div className="subject-config-actions">
                            <button className="danger" onClick={handleRemovePreset}>
                                删除当前预设
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="subject-config-empty">
                        <p>请选择一个预设进行编辑。</p>
                    </div>
                )}
            </section>
        </div>
    );
};
