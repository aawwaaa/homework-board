import { randomId } from "@renderer/util";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import "./Tag.css";
import { UserPageProps } from "@renderer/page/UserPage";

const presets: Record<string, AssignmentTag[]> = {
    "default": [
        {
            id: "1shou",
            name: "收",
            color: "#9CD8E6",
        },
        {
            id: "2jiang",
            name: "讲",
            color: "#F0A8FF",
        },
        {
            id: "3liu",
            name: "留",
            color: "#009900",
        }
    ]
}

const TagElement = ({tag, onChange}: {tag: AssignmentTag, props: UserPageProps, onChange: (tag: AssignmentTag) => void}) => {
    const update = (key: keyof AssignmentTag) => (event: ChangeEvent<HTMLInputElement>) => {
        onChange({ ...tag, [key]: event.target.value });
    }

    return <div className="subject-row">
        <input key={tag.id + ".name"} type="text" value={tag.name} onChange={update('name')} />
        <input key={tag.id + ".color"} type="color" value={tag.color} onChange={update('color')} />
        <button className="danger" onClick={() => window.data.tag.remove(tag.id)}>删除</button>
    </div>
}

export const ManageTagPage = ({props}: {props: UserPageProps}) => {
    const [tags, setTags] = useState<AssignmentTag[]>([]);
    const preventUpdate = useRef(false);
    const presetSelectRef = useRef<HTMLSelectElement>(null);

    useEffect(() => {
        return window.data.onChanged(async () => {
            if (preventUpdate.current) {
                return;
            }
            const nextTags = await window.data.tag.list();
            setTags(nextTags);
        })
    }, []);

    const updateTag = useCallback(async (next: AssignmentTag) => {
        preventUpdate.current = true;
        setTags(current => {
            const updated = current.map(tag => tag.id === next.id ? next : tag);
            return updated;
        });
        await window.data.tag.update(next);
        preventUpdate.current = false;
    }, [preventUpdate]);

    const addTag = () => {
        const tag = {
            id: randomId(),
            name: '新标签',
            color: '#000000',
        } satisfies AssignmentTag;
        window.data.tag.add(tag);
    }

    const loadPreset = async (event: ChangeEvent<HTMLSelectElement>) => {
        const preset: AssignmentTag[] = presets[event.target.value];
        if (!preset) {
            return;
        }
        await Promise.all((await window.data.tag.list()).map(tag => window.data.tag.remove(tag.id)));
        await Promise.all(preset.map(tag => window.data.tag.add(tag)));

        presetSelectRef.current!.value = "";
        presetSelectRef.current!.blur();
    }
    
    return <div>
        <div className="subject-list">
            {tags.map(tag => <TagElement key={tag.id} tag={tag} props={props} onChange={updateTag} />)}
        </div>
        <button className="outline" onClick={addTag}>添加</button>
        <select onChange={loadPreset} ref={presetSelectRef}>
            <option value="">加载预设 (覆盖)</option>
            {Object.entries(presets).map(([name, _]) => <option key={name} value={name}>{name}</option>)}
        </select>
    </div>
}
