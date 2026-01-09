import { app, ipcMain, shell } from "electron";
import { createWindowButtomRight } from "./util";
import { getConfig, setConfig } from "./config";
import { showSignWindow } from "./tray";
import { cutoffAllUselessInfoInOperationLogs } from "./data";
import { compApi } from "./comp";

const isSafeExternalUrl = (raw: string) => {
  try {
    const url = new URL(String(raw));
    return (
      url.protocol === "http:" ||
      url.protocol === "https:" ||
      url.protocol === "mailto:"
    );
  } catch {
    return false;
  }
};

const api = {
  login(identity) {
    createWindowButtomRight(
      {
        width: 700,
        height: 600,

        autoHideMenuBar: true,
      },
      "#/user/" + identity,
    );
  },
  showDetail(assignment: string) {
    createWindowButtomRight(
      {
        width: 530,
        height: 650,

        autoHideMenuBar: true,
      },
      "#/assignment/" + assignment,
    );
  },
  showStudentPage(student: string) {
    createWindowButtomRight(
      {
        width: 700,
        height: 500,

        autoHideMenuBar: true,
      },
      "#/student/" + student,
    );
  },
  showConfigWindow(component: string) {
    createWindowButtomRight(
      {
        width: 500,
        height: 600,

        autoHideMenuBar: true,
      },
      "#/comp/" + component + "/config",
    );
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
    console.log(path);
    shell.openPath(path);
  },

  async getConfig() {
    return getConfig();
  },
  async setConfig(config) {
    setConfig(config);
  },

  cutoffAllUselessInfoInOperationLogs: cutoffAllUselessInfoInOperationLogs,

  comp: compApi,
} as API;

ipcMain.handle("component.invoke", (_, id, name, ...args) => {
  const api = compApi(id);
  return api[name](...args);
});
ipcMain.handle("component.data", (event, id, request) => {
  const api = compApi(id);
  return api.data(request? (data) => new Promise(resolve => {
    event.sender.send("component.data.data." + request, data);
    ipcMain.once("component.data.reply." + request, (_, value) => {
      resolve(value);
    });
  }): undefined)
});

export default api;
