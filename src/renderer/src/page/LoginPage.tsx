import { useEffect, useState } from "react";
import { Identity } from "..";

import "./LoginPage.css";

export const LoginPage: React.FC = () => {
    const [identities, setIdentities] = useState<Identity[]>([]);

    useEffect(() => {
        let mounted = true;

        const loadIdentities = async () => {
            const list = await window.data.identity.list();
            if (mounted) {
                setIdentities(list);
            }
        };

        loadIdentities();
        const dispose = window.data.onChanged(() => {
            loadIdentities();
        });

        return () => {
            mounted = false;
            dispose?.();
        };
    }, []);

    const login = (identity: Identity) => {
        window.api.login(identity.id);
        window.close();
    };

    return (
        <div className="login-page">
            <div className="identity-list" role="list">
                {identities.map((identity) => (
                    <button
                        type="button"
                        className="identity-button"
                        key={identity.id}
                        onClick={() => login(identity)}
                        aria-label={`使用 ${identity.name} 登录`}
                    >
                        {identity.name}
                    </button>
                ))}
            </div>
        </div>
    );
};
