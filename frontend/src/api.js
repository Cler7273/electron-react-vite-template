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

export async function apiFetch(endpoint, options = {}) {
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



// Actions
// Updated toggleTask to accept body (for manual_note on stop)
export const toggleTask = (id, action, body = {}) => 
    apiFetch(`/tasks/${id}/${action}`, { 
        method: 'POST', 
        body: JSON.stringify(body) 
    });

export const terminateTask = (id) => updateTask(id, { is_done: 1 }); // Soft Delete
export const reviveTask = (id) => updateTask(id, { is_done: 0 }); // Undo Soft Delete


// Query specific range for Calendar
export const getLogsByRange = (startStr, endStr) => apiFetch(`/tasks/logs?view=range&start=${startStr}&end=${endStr}`);

// --- TAGS & SYSTEM ---
export const getTags = () => apiFetch('/tags');
export const addTagToTask = (taskId, tagName) => apiFetch(`/tags/tasks/${taskId}`, { method: 'POST', body: JSON.stringify({ name: tagName }) });
export const removeTagFromTask = (taskId, tagName) => apiFetch(`/tasks/${taskId}/tags/${tagName}`, { method: 'DELETE' });

// --- UTILS ---
export const selectFile = () => window.nativeAPI ? window.nativeAPI.selectFile() : null;
// Add these to frontend/src/api.js for completeness, even if not used in TaskWidget.jsx
// Update getHistory to handle optional range for lazy loading
// Utility to update log notes after session is over
export const updateLog = (logId, details) => 
    apiFetch(`/history/${logId}`, { method: 'PUT', body: JSON.stringify(details) });

export const getTasks = () => apiFetch('/all');
export const getActiveSession = () => apiFetch('/tasks/active-session');
export const getHistory = (start, end) => {
    const q = (start && end) ? `?start=${start}&end=${end}` : '';
    return apiFetch(`/history${q}`);
};
// frontend/src/api.js
export const deleteLog = (logId) => apiFetch(`/history/${logId}`, { method: 'DELETE' });
export const createTask = (title) => apiFetch('/tasks', { method: 'POST', body: JSON.stringify({ title }) });
export const startTask = (id) => apiFetch(`/tasks/${id}/start`, { method: 'POST' });
export const stopTask = (id, body) => apiFetch(`/tasks/${id}/stop`, { method: 'POST', body: JSON.stringify(body) });
export const updateTask = (id, data) => apiFetch(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTask = (id) => apiFetch(`/tasks/${id}`, { method: 'DELETE' });