const { contextBridge, ipcRenderer } = require('electron');

// We define constants here to avoid "module not found" errors with relative paths during dev
const IPC_CHANNELS = {
  // File operations
  FILE_SELECT: 'file:select',
  FILE_ENCRYPT: 'file:encrypt',
  FILE_DECRYPT: 'file:decrypt',
  // Database
  DB_GET_KEYS: 'db:get-keys',
  DB_SAVE_KEY: 'db:save-key',
  DB_DELETE_KEY: 'db:delete-key',
  DB_GET_PEERS: 'db:get-peers',
  DB_ADD_PEER: 'db:add-peer',
  // P2P
  P2P_CREATE_SEED: 'p2p:create-seed',
  P2P_SEND_FILE: 'p2p:send-file',
  // Notifications
  NOTIFY_USER: 'notify:user',
  NOTIFY_PROGRESS: 'notify:progress',
};


contextBridge.exposeInMainWorld('nativeAPI', {
  // Security
  getSecretToken: () => ipcRenderer.invoke('get-secret-token'),
  
  // Dialogs
  selectFile: () => ipcRenderer.invoke('dialog:open-file'),
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:save-file', options),

  // Events
  onProgress: (callback) => ipcRenderer.on(IPC_CHANNELS.NOTIFY_PROGRESS, (_event, value) => callback(value)),
  onNotification: (callback) => ipcRenderer.on(IPC_CHANNELS.NOTIFY_USER, (_event, value) => callback(value)),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});