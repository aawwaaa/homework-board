import { app } from "electron";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

let config: Config = {
    autoStartup: false,
};

export function getConfig() {
    return config;
}

export function setConfig(config: Config) {
    config = config;
    for (const handler of handlers) {
        handler(config);
    }
    const p = path.join(app.getPath("userData"), "config.json");
    writeFileSync(p, JSON.stringify(config));
}

export function loadConfig() {
    const p = path.join(app.getPath("userData"), "config.json");
    if (existsSync(p)) {
        config = JSON.parse(readFileSync(p, "utf-8")) as Config;
    }
}

const handlers: ((config: Config) => void)[] = [];

export function onConfigChanged(handler: (config: Config) => void) {
    handlers.push(handler);
    return () => {
        handlers.splice(handlers.indexOf(handler), 1);
    };
}

onConfigChanged((config) => {
    // autoStartup for windows
    if (process.platform === 'win32') {
        if (config.autoStartup) {
            app.setLoginItemSettings({ openAtLogin: true });
        } else {
            app.setLoginItemSettings({ openAtLogin: false });
        }
    }

})
