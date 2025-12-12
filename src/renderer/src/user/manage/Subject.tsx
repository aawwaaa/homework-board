import { randomId } from "@renderer/util";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import "./Subject.css";
import { UserPageProps } from "@renderer/page/UserPage";
import { SubjectConfigPage } from "../subject/Config";

const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

const presetSubject: Record<"yu_wen" | "shu_xue" | "ying_yu" | "wu_li" | "hua_xue" | "sheng_wu", Subject> = {
    yu_wen: {
        id: "1yu",
        name: "语文",
        color: "#43c39e",
        config: {
            assignmentPresets: [{
                name: "练习册",
                description: "",
                duration: 3 * DAY,
                estimated: 30 * MINUTE,
                priority: 2,
            }, {
                name: "作业",
                description: "",
                duration: 1 * DAY,
                estimated: 30 * MINUTE,
                priority: 3,
            }]
        },
    },
    shu_xue: {
        id: "2shu",
        name: "数学",
        color: "#38a0e5",
        config: {
            assignmentPresets: [{
                name: "巩固作业",
                description: "",
                duration: 3 * DAY,
                estimated: 60 * MINUTE,
                priority: 2,
            }, {
                name: "课时作业",
                description: "",
                duration: 2 * DAY,
                estimated: 40 * MINUTE,
                priority: 3,
            }, {
                name: "示范卷",
                description: "",
                duration: 5 * DAY,
                estimated: 100 * MINUTE,
                priority: 2,
            }]
        },
    },
    ying_yu: {
        id: "3ying",
        name: "英语",
        color: "#e53871",
        config: {
            assignmentPresets: [{
                name: "单元单词",
                description: "",
                duration: 5 * DAY,
                estimated: 60 * MINUTE,
                priority: 4,
            }, {
                name: "翻译句子",
                description: "",
                duration: 5 * DAY,
                estimated: 60 * MINUTE,
                priority: 4,
            }, {
                name: "活页",
                description: "",
                duration: 3 * DAY,
                estimated: 30 * MINUTE,
                priority: 3,
            }, {
                name: "抄作文",
                description: "",
                duration: 3 * DAY,
                estimated: 30 * MINUTE,
                priority: 3,
            }]
        },
    },
    wu_li: {
        id: "4wu",
        name: "物理",
        color: "#edb136",
        config: {
            assignmentPresets: [{
                name: "课时作业",
                description: "",
                duration: 1 * DAY,
                estimated: 40 * MINUTE,
                priority: 3,
            }, {
                name: "单元练习",
                description: "",
                duration: 5 * DAY,
                estimated: 120 * MINUTE,
                priority: 3,
            }, {
                name: "示范卷",
                description: "",
                duration: 5 * DAY,
                estimated: 70 * MINUTE,
                priority: 2,
            }]
        },
    },
    hua_xue: {
        id: "5hua",
        name: "化学",
        color: "#8a44cc",
        config: {
            assignmentPresets: [{
                name: "课时作业",
                description: "",
                duration: 1 * DAY,
                estimated: 30 * MINUTE,
                priority: 3,
            }, {
                name: "优化设计 - 大册",
                description: "",
                duration: 3 * DAY,
                estimated: 30 * MINUTE,
                priority: 2,
            }, {
                name: "优化设计 - 小册",
                description: "",
                duration: 3 * DAY,
                estimated: 20 * MINUTE,
                priority: 2,
            }, {
                name: "课本 - 课后习题",
                description: "",
                duration: 3 * DAY,
                estimated: 30 * MINUTE,
                priority: 2,
            }, {
                name: "示范卷",
                description: "",
                duration: 5 * DAY,
                estimated: 70 * MINUTE,
                priority: 2,
            }]
        },
    },
    sheng_wu: {
        id: "6sheng",
        name: "生物",
        color: "#6dba3a",
        config: {
            assignmentPresets: [{
                name: "课时作业",
                description: "",
                duration: 1 * DAY,
                estimated: 10 * MINUTE,
                priority: 3,
            }, {
                name: "优化设计 - 大册",
                description: "",
                duration: 3 * DAY,
                estimated: 30 * MINUTE,
                priority: 2,
            }, {
                name: "优化设计 - 小册",
                description: "",
                duration: 3 * DAY,
                estimated: 20 * MINUTE,
                priority: 2,
            }, {
                name: "示范卷",
                description: "",
                duration: 5 * DAY,
                estimated: 70 * MINUTE,
                priority: 2,
            }]
        },
    }
}

const presets = {
    "语数英": [
        presetSubject.yu_wen,
        presetSubject.shu_xue,
        presetSubject.ying_yu,
    ],
    "语数英物化生": [
        presetSubject.yu_wen,
        presetSubject.shu_xue,
        presetSubject.ying_yu,
        presetSubject.wu_li,
        presetSubject.hua_xue,
        presetSubject.sheng_wu,
    ]
}

const SubjectElement = ({subject, props, onChange}: {subject: Subject, props: UserPageProps, onChange: (subject: Subject) => void}) => {
    const update = (key: keyof Subject) => (event: ChangeEvent<HTMLInputElement>) => {
        onChange({ ...subject, [key]: event.target.value });
    }

    return <div className="subject-row">
        <input key={subject.id + ".name"} type="text" value={subject.name} onChange={update('name')} />
        <input key={subject.id + ".color"} type="color" value={subject.color} onChange={update('color')} />
        <button className="secondary" onClick={() => props.updatePage("config", <SubjectConfigPage key={Math.random()} subject={subject} />)}>
            配置
        </button>
        <button className="danger" onClick={() => window.data.subject.remove(subject.id)}>删除</button>
    </div>
}

export const ManageSubjectPage = ({props}: {props: UserPageProps}) => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const preventUpdate = useRef(false);
    const presetSelectRef = useRef<HTMLSelectElement>(null);

    useEffect(() => {
        return window.data.onChanged(async () => {
            if (preventUpdate.current) {
                return;
            }
            const nextSubjects = await window.data.subject.list();
            setSubjects(nextSubjects);
        })
    }, []);

    const updateSubject = useCallback(async (next: Subject) => {
        preventUpdate.current = true;
        setSubjects(current => {
            const updated = current.map(subject => subject.id === next.id ? next : subject);
            return updated;
        });
        await window.data.subject.update(next);
        preventUpdate.current = false;
    }, [preventUpdate]);

    const addSubject = () => {
        const subject = {
            id: randomId(),
            name: '新科目',
            color: '#000000',
            config: {
                assignmentPresets: [],
            },
        } satisfies Subject;
        window.data.subject.add(subject);
    }

    const loadPreset = async (event: ChangeEvent<HTMLSelectElement>) => {
        const preset: Subject[] = presets[event.target.value];
        if (!preset) {
            return;
        }
        await Promise.all((await window.data.subject.list()).map(subject => window.data.subject.remove(subject.id)));
        await Promise.all(preset.map(subject => window.data.subject.add(subject)));

        presetSelectRef.current!.value = "";
        presetSelectRef.current!.blur();
    }
    
    return <div>
        <div className="subject-list">
            {subjects.map(subject => <SubjectElement key={subject.id} subject={subject} props={props} onChange={updateSubject} />)}
        </div>
        <button className="outline" onClick={addSubject}>添加</button>
        <select onChange={loadPreset} ref={presetSelectRef}>
            <option value="">加载预设 (覆盖)</option>
            {Object.entries(presets).map(([name, _]) => <option key={name} value={name}>{name}</option>)}
        </select>
    </div>
}
