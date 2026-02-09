// electron/main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { setupIpcHandlers } = require('./ipc-handlers');
const dbService = require('../backend/services/db-service');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // Security best practice
      nodeIntegration: false, // Security best practice
    },
  });

  // Load the React app.
  // In development, it loads from the Vite dev server.
  // In production, it loads the static build file.
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools(); // Open dev tools in dev mode
  }

  return mainWindow;
}


// Function to start the backend Node.js server
function startBackend() {
  const backendPath = path.join(__dirname, '../backend/server.js');
  backendProcess = spawn('node', [backendPath, SECRET_TOKEN]);

  backendProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });
}

app.whenReady().then(async () => {
  startBackend();
  // Initialize critical services before the UI loads.
  await dbService.init();
  const mainWindow = createWindow();

  // This is the new, simplified IPC handler setup.
  // It only handles things the backend CANNOT do, like show an OS dialog.
  ipcMain.handle('get-secret-token', (event) => {
    // Verify the request is coming from our window for security.
    if (event.sender === mainWindow.webContents) {
      return SECRET_TOKEN;
    }
    return null; // Deny if from an unknown source
  });
  
  ipcMain.handle('dialog:open-file', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog();
    return canceled ? null : filePaths[0];
  });

  ipcMain.handle('dialog:save-file', async (event, options) => {
    const { canceled, filePath } = await dialog.showSaveDialog(options);
    return canceled ? null : filePath;
  });
  // Activate all the backend API endpoints.
  //setupIpcHandlers(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

});
// Ensure the backend process is killed when the app quits.
app.on('quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});