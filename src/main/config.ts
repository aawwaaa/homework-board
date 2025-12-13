import { app } from "electron";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

export type Config = {
  autoStartup: boolean;
  hideAll: boolean;
};

const defaultConfig: Config = {
  autoStartup: false,
  hideAll: false,
};

let config: Config = { ...defaultConfig };

export function getConfig() {
  return config;
}

export function setConfig(nextConfig: Config) {
  config = nextConfig;
  for (const handler of handlers) {
    handler(config);
  }
  const p = path.join(app.getPath("userData"), "config.json");
  writeFileSync(p, JSON.stringify(config));
}

export function loadConfig() {
  const p = path.join(app.getPath("userData"), "config.json");
  if (existsSync(p)) {
    const stored = JSON.parse(readFileSync(p, "utf-8")) as Partial<Config>;
    config = { ...defaultConfig, ...stored };
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
  if (process.platform === "win32") {
    if (config.autoStartup) {
      app.setLoginItemSettings({ openAtLogin: true });
    } else {
      app.setLoginItemSettings({ openAtLogin: false });
    }
  }
});
