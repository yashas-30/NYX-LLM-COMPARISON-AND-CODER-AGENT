import { ipcMain, BrowserWindow } from 'electron';

type Result<T> = { success: true; data: T } | { success: false; error: string };

export function registerWindowHandlers(window: BrowserWindow): void {
  ipcMain.handle('window:minimize', async (): Promise<Result<null>> => {
    try {
      window.minimize();
      return { success: true, data: null };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('window:maximize', async (): Promise<Result<null>> => {
    try {
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
      return { success: true, data: null };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('window:close', async (): Promise<Result<null>> => {
    try {
      window.close();
      return { success: true, data: null };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
