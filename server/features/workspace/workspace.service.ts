import { getWorkspaceRoot, setWorkspaceRoot } from '../../lib/paths.ts';

export class WorkspaceService {
  getWorkspace() {
    return getWorkspaceRoot();
  }

  setWorkspace(newPath: string) {
    return setWorkspaceRoot(newPath);
  }

  async selectWorkspace() {
    if (process.versions.electron) {
      const { dialog } = await import('electron');
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Active Codebase Workspace'
      });
      if (!result.canceled && result.filePaths.length > 0) {
        const selectedDir = result.filePaths[0];
        setWorkspaceRoot(selectedDir);
        return { success: true, workspace: selectedDir };
      }
      return { success: false, message: 'Selection cancelled' };
    }
    return { fallback: true, message: 'Web environment: please input path manually' };
  }
}
