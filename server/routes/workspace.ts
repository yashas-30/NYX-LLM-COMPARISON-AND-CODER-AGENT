import { Router } from 'express';
import { getWorkspaceRoot, setWorkspaceRoot } from '../lib/paths.ts';
import { validate } from '../middleware/validate.ts';
import { workspaceSchema } from '../schemas/index.ts';

export const workspaceRouter = Router();

workspaceRouter.get('/', (req, res) => {
  res.json({ workspace: getWorkspaceRoot() });
});

workspaceRouter.post('/', validate(workspaceSchema), (req, res) => {
  const { path: newPath } = req.body;
  const success = setWorkspaceRoot(newPath);
  if (success) {
    res.json({ success: true, workspace: getWorkspaceRoot() });
  } else {
    res.status(400).json({ error: 'Directory does not exist or is invalid' });
  }
});

workspaceRouter.post('/select', async (req, res) => {
  if (process.versions.electron) {
    try {
      const { dialog } = await import('electron');
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Active Codebase Workspace'
      });
      if (!result.canceled && result.filePaths.length > 0) {
        const selectedDir = result.filePaths[0];
        setWorkspaceRoot(selectedDir);
        return res.json({ success: true, workspace: selectedDir });
      } else {
        return res.json({ success: false, message: 'Selection cancelled' });
      }
    } catch (e: any) {
      return res.status(500).json({ error: `Electron dialog error: ${e.message}` });
    }
  } else {
    return res.json({ fallback: true, message: 'Web environment: please input path manually' });
  }
});
