// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');
const { IPC_CHANNELS } = require('../shared/constants');

contextBridge.exposeInMainWorld('electronAPI', {

    // A one-time function to securely fetch the token.
  getSecretToken: () => ipcRenderer.invoke('get-secret-token'),

  // Exposing only the necessary native dialog functions.
  selectFile: () => ipcRenderer.invoke('dialog:open-file'),
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:save-file', options),
/*
  // --- File System ---
  encryptFile: (filePath, keyConfig, intensity) => ipcRenderer.invoke(IPC_CHANNELS.FILE_ENCRYPT, filePath, keyConfig, intensity),
  decryptFile: (filePath, keyConfig) => ipcRenderer.invoke(IPC_CHANNELS.FILE_DECRYPT, filePath, keyConfig),

  // --- Key Management ---
  getKeys: () => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_KEYS),
  saveKey: (keyConfig) => ipcRenderer.invoke(IPC_CHANNELS.DB_SAVE_KEY, keyConfig),
  deleteKey: (keyId) => ipcRenderer.invoke(IPC_CHANNELS.DB_DELETE_KEY, keyId),

  // --- Peer Management ---
  getPeers: () => ipcRenderer.invoke(IPC_CHANNELS.DB_GET_PEERS),
  createGenesisSeed: (peerName) => ipcRenderer.invoke(IPC_CHANNELS.P2P_CREATE_SEED, peerName),
  addPeer: (peerName, seedPath) => ipcRenderer.invoke(IPC_CHANNELS.DB_ADD_PEER, peerName, seedPath),

  // --- P2P Communication ---
  sendFileToPeer: (peerId, filePath) => ipcRenderer.invoke(IPC_CHANNELS.P2P_SEND_FILE, peerId, filePath),
  
  // --- Event Listeners for UI updates ---
  onProgress: (callback) => ipcRenderer.on(IPC_CHANNELS.NOTIFY_PROGRESS, (_event, value) => callback(value)),
  onNotification: (callback) => ipcRenderer.on(IPC_CHANNELS.NOTIFY_USER, (_event, value) => callback(value)),

  // --- Cleanup ---
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
*/
  });

