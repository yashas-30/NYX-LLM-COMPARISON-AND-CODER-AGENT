import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-shell';

export async function getPlatform(): Promise<string> {
  try {
    const { platform } = await import('@tauri-apps/plugin-os');
    return platform();
  } catch {
    return 'unknown';
  }
}

export const versions = { node: 'N/A', chrome: 'N/A', electron: 'N/A', tauri: '2.x' };

export async function showOpenDirectory(): Promise<string | null> {
  const result = await invoke<{ success: boolean; data: string | null; error?: string }>(
    'dialog_open_directory'
  );
  if (!result.success) throw new Error(result.error || 'Failed to open directory dialog');
  return result.data;
}

export async function storeVaultKey(provider: string, key: string): Promise<void> {
  const result = await invoke<{ success: boolean; error?: string }>('vault_store_key', {
    payload: { provider, key },
  });
  if (!result.success) throw new Error(result.error || 'Failed to store key');
}

export async function getVaultKey(provider: string): Promise<string | null> {
  const result = await invoke<{ success: boolean; data: string | null; error?: string }>(
    'vault_get_key',
    { payload: { provider } }
  );
  if (!result.success) throw new Error(result.error || 'Failed to get key');
  return result.data;
}

export async function deleteVaultKey(provider: string): Promise<void> {
  const result = await invoke<{ success: boolean; error?: string }>('vault_delete_key', {
    payload: { provider },
  });
  if (!result.success) throw new Error(result.error || 'Failed to delete key');
}

export async function listVaultKeys(): Promise<string[]> {
  const result = await invoke<{ success: boolean; data: string[]; error?: string }>(
    'vault_list_keys'
  );
  if (!result.success) throw new Error(result.error || 'Failed to list keys');
  return result.data || [];
}

export async function minimizeWindow(): Promise<void> {
  await invoke('window_minimize');
}
export async function maximizeWindow(): Promise<void> {
  await invoke('window_maximize');
}
export async function closeWindow(): Promise<void> {
  await invoke('window_close');
}
export async function getGpuInfo(): Promise<any> {
  const result = await invoke<{ success: boolean; data: any; error?: string }>('system_gpu_info');
  if (!result.success) throw new Error(result.error || 'Failed to get GPU info');
  return result.data;
}
export async function getSystemInfo(): Promise<any> {
  const result = await invoke<{ success: boolean; data: any; error?: string }>('system_info');
  if (!result.success) throw new Error(result.error || 'Failed to get system info');
  return result.data;
}
export async function getUserDataPath(): Promise<string> {
  const result = await invoke<{ success: boolean; data: string; error?: string }>(
    'system_get_userdata'
  );
  if (!result.success) throw new Error(result.error || 'Failed to get user data path');
  return result.data;
}
export function onNavigate(callback: (path: string) => void): () => void {
  let unlisten: UnlistenFn | undefined;
  listen<string>('navigate', (event) => {
    callback(event.payload);
  }).then((fn) => {
    unlisten = fn;
  });
  return () => {
    if (unlisten) unlisten();
  };
}
export function onModelUnload(callback: () => void): () => void {
  let unlisten: UnlistenFn | undefined;
  listen<void>('model:unload', () => {
    callback();
  }).then((fn) => {
    unlisten = fn;
  });
  return () => {
    if (unlisten) unlisten();
  };
}
export async function openExternal(url: string): Promise<void> {
  await open(url);
}
export async function getServerPorts(): Promise<{ expressPort: number; fastifyPort: number }> {
  const result = await invoke<{
    success: boolean;
    data: { express_port: number; fastify_port: number };
    error?: string;
  }>('server_get_ports');
  if (!result.success) throw new Error(result.error || 'Failed to get server ports');
  return { expressPort: result.data.express_port, fastifyPort: result.data.fastify_port };
}

export const nyxIPC = {
  getPlatform,
  versions,
  getUserDataPath,
  showOpenDirectory,
  onNavigate,
  onModelUnload,
  openExternal,
};
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
