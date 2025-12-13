import { app, Menu, nativeImage, Tray } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";
import { createWindowButtomRight } from "./util";
import { compGetTray, exitEditMode } from "./comp";

const TRAY_ICON_SOURCE = "resources/icon.png";
function getTrayIconPath() {
    if (!app.isPackaged) {
        return path.join(app.getAppPath(), TRAY_ICON_SOURCE);
    }
    const packagedIcon = path.join(process.resourcesPath, "icon.png");
    if (existsSync(packagedIcon)) {
        return packagedIcon;
    }
    // Fallback for environments where the file stays inside the app directory.
    return path.join(app.getAppPath(), TRAY_ICON_SOURCE);
}

export function showSignWindow() {
    createWindowButtomRight({
        width: 450,
        height: 600,

        autoHideMenuBar: true
    }, "#/sign")
}

let tray: Tray;
export function updateTray() {
    tray.setToolTip("Homework Board")
    const menu = Menu.buildFromTemplate([
        { label: "签到", click: () => {
            showSignWindow()
        } },
        { label: "个人数据", click: () => {
            createWindowButtomRight({
                width: 530,
                height: 350,

                autoHideMenuBar: true
            }, "#/student-select")
        } },
        { label: "登录为...", click: () => {
            createWindowButtomRight({
                width: 200,
                height: 400,

                autoHideMenuBar: true
            }, "#/login")
        } },

        { type: "separator" },

        { label: "工具", submenu: [
            { label: "规划计时", click: () => {
                createWindowButtomRight({
                    width: 800,
                    height: 600,

                    autoHideMenuBar: true
                }, "#/schedule")
            } },
            { label: "统计器", click: () => {
                createWindowButtomRight({
                    width: 600,
                    height: 450,

                    autoHideMenuBar: true
                }, "#/tool/statistics")
            } },
        ] },

        { type: "separator" },

        ...compGetTray(),

        { type: "separator" },

        { label: "退出", click: () => {
            exitEditMode(false);
            app.quit()
        } }
    ])
    tray.setContextMenu(menu)
}

export function createTray() {
    tray = new Tray(nativeImage.createFromPath(getTrayIconPath()))
    updateTray()

    tray.on("click", () => {
        showSignWindow()
    })
}
