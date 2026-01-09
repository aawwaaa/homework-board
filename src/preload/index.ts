import { contextBridge, ipcRenderer } from "electron";

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
  },
};

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

  cutoffAllUselessInfoInOperationLogs: "",
};

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
          return ipcRenderer.invoke(value, ...args);
        } catch (e) {
          alert(
            "在调用 " +
              value +
              " (" +
              args.map((a) => JSON.stringify(a)).join(", \n") +
              ") 时发生错误：" +
              e,
          );
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
};

ipcRenderer.on("data.changed", () => {
  onChangedHandlers.forEach((handler) => handler());
});

api.comp = <T>(uuid: string) => {
  const template = {
    invoke: "",

    init: "",
    data: "",
  };
  const api = {} as CompApi<T>;
  for (const key in template) {
    api[key] = (...args: any[]) => {
      try {
        return ipcRenderer.invoke("component.invoke", uuid, key, ...args);
      } catch (e) {
        alert(
          "在调用 " +
            "component.invoke." + uuid + "." + key +
            " (" +
            args.map((a) => JSON.stringify(a)).join(", \n") +
            ") 时发生错误：" +
            e,
        );
        throw e;
      }
    };
  }
  const handlers = [] as (() => void)[]
  api.onChanged = (handler: () => void) => {
    handler();
    handlers.push(handler);
    return () => {
      handlers.splice(handlers.indexOf(handler), 1);
    };
  };
  ipcRenderer.on("component.data.changed." + uuid, () => {
    handlers.forEach((handler) => handler());
  });
  const invokeHandlers = {} as Record<string, (...args: any[]) => any | Promise<any>>;
  api.handle = (name: string, func: (...args: any[]) => any | Promise<any>) => {
    if (invokeHandlers[name]) {
      throw new Error("Handler for " + name + " already exists");
    }
    invokeHandlers[name] = func;
  }

  ipcRenderer.on("component.invoke", (_, request, name, ...args) => {
    const handler = invokeHandlers[name];
    if (!handler) {
      ipcRenderer.send("component.invoke.reply." + request, "No handler for " + name, true);
      return;
    }
    const ret = handler(...args);
    if (ret instanceof Promise) {
      ret.then((value) => {
        ipcRenderer.send("component.invoke.reply." + request, value);
      }).catch((e) => {
        ipcRenderer.send("component.invoke.reply." + request, e, true);
      });
    } else {
      ipcRenderer.send("component.invoke.reply." + request, ret);
    }
  });

  api.data = (func?: (data: T) => void | T | Promise<void | T>) => {
    if (func) {
      const request = Math.random().toString();
      ipcRenderer.once("component.data.data." + request, async (_, data) => {
        try {
          const ret = func(data);
          let value = null as any;
          if (ret instanceof Promise) {
            value = await ret;
          } else {
            value = ret;
          }
          ipcRenderer.send("component.data.reply." + request, value ?? data);
        } catch (e) {
          ipcRenderer.send("component.data.reply." + request, data);
        }
      });
      return ipcRenderer.invoke("component.data", uuid, request);
    }
    return ipcRenderer.invoke("component.data", uuid);
  }

  return api
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("data", dataAPI);
    contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.data = dataAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
