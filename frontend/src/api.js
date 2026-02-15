// frontend/src/api.js
const API_URL = 'http://localhost:4000/api';
let SECRET_TOKEN = null;

export async function initializeApi() {
  if (window.nativeAPI) {
    SECRET_TOKEN = await window.nativeAPI.getSecretToken();
  } else {
    console.warn("nativeAPI not found. Running in browser mode or preload failed.");
  }
}

async function apiFetch(endpoint, options = {}) {
  if (!SECRET_TOKEN) await initializeApi();
  
  // Fallback for development if token is still missing
  const headers = {
    'Content-Type': 'application/json',
    ...(SECRET_TOKEN ? { 'Authorization': `Bearer ${SECRET_TOKEN}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

// --- TASKS CORE ---
export const getTasks = () => apiFetch('/all'); // Expects { tasks: [] }
export const createTask = (title) => apiFetch('/tasks', { method: 'POST', body: JSON.stringify({ title }) });

// Actions
// Updated toggleTask to accept body (for manual_note on stop)
export const toggleTask = (id, action, body = {}) => 
    apiFetch(`/tasks/${id}/${action}`, { 
        method: 'POST', 
        body: JSON.stringify(body) 
    });
export const updateTask = (id, data) => apiFetch(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }); 
export const terminateTask = (id) => updateTask(id, { is_done: 1 }); // Soft Delete
export const reviveTask = (id) => updateTask(id, { is_done: 0 }); // Undo Soft Delete
export const deleteTask = (id) => apiFetch(`/tasks/${id}`, { method: 'DELETE' }); // Hard Delete

// --- HISTORY & LOGS ---
export const getHistory = () => apiFetch('/history');
// Query specific range for Calendar
export const getLogsByRange = (startStr, endStr) => apiFetch(`/tasks/logs?view=range&start=${startStr}&end=${endStr}`);

// --- TAGS & SYSTEM ---
export const getTags = () => apiFetch('/tags');
export const addTagToTask = (taskId, tagName) => apiFetch(`/tags/tasks/${taskId}`, { method: 'POST', body: JSON.stringify({ name: tagName }) });
export const removeTagFromTask = (taskId, tagName) => apiFetch(`/tasks/${taskId}/tags/${tagName}`, { method: 'DELETE' });

// --- UTILS ---
export const selectFile = () => window.nativeAPI ? window.nativeAPI.selectFile() : null;