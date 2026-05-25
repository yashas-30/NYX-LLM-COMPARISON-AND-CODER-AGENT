import { ipcMain, dialog, BrowserWindow } from 'electron';

type Result<T> = { success: true; data: T } | { success: false; error: string };

export function registerDialogHandlers(window: BrowserWindow): void {
  ipcMain.handle('dialog:open-directory', async (): Promise<Result<string | null>> => {
    try {
      const result = await dialog.showOpenDialog(window, {
        properties: ['openDirectory'],
        title: 'Select Active Codebase Workspace',
      });
      return { success: true, data: result.canceled ? null : result.filePaths[0] };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
