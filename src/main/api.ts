import { app, shell } from "electron";
import { createWindowButtomRight } from "./util";
import { getConfig, setConfig } from "./config";

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
            width: 500,
            height: 600,

            autoHideMenuBar: true
        }, "#/assignment/" + assignment)
    },

    showConfigWindow(component: string) {
        createWindowButtomRight({
            width: 500,
            height: 600,

            autoHideMenuBar: true
        }, "#/comp/" + component + "/config")
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
} as API

export default api;