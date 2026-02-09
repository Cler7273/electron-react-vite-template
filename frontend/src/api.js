// frontend/src/api.js
// This provides a clean interface for React components.

/*export const api = {
  selectFile: () => window.electronAPI.selectFile(),
  encryptFile: (path, key, intensity) => window.electronAPI.encryptFile(path, key, intensity),
  decryptFile: (path, key) => window.electronAPI.decryptFile(path, key),

  getKeys: () => window.electronAPI.getKeys(),
  saveKey: (key) => window.electronAPI.saveKey(key),
  deleteKey: (id) => window.electronAPI.deleteKey(id),
  
  getPeers: () => window.electronAPI.getPeers(),
  createGenesisSeed: (name) => window.electronAPI.createGenesisSeed(name),
  addPeer: (name, path) => window.electronAPI.addPeer(name, path),
  
  sendFileToPeer: (id, path) => window.electronAPI.sendFileToPeer(id, path),
  
  onProgress: (callback) => window.electronAPI.onProgress(callback),
  onNotification: (callback) => window.electronAPI.onNotification(callback),
  
  cleanup: (channel) => window.electronAPI.removeAllListeners(channel),
};*/
// frontend/src/api.js
const API_URL = 'http://localhost:4000/api';
let SECRET_TOKEN = null;

// This must be called once when the application starts.
export async function initializeApi() {
  if (!SECRET_TOKEN) {
    SECRET_TOKEN = await window.nativeAPI.getSecretToken();
  }
}

// A helper to handle all fetch requests, adding headers and parsing JSON.
async function apiFetch(endpoint, options = {}) {
  if (!SECRET_TOKEN) throw new Error('API is not initialized. Call initializeApi() first.');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SECRET_TOKEN}`,
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

// --- The New API, now using HTTP ---

// Keys
export const getKeys = () => apiFetch('/keys');
export const saveKey = (keyData) => apiFetch('/keys', { method: 'POST', body: JSON.stringify(keyData) });
export const deleteKey = (keyId) => apiFetch(`/keys/${keyId}`, { method: 'DELETE' });

// Peers
export const getPeers = () => apiFetch('/peers');
export const addPeer = (peerName, seedFilePath) => apiFetch('/peers', { method: 'POST', body: JSON.stringify({ peerName, seedFilePath }) });

// File Operations
export async function encryptFile(filePath, keyConfig, intensity) {
  // We still need the native dialog to ask the user WHERE to save.
  const savePath = await window.nativeAPI.showSaveDialog({ defaultPath: `${filePath}.nasm` });
  if (!savePath) return { success: false, error: 'User cancelled save.' };

  return apiFetch('/encrypt', {
    method: 'POST',
    body: JSON.stringify({ filePath, keyConfig, intensity, savePath }) // Backend needs to know where to save
  });
}
export async function decryptFile(filePath, keyConfig) {
  const originalName = filePath.endsWith('.nasm') ? filePath.slice(0, -5) : `${filePath}.decrypted`;
  const savePath = await window.nativeAPI.showSaveDialog({ defaultPath: originalName });
    if (!savePath) return { success: false, error: 'User cancelled save.' };
    return apiFetch('/decrypt', {
    method: 'POST',
    body: JSON.stringify({ filePath, keyConfig, savePath }) // Backend needs to know where to save
  });
}


// The native API calls are now exposed directly.
export const selectFile = () => window.nativeAPI.selectFile();