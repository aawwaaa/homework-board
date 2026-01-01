import { BrowserWindow, MenuItemConstructorOptions } from "electron";
import { updateTray } from "./tray";
import data from "./data";
import { createWindow } from "./util";
import { randomUUID } from "crypto";
import api from "./api";

const componentTypes = {
  timeline: "时间线",
  list: "列表",
  notice: "通知",
};

const componentWindows: Record<string, BrowserWindow> = {};

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
    data.component.remove(id);
  });

  componentWindows[id] = window;
}

async function redrawAllWindows() {
  redraw = true;
  Object.values(componentWindows).forEach((window) => {
    try {
      window.close();
    } catch (e) {}
  });
  Object.keys(componentWindows).forEach((key) => delete componentWindows[key]);

  const components = await data.component.list();

  for (const comp of components) {
    createWindowForComponent(comp);
  }
  redraw = false;
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
        click: async () => {
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
          await data.component.add(config);
          createWindowForComponent(config);
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
