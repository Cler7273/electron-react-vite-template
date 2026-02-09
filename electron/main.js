// electron/main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');
// Remove the dbService import from here to prevent "app.getPath is not a function" errors
// We let the backend handle the DB entirely.

const SECRET_TOKEN = crypto.randomBytes(32).toString('hex');
let backendProcess = null;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  }
  return mainWindow;
}

function startBackend() {
  const backendPath = path.join(__dirname, '../backend/server.js');
  const userDataPath = app.getPath('userData');

  // FIXED: Use process.execPath (Electron) instead of 'node'
  // FIXED: Add ELECTRON_RUN_AS_NODE environment variable
  backendProcess = spawn(process.execPath, [backendPath, SECRET_TOKEN, userDataPath], {
    cwd: path.join(__dirname, '../backend'), 
    env: { 
      ...process.env, 
      ELECTRON_RUN_AS_NODE: '1' 
    },
    stdio: 'inherit'
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend process:', err);
  });
}
app.whenReady().then(async () => {
  startBackend();
  const mainWindow = createWindow();

  ipcMain.handle('get-secret-token', (event) => {
    if (event.sender === mainWindow.webContents) return SECRET_TOKEN;
    return null;
  });
  
  ipcMain.handle('dialog:open-file', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog();
    return canceled ? null : filePaths[0];
  });

  ipcMain.handle('dialog:save-file', async (event, options) => {
    const { canceled, filePath } = await dialog.showSaveDialog(options);
    return canceled ? null : filePath;
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('quit', () => {
  if (backendProcess) backendProcess.kill();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});