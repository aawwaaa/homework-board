import { is } from "@electron-toolkit/utils"
import { BrowserWindow, BrowserWindowConstructorOptions, ipcMain, screen } from "electron"
import { join } from "path"

export function createWindow(options: BrowserWindowConstructorOptions, hash = "#/"): BrowserWindow {
  // Create the browser window.
  options.webPreferences ??= {}
  options.webPreferences.preload = join(__dirname, '../preload/index.js')

  const window = new BrowserWindow(options)

  if (options.show !== false)
    window.on('ready-to-show', () => {
      window.show()
    })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'] + hash)
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'), { hash })
  }
  return window;
}

export function createWindowButtomRight(options: BrowserWindowConstructorOptions, hash?: string): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().size;
  options.x = width - (options.width ?? 800);
  options.y = height - (options.height ?? 600) + (process.platform == "win32"? -32: 0); // windows "feature"
  return createWindow(options, hash);
}

export function registerApi(api: any, prefix: string) {
  for (const [key, value] of Object.entries(api)) {
    if (typeof value === "function") {
      ipcMain.handle(prefix + "." + key, (_e, ...args) => value(...args));
    } else {
      registerApi(value, prefix + "." + key);
    }
  }
}