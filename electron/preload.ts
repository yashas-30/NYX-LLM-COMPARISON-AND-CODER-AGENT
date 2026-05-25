import { contextBridge, ipcRenderer } from 'electron';

type Result<T> = { success: true; data: T } | { success: false; error: string };

const VALID_CHANNELS = [
  'dialog:open-directory',
  'vault:store-key',
  'vault:get-key',
  'vault:delete-key',
  'vault:list-keys',
  'window:minimize',
  'window:maximize',
  'window:close',
  'system:gpu-info',
  'system:info'
] as const;

type ValidChannel = typeof VALID_CHANNELS[number];

const api = {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  invoke: async (channel: string, ...args: any[]): Promise<Result<any>> => {
    if (!VALID_CHANNELS.includes(channel as any)) {
      throw new Error(`Blocked IPC channel: ${channel}`);
    }
    return ipcRenderer.invoke(channel, ...args);
  },
  send: (channel: string, ...args: any[]): void => {
    if (!VALID_CHANNELS.includes(channel as any)) {
      throw new Error(`Blocked IPC channel: ${channel}`);
    }
    ipcRenderer.send(channel, ...args);
  },
  onNavigate: (callback: (path: string) => void): (() => void) => {
    const handler = (_event: any, path: string) => callback(path);
    ipcRenderer.on('navigate', handler);
    return () => {
      ipcRenderer.removeListener('navigate', handler);
    };
  },
};

contextBridge.exposeInMainWorld('nyxIPC', api);
export type NyxIPC = typeof api;
