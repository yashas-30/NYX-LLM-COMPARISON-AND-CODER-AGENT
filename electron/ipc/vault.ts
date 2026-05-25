import { ipcMain, safeStorage, dialog, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

type Result<T> = { success: true; data: T } | { success: false; error: string };

const StoreKeySchema = z.object({ provider: z.string().min(1), key: z.string().min(1) });
const GetKeySchema = z.object({ provider: z.string().min(1) });
const DeleteKeySchema = z.object({ provider: z.string().min(1) });

const VAULT_FILE_PATH = path.join(app.getPath('userData'), 'secure-vault.json');

// Helper to check safeStorage availability with strict native fallback behavior
function checkEncryptionSafety(): boolean {
  if (!safeStorage.isEncryptionAvailable()) {
    const choice = dialog.showMessageBoxSync({
      type: 'error',
      title: 'Keychain Access Required',
      message: 'NYX needs access to your system keychain to securely store API keys.',
      buttons: ['Open System Settings', 'Quit App'],
      defaultId: 1,
      cancelId: 1,
    });
    if (choice === 0) {
      if (process.platform === 'win32') {
        require('electron').shell.openExternal('ms-settings:privacy-credentialmanager');
      } else if (process.platform === 'darwin') {
        require('electron').shell.openExternal('x-apple.systempreferences:com.apple.preference.security');
      }
    }
    app.quit();
    process.exit(1);
    return false;
  }
  return true;
}

function loadVault(): Record<string, string> {
  try {
    if (fs.existsSync(VAULT_FILE_PATH)) {
      return JSON.parse(fs.readFileSync(VAULT_FILE_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to read vault file:', err);
  }
  return {};
}

function saveVault(data: Record<string, string>): void {
  try {
    fs.writeFileSync(VAULT_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write vault file:', err);
  }
}

export function registerVaultHandlers(): void {
  ipcMain.handle('vault:store-key', async (_event, raw): Promise<Result<null>> => {
    checkEncryptionSafety();
    try {
      const { provider, key } = StoreKeySchema.parse(raw);
      const encryptedBuffer = safeStorage.encryptString(key);
      const encryptedHex = encryptedBuffer.toString('hex');
      
      const vault = loadVault();
      vault[provider] = encryptedHex;
      saveVault(vault);
      return { success: true, data: null };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('vault:get-key', async (_event, raw): Promise<Result<string | null>> => {
    checkEncryptionSafety();
    try {
      const { provider } = GetKeySchema.parse(raw);
      const vault = loadVault();
      const encryptedHex = vault[provider];
      if (!encryptedHex) {
        return { success: true, data: null };
      }
      const encryptedBuffer = Buffer.from(encryptedHex, 'hex');
      const decrypted = safeStorage.decryptString(encryptedBuffer);
      return { success: true, data: decrypted };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('vault:delete-key', async (_event, raw): Promise<Result<null>> => {
    checkEncryptionSafety();
    try {
      const { provider } = DeleteKeySchema.parse(raw);
      const vault = loadVault();
      if (vault[provider]) {
        delete vault[provider];
        saveVault(vault);
      }
      return { success: true, data: null };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle('vault:list-keys', async (): Promise<Result<string[]>> => {
    checkEncryptionSafety();
    try {
      const vault = loadVault();
      return { success: true, data: Object.keys(vault) };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
