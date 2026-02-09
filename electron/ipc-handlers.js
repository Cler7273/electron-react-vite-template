// electron/ipc-handlers.js
const { ipcMain, dialog } = require('electron');
const { IPC_CHANNELS } = require('../shared/constants');
const fileService = require('../backend/services/file-service');
const dbService = require('../backend/services/db-service');
const p2pService = require('../backend/services/p2p-service');

function setupIpcHandlers(mainWindow) {
  const notify = (message) => mainWindow.webContents.send(IPC_CHANNELS.NOTIFY_USER, message);
  const progress = (percent) => mainWindow.webContents.send(IPC_CHANNELS.NOTIFY_PROGRESS, percent);

  // File System
  ipcMain.handle(IPC_CHANNELS.FILE_SELECT, async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog();
    return canceled ? null : filePaths[0];
  });
  ipcMain.handle(IPC_CHANNELS.FILE_ENCRYPT, (evt, fp, key, intensity) => fileService.encryptFile(fp, key, intensity, progress, notify));
  ipcMain.handle(IPC_CHANNELS.FILE_DECRYPT, (evt, fp, key) => fileService.decryptFile(fp, key, progress, notify));

  // Keys
  ipcMain.handle(IPC_CHANNELS.DB_GET_KEYS, () => dbService.getKeys());
  ipcMain.handle(IPC_CHANNELS.DB_SAVE_KEY, (evt, key) => dbService.saveKey(key));
  ipcMain.handle(IPC_CHANNELS.DB_DELETE_KEY, (evt, id) => dbService.deleteKey(id));
  
  // Peers & P2P
  ipcMain.handle(IPC_CHANNELS.DB_GET_PEERS, () => dbService.getPeers());
  ipcMain.handle(IPC_CHANNELS.P2P_CREATE_SEED, (evt, name) => p2pService.createGenesisSeed(name));
  ipcMain.handle(IPC_CHANNELS.DB_ADD_PEER, (evt, name, path) => dbService.addPeer(name, path));
  ipcMain.handle(IPC_CHANNELS.P2P_SEND_FILE, (evt, peerId, fp) => p2pService.sendFile(peerId, fp, progress, notify));
}

module.exports = { setupIpcHandlers };