// frontend/src/api.js
const API_URL = 'http://localhost:4000/api';
let SECRET_TOKEN = null;

/*export async function initializeApi() {
  // Check if nativeAPI exists (it might not if preload failed)
  if (!window.nativeAPI) {
    console.error("CRITICAL: window.nativeAPI is undefined. Preload script failed.");
    return;
  }
  
  if (!SECRET_TOKEN) {
    try {
      SECRET_TOKEN = await window.nativeAPI.getSecretToken();
      console.log("API Initialized with Token");
    } catch (e) {
      console.error("Failed to get secret token:", e);
    }
  }
}*/

export async function initializeApi() {
  // Ensure we look for nativeAPI, not electronAPI
  if (window.nativeAPI) {
    SECRET_TOKEN = await window.nativeAPI.getSecretToken();
  } else {
    console.error("nativeAPI not found. Preload failed?");
  }
}

async function apiFetch(endpoint, options = {}) {
  if (!SECRET_TOKEN) {
    // Attempt to init if missing (e.g., hot reload)
    await initializeApi(); 
    if(!SECRET_TOKEN) throw new Error('API is not initialized. Token missing.');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SECRET_TOKEN}`,
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

// Exports
export const getKeys = () => apiFetch('/keys');
export const saveKey = (keyData) => apiFetch('/keys', { method: 'POST', body: JSON.stringify(keyData) });
export const deleteKey = (keyId) => apiFetch(`/keys/${keyId}`, { method: 'DELETE' });
export const getPeers = () => apiFetch('/peers');
export const addPeer = (peerName, seedFilePath) => apiFetch('/peers', { method: 'POST', body: JSON.stringify({ peerName, seedFilePath }) });

export async function encryptFile(filePath, keyConfig, intensity) {
  const savePath = await window.nativeAPI.showSaveDialog({ defaultPath: `${filePath}.nasm` });
  if (!savePath) return { success: false, error: 'User cancelled save.' };
  return apiFetch('/encrypt', { method: 'POST', body: JSON.stringify({ filePath, keyConfig, intensity, savePath }) });
}

export async function decryptFile(filePath, keyConfig) {
  const originalName = filePath.endsWith('.nasm') ? filePath.slice(0, -5) : `${filePath}.decrypted`;
  const savePath = await window.nativeAPI.showSaveDialog({ defaultPath: originalName });
  if (!savePath) return { success: false, error: 'User cancelled save.' };
  return apiFetch('/decrypt', { method: 'POST', body: JSON.stringify({ filePath, keyConfig, savePath }) });
}

export const selectFile = () => window.nativeAPI.selectFile();