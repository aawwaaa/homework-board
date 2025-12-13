import { contextBridge, ipcRenderer } from 'electron'

const dataAPITemplate = {
  assignment: {
    get: "",
    list: "",
    create: "",
    modify: "",
    remove: "",
  },
  student: {
    list: "",
    add: "",
    update: "",
    remove: "",
    clear: "",
  },
  submission: {
    create: "",
    list: "",
    within: "",
  },
  tag: {
    list: "",
    add: "",
    update: "",
    remove: "",
  },
  progress: {
    update: "",
    within: "",
  },
  operation: {
    list: "",
    undo: "",
    redo: "",
  },
  subject: {
    list: "",
    add: "",
    update: "",
    remove: "",
  },
  identity: {
    get: "",
    list: "",
    add: "",
    update: "",
    remove: "",
  },
  component: {
    list: "",
    get: "",
    add: "",
    update: "",
    remove: "",
  },
  day: {
    get: "",
  },
  database: {
    execute: "",
    all: "",
  }
}

const apiTemplate = {
  login: "",
  showDetail: "",
  showStudentPage: "",
  showConfigWindow: "",
  showSignWindow: "",

  openExternal: "",
  
  openDataDirectory: "",

  getConfig: "",
  setConfig: "",

  cutoffAllUselessInfoInOperationLogs: ""
}

const dataAPI = {} as DataAPI;
const api = {} as API;

function iter(obj: any, target: any, path: string[] = []) {
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "object") {
      target[key] = {};
      iter(value, target[key], [...path, key]);
    } else {
      const value = [...path, key].join(".");
      target[key] = (...args: any[]) => {
        try {
          return ipcRenderer.invoke(value, ...args)
        } catch (e) {
          alert("在调用 " + value + " (" + args.map(a => JSON.stringify(a)).join(", \n") + ") 时发生错误：" + e);
          throw e;
        }
      };
    }
  }
}

iter(dataAPITemplate, dataAPI, ["data"]);
iter(apiTemplate, api, ["api"]);

const onChangedHandlers = new Set<() => void>();

dataAPI.onChanged = (handler: () => void) => {
  handler();
  onChangedHandlers.add(handler);
  return () => {
    onChangedHandlers.delete(handler);
  };
}

ipcRenderer.on("data.changed", () => {
  onChangedHandlers.forEach(handler => handler());
});

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('data', dataAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.data = dataAPI
  // @ts-ignore (define in dts)
  window.api = api
}
