import { BrowserWindow, ipcMain, MenuItemConstructorOptions } from "electron";
import { updateTray } from "./tray";
import data, { dataPath } from "./data";
import { createWindow } from "./util";
import { randomUUID } from "crypto";
import api from "./api";
import { access, mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

const componentTypes = {
  timeline: "时间线",
  list: "列表",
  notice: "通知",
  "scheduled-notice": "定时通知",
  memorize: "记忆",
};

const componentWindows: Record<string, BrowserWindow> = {};
const componentApis: Record<string, CompApi<any>> = {};

let editingMode = false;
let hideAll = false;

api.getConfig().then((config) => {
  hideAll = config.hideAll;
  updateHideAll();
});

export function isEditingMode() {
  return editingMode;
}

function updateVisible(window: BrowserWindow) {
  if (hideAll) {
    window.hide();
  } else {
    window.show();
  }
}

function updateHideAll() {
  Object.values(componentWindows).forEach(updateVisible);
}

let redraw: boolean = false;
let adjusting: number = Date.now();

function createWindowForComponent(comp: ComponentConfig) {
  const { id, x, y, width, height } = comp;
  const window = createWindow(
    {
      x,
      y: !editingMode? process.platform == "win32"? y: y - 30: y,
      width,
      height: !editingMode? process.platform == "win32"? height: height + 30: height,
      frame: process.platform == "win32"? true: editingMode,
      show: false,
      resizable: editingMode,
      movable: editingMode,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,

      transparent: !editingMode,
      skipTaskbar: !editingMode,
      autoHideMenuBar: true,
      focusable: editingMode,
    },
    "#/comp/" + id + (editingMode ? "/edit" : ""),
  );
  adjusting = Date.now() + 1000;

  window.setIgnoreMouseEvents(!editingMode);

  window.on("ready-to-show", () => {
    updateVisible(window);
  });

  const remove = data.onChanged(async () => {
    if (adjusting > Date.now()) return;
    adjusting = Date.now() + 5;
    const latest = await data.component.get(id);
    window.setPosition(latest.x, !editingMode? process.platform == "win32"? latest.y: latest.y - 30: latest.y)
    window.setSize(latest.width, !editingMode? process.platform == "win32"? latest.height: latest.height + 30: latest.height)
  })
  window.on("resize", async () => {
    if (!editingMode) return;
    if (adjusting > Date.now()) return;
    const latest = await data.component.get(id);
    const { width, height } = window.getBounds();
    adjusting = Date.now() + 5;
    await data.component.update({
      ...latest,
      width,
      height,
    });
  });
  window.on("move", async () => {
    if (!editingMode) return;
    if (adjusting > Date.now()) return;
    const latest = await data.component.get(id);
    const { x, y } = window.getBounds();
    adjusting = Date.now() + 5;
    await data.component.update({
      ...latest,
      x,
      y: y // Math.max(0, y - 30), // windows
    });
  });
  window.on("close", () => {
    remove();
    if (redraw) return;
    if (!editingMode) return;
    removeComponent(id)
  });

  componentWindows[id] = window;
  componentApis[id] = createCompApi(id, window);
}

const componentData = path.join(dataPath, "components");

async function createComponent(config: ComponentConfig) {
  await data.component.add(config);
  try {
    await access(componentData)
  } catch (_) {
    await mkdir(componentData)
  }
  await writeFile(path.join(componentData, config.id + ".json"), "{}");
  createWindowForComponent(config);
}

async function removeComponent(id: string) {
  delete componentWindows[id];
  delete componentApis[id];
  try {
    await unlink(path.join(componentData, id + ".json"))
  } catch (_) {}
  await data.component.remove(id);
}

async function redrawAllWindows() {
  redraw = true;
  Object.values(componentWindows).forEach((window) => {
    try {
      window.close();
    } catch (e) {}
  });
  Object.keys(componentWindows).forEach((key) => {
    delete componentWindows[key]
    delete componentApis[key]
  });

  const components = await data.component.list();

  for (const comp of components) {
    createWindowForComponent(comp);
  }
  redraw = false;
}

function createCompApi(uuid: string, window: BrowserWindow): CompApi<any> {
  let dataCache = null as any;
  const dataPath = path.join(componentData, uuid + ".json");
  const handlers = [] as Array<() => void>;
  async function withData() {
    if (dataCache) return true;
    try {
      dataCache = JSON.parse(await readFile(dataPath, "utf-8"));
      return true;
    } catch (_) {
      dataCache = {};
      return false;
    }
  }
  async function writeData() {
    if (!dataCache) return;
    await writeFile(dataPath, JSON.stringify(dataCache));
    handlers.forEach((handler) => handler());
  }
  handlers.push(() => {
    const windows = BrowserWindow.getAllWindows();
    for (const window of windows) {
      window.webContents.send("component.data.changed." + uuid);
    }
  })
  return {
    invoke: (name: string, ...args: any[]): Promise<any> => {
      const id = randomUUID();
      window.webContents.send("component.invoke", id, name, ...args);
      return new Promise((resolve, reject) => {
        ipcMain.once("component.invoke.reply." + id, (_, value, isError) => {
          if (isError) {
            reject(value);
          } else {
            resolve(value);
          }
        });
      });
    },
    handle: function (_name: string, _func: (...args: any[]) => any): void {
      throw new Error("Use in isolate!");
    },
    onChanged: function (func: () => void): () => void {
      handlers.push(func);
      return () => {
        handlers.splice(handlers.indexOf(func), 1);
      };
    },
    init: async function (data: any): Promise<void> {
      if (await withData()) return;
      dataCache = data;
      await writeData();
    },
    data: async function (func?: (data: any) => void | any | Promise<void | any>): Promise<any> {
      await withData()
      if (func) {
        const ret = func(dataCache);
        if (ret instanceof Promise) dataCache = (await ret) ?? dataCache;
        else if (typeof ret === "object") dataCache = ret;
        await writeData();
      }
      return dataCache;
    }
  }
}

export function compApi<T>(uuid: string): CompApi<T> {
  return componentApis[uuid];
}

export function compGetTray(): Array<MenuItemConstructorOptions> {
  if (!editingMode)
    return [
      {
        label: "进入编辑模式",
        click: () => {
          editingMode = true;
          redrawAllWindows();
          updateTray();
        },
      },
      {
        label: "隐藏所有组件",
        type: "checkbox",
        checked: hideAll,
        click: async () => {
          hideAll = !hideAll;
          updateHideAll();
          updateTray();
          const config = await api.getConfig();
          await api.setConfig({ ...config, hideAll });
        },
      },
    ];
  return [
    {
      label: "退出编辑模式",
      click: () => {
        editingMode = false;
        redrawAllWindows();
        updateTray();
      },
    },
    {
      label: "添加组件",
      submenu: Object.entries(componentTypes).map(([type, name]) => ({
        label: name,
        click: () => {
          const id = randomUUID();
          const config = {
            id: id,
            type,
            x: 100,
            y: 100,
            width: 200,
            height: 200,
            config: {},
          };
          createComponent(config);
        },
      })),
    },
  ];
}

export function loadComponents() {
  redrawAllWindows();
}

export function exitEditMode(redraw = true) {
  editingMode = false;
  if (redraw) redrawAllWindows();
  updateTray();
}

export function closeComponents() {
  redraw = true;
  Object.values(componentWindows).forEach((window) => {
    try {
      window.close();
    } catch (e) {}
  });
}
