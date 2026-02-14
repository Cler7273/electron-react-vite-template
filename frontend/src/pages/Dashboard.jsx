// frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
// In Dashboard.jsx
import ShortcutWidget from '../components/ShortcutWidget';

// /!\ WARNING /!\
// This file was edited to remove all IPC calls to the main process.
// The backend server now handles all operations via REST API calls.
// Ensure the backend server is running and accessible for this to work.
// If window.electronAPI calls are found here, be careful if they are available or not.
// If not, replace them with appropriate API calls to the backend server.
/* Example replacement:

// In the same React component (e.g., KeyManager.jsx)

// No longer importing 'api' for IPC calls, as it's now for HTTP or removed.
// Access window.electronAPI directly, as it's exposed by the preload script.

const handleOpenFile = async () => {
  // Ensure window.electronAPI is available before calling its methods
  if (window.electronAPI && window.electronAPI.selectFile) {
    const filePath = await window.electronAPI.selectFile();
    if (filePath) {
      console.log('Selected file:', filePath);
    }
  } else {
    console.error("Electron API for file selection not available.");
  }
};


*/
import { getKeys, encryptFile, decryptFile, selectFile } from "../api";

function Dashboard() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [keys, setKeys] = useState([]);
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [intensity, setIntensity] = useState(10); // Default intensity

  useEffect(() => {
    getKeys().then(setKeys);
  }, []);

  const handleFileSelect = async () => {
    const path = await selectFile();
    if (path) {
      setSelectedFile({ path, name: path.split(/[/\\]/).pop() });
    }
  };

  const handleEncrypt = async () => {
    if (!selectedFile || !selectedKeyId) {
      alert('Please select a file and a key.');
      return;
    }
    const selectedKey = keys.find(k => k._id === selectedKeyId);
    await encryptFile(selectedFile.path, selectedKey, intensity);
    setSelectedFile(null); // Clear after operation
  };

  const handleDecrypt = async () => {
    if (!selectedFile || !selectedKeyId) {
      alert('Please select a file and a key.');
      return;
    }
    const selectedKey = keys.find(k => k._id === selectedKeyId);
    await decryptFile(selectedFile.path, selectedKey);
    setSelectedFile(null); // Clear after operation
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="bg-white p-6 rounded-lg shadow-lg">
        {/* File Selection */}
        <div className="mb-4">
          <button onClick={handleFileSelect} className="px-4 py-2 bg-blue-500 text-white rounded">
            Select File
          </button>
          {selectedFile && <span className="ml-4 text-gray-700">Selected: {selectedFile.name}</span>}
        </div>

        {/* Key and Intensity Selection */}
        <div className="flex items-center space-x-4 mb-6">
          <select value={selectedKeyId} onChange={(e) => setSelectedKeyId(e.target.value)} className="p-2 border rounded">
            <option value="">-- Select a Key --</option>
            {keys.map(key => <option key={key._id} value={key._id}>{key.name}</option>)}
          </select>
          <label className="flex items-center space-x-2">
            <span>Time Intensity:</span>
            <input 
              type="range" 
              min="1" 
              max="1000" 
              value={intensity} 
              onChange={(e) => setIntensity(parseInt(e.target.value))} 
              className="w-48"
            />
            <span>{intensity}</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button onClick={handleEncrypt} className="px-6 py-3 bg-green-600 text-white font-bold rounded hover:bg-green-700 disabled:bg-gray-400" disabled={!selectedFile || !selectedKeyId}>
            Encrypt
          </button>
          <button onClick={handleDecrypt} className="px-6 py-3 bg-red-600 text-white font-bold rounded hover:bg-red-700 disabled:bg-gray-400" disabled={!selectedFile || !selectedKeyId}>
            Decrypt
          </button>
        </div>
      </div>
      // Inside your render/return:
<div className="absolute top-20 left-20">
    <ShortcutWidget 
        shortcut={{ 
            title: "MPSI Drive", 
            target: "C:\\Users\\aperonylo\\Documents\\MPSI", 
            type: "url" 
        }} 
    />
</div>
<div className="absolute top-40 left-20">
    <ShortcutWidget 
        shortcut={{ 
            title: "Wolfram Alpha", 
            target: "https://www.wolframalpha.com", 
            type: "url" 
        }} 
    />
</div>
    </div>
    
  );
}

export default Dashboard;