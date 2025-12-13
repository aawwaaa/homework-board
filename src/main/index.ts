import { app, BrowserWindow } from "electron";
import { electronApp, optimizer } from "@electron-toolkit/utils";
import { createTray } from "./tray";
import { createWindow, registerApi } from "./util";
import data from "./data";
import api from "./api";
import { loadConfig } from "./config";
import { closeComponents, loadComponents } from "./comp";

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("io.aawwaaa.homeworkboard");
  loadConfig();

  registerApi(data, "data");
  registerApi(api, "api");
  data.onChanged(() => {
    const windows = BrowserWindow.getAllWindows();
    for (const window of windows) {
      window.webContents.send("data.changed");
    }
  });
  createTray();

  createWindow(
    {
      width: 800,
      height: 600,
      show: false,
      skipTaskbar: true,
      webPreferences: {},
    },
    "#/main",
  );

  loadComponents();

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  app.on("before-quit", () => {
    closeComponents();
  });
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// Handle all uncaught exceptions and rejections
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  console.error(err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, p) => {
  console.error("Unhandled Rejection at:", p, "reason:", reason);
  if (reason instanceof Error) console.error(reason.stack);
  process.exit(1);
});
