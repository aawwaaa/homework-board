import { randomId } from "@renderer/util";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import "./Identity.css";
import { UserPageProps } from "@renderer/page/UserPage";
import { Badge } from "@renderer/component/Badge";

const IdentityElement = ({identity, subjects, props: _, onChange}: {identity: Identity, subjects: Subject[], props: UserPageProps, onChange: (identity: Identity) => void}) => {
    const [role, setRole] = useState<string>(identity.role);

    const update = (key: keyof Identity) => (event: ChangeEvent<HTMLInputElement>) => {
        onChange({ ...identity, [key]: event.target.value });
    }

    const removeRole = (role: string) => {
        const newRole = identity.role.split(',').filter(r => r != role).join(',')
        onChange({ ...identity, role: newRole });
        setRole(newRole);
    }

    const addRole = (role: string) => {
        const newRole = role == "admin"? "admin": identity.role.split(',').filter(r => r != role).concat(role).join(',');
        onChange({ ...identity, role: newRole });
        setRole(newRole);
    }

    return <div className="identity-row">
        <input key={identity.id + ".name"} type="text" value={identity.name} onChange={update('name')} />
        <div className="roles">
            {role == "admin"? <span>管理员</span>: null}
            {role.split(",").map(role => subjects.find(a => a.id == role)).filter(Boolean)
                .map(subject => <Badge key={subject!.id} data={subject!} onClick={() => removeRole(subject!.id)} />)}
            <select onChange={(event) => addRole(event.target.value)}>
                <option value="">添加角色</option>
                <option value="admin">设置为管理员</option>
                {subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
        </div>
        <button className="danger" onClick={() => window.data.identity.remove(identity.id)}>删除</button>
    </div>
}

export const ManageIdentityPage = ({props}: {props: UserPageProps}) => {
    const [identities, setIdentities] = useState<Identity[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const preventUpdate = useRef(false);
    const presetSelectRef = useRef<HTMLSelectElement>(null);

    useEffect(() => {
        return window.data.onChanged(async () => {
            if (preventUpdate.current) {
                return;
            }
            const nextIdentities = await window.data.identity.list();
            setIdentities(nextIdentities);
            const nextSubjects = await window.data.subject.list();
            setSubjects(nextSubjects);
        })
    }, []);

    const updateIdentity = useCallback(async (next: Identity) => {
        preventUpdate.current = true;
        setIdentities(current => {
            const updated = current.map(subject => subject.id === next.id ? next : subject);
            return updated;
        });
        await window.data.identity.update(next);
        preventUpdate.current = false;
    }, [preventUpdate]);

    const addIdentity = () => {
        const identity = {
            id: randomId(),
            name: '新身份',
            role: '',
        } satisfies Identity;
        window.data.identity.add(identity);
    }

    const presets = subjects?.reduce((acc, subject) => {
        acc[subject.name] = [{
            id: subject.id,
            name: subject.name,
            role: subject.id,
        }];
        return acc;
    }, {} as Record<string, Identity[]>) ?? {};

    presets["所有"] = subjects.map(subject => ({
        id: subject.id,
        name: subject.name,
        role: subject.id,
    }));

    const loadPreset = async (event: ChangeEvent<HTMLSelectElement>) => {
        const preset: Identity[] = presets[event.target.value];
        if (!preset) {
            return;
        }
        // await Promise.all((await window.data.identity.list()).map(identity => window.data.identity.remove(identity.id)));
        await Promise.all(preset.map(identity => window.data.identity.add(identity)));

        presetSelectRef.current!.value = "";
        presetSelectRef.current!.blur();
    }
    
    return <div className="identity-manage">
        <div className="identity-list">
            {identities.map(identity => <IdentityElement key={identity.id} identity={identity} subjects={subjects} props={props} onChange={updateIdentity} />)}
        </div>
        <button className="outline" onClick={addIdentity}>添加</button>
        <select onChange={loadPreset} ref={presetSelectRef}>
            <option value="">加载预设</option>
            {Object.entries(presets).map(([name, _]) => <option key={name} value={name}>{name}</option>)}
        </select>
    </div>
}
