import { BrowserWindow, MenuItemConstructorOptions } from "electron";
import { updateTray } from "./tray";
import data from "./data";
import { createWindow } from "./util";
import { randomUUID } from "crypto";
import api from "./api";

const componentTypes = {
    "timeline": "时间线",
    "list": "列表",
    "notice": "通知",
}

const componentWindows: Record<string, BrowserWindow> = {};

let editingMode = false;
let hideAll = false;

api.getConfig().then(config => {
    hideAll = config.hideAll
    updateHideAll()
})

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

function createWindowForComponent(comp: ComponentConfig) {
    const {id, x, y, width, height} = comp;
    const window = createWindow({
        x, y: process.platform == "win32" && editingMode? y - 32: y, width, height, // windows "feature"
        frame: editingMode,
        show: false,
        resizable: editingMode,
        movable: editingMode,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,

        transparent: !editingMode,
        skipTaskbar: !editingMode,
        useContentSize: true,
        autoHideMenuBar: true,
        focusable: editingMode,
    }, "#/comp/" + id + (editingMode? "/edit": ""))

    window.setIgnoreMouseEvents(!editingMode)

    window.on("ready-to-show", () => {
        updateVisible(window)
    })

    window.on("resize", async () => {
        if (!editingMode) return;
        const latest = await data.component.get(id);
        const {width, height} = window.getContentBounds();
        data.component.update({
            ...latest,
            width,
            height,
        })
    })
    window.on("move", async () => {
        if (!editingMode) return;
        const latest = await data.component.get(id);
        const {x, y} = window.getContentBounds();
        data.component.update({
            ...latest,
            x,
            y,
        })
    })
    window.on("close", () => {
        if (redraw) return;
        if (!editingMode) return;
        data.component.remove(id);
    })

    componentWindows[id] = window;
}

async function redrawAllWindows() {
    redraw = true;
    Object.values(componentWindows).forEach(window => {
        try {window.close()} catch (e) {}
    });
    Object.keys(componentWindows).forEach(key => delete componentWindows[key]);

    const components = await data.component.list()

    for (const comp of components) {
        createWindowForComponent(comp);
    }
    redraw = false;
}

export function compGetTray(): Array<MenuItemConstructorOptions> {
    if (!editingMode) return [
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
                const config = await api.getConfig()
                await api.setConfig({...config, hideAll})
            },
        }
    ];
    return [
        {
            label: "退出编辑模式",
            click: () => {
                editingMode = false;
                redrawAllWindows();
                updateTray();
            }
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
                    await data.component.add(config)
                    createWindowForComponent(config)
                }
            }))
        }
    ]
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
    Object.values(componentWindows).forEach(window => {
        try {window.close()} catch (e) {}
    });
}

