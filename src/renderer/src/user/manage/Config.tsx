import { ChangeEvent, useEffect, useState } from 'react';
import './Config.css';

export const ManageConfigPage = () => {
    const [config, setConfig] = useState<Config>();

    useEffect(() => {
        window.api.getConfig().then(setConfig);
    }, []);

    const update = <T extends keyof Config>(key: T) => (event: ChangeEvent<HTMLInputElement>) => {
        let newConfig: Config;
        if (event.target.type === "checkbox") {
            newConfig = { ...config!, [key]: event.target.checked };
        } else {
            newConfig = { ...config!, [key]: event.target.value as unknown as Config[T] };
        }
        window.api.setConfig(newConfig);
        setConfig(newConfig);
    }

    return <div className='config'>
        <div>
            开机自启: <input type="checkbox" checked={config?.autoStartup} onChange={update("autoStartup")} />
        </div>
        <div>
            <button onClick={() => window.api.openDataDirectory()}>打开数据目录</button>
        </div>
    </div>
}