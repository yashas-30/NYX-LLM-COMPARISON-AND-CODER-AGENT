"use strict";
const electron = require("electron");
const VALID_CHANNELS = [
  "dialog:open-directory",
  "vault:store-key",
  "vault:get-key",
  "vault:delete-key",
  "vault:list-keys",
  "window:minimize",
  "window:maximize",
  "window:close",
  "system:gpu-info",
  "system:info"
];
const api = {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  invoke: async (channel, ...args) => {
    if (!VALID_CHANNELS.includes(channel)) {
      throw new Error(`Blocked IPC channel: ${channel}`);
    }
    return electron.ipcRenderer.invoke(channel, ...args);
  },
  send: (channel, ...args) => {
    if (!VALID_CHANNELS.includes(channel)) {
      throw new Error(`Blocked IPC channel: ${channel}`);
    }
    electron.ipcRenderer.send(channel, ...args);
  },
  onNavigate: (callback) => {
    const handler = (_event, path) => callback(path);
    electron.ipcRenderer.on("navigate", handler);
    return () => {
      electron.ipcRenderer.removeListener("navigate", handler);
    };
  }
};
electron.contextBridge.exposeInMainWorld("nyxIPC", api);
