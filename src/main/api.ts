import { app, shell } from "electron";
import { createWindowButtomRight } from "./util";
import { getConfig, setConfig } from "./config";
import { showSignWindow } from "./tray";
import { cutoffAllUselessInfoInOperationLogs } from "./data";

const isSafeExternalUrl = (raw: string) => {
    try {
        const url = new URL(String(raw));
        return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:";
    } catch {
        return false;
    }
};

const api = {
    login(identity) {
        createWindowButtomRight({
            width: 700,
            height: 600,

            autoHideMenuBar: true
        }, "#/user/" + identity)
    },
    showDetail(assignment: string) {
        createWindowButtomRight({
            width: 530,
            height: 650,

            autoHideMenuBar: true
        }, "#/assignment/" + assignment)
    },
    showStudentPage(student: string) {
        createWindowButtomRight({
            width: 700,
            height: 500,

            autoHideMenuBar: true
        }, "#/student/" + student)
    },
    showConfigWindow(component: string) {
        createWindowButtomRight({
            width: 500,
            height: 600,

            autoHideMenuBar: true
        }, "#/comp/" + component + "/config")
    },
    showSignWindow: showSignWindow,

    openExternal(url: string) {
        if (!isSafeExternalUrl(url)) {
            return;
        }
        shell.openExternal(url);
    },

    openDataDirectory() {
        const path = app.getPath("userData");
        console.log(path)
        shell.openPath(path);
    },

    async getConfig() {
        return getConfig();
    },
    async setConfig(config) {
        setConfig(config);
    },

    cutoffAllUselessInfoInOperationLogs: cutoffAllUselessInfoInOperationLogs
} as API

export default api;
