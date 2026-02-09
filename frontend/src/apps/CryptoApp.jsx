import React, { useState, useEffect } from 'react';
import { getKeys, encryptFile, decryptFile, selectFile } from '../api';

function CryptoApp() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [keys, setKeys] = useState([]);
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [intensity, setIntensity] = useState(10);
  const [status, setStatus] = useState('');

  useEffect(() => {
    getKeys().then(setKeys).catch(console.error);
  }, []);

  const handleFileSelect = async () => {
    const path = await selectFile();
    if (path) {
      setSelectedFile({ path, name: path.split(/[/\\]/).pop() });
      setStatus('');
    }
  };

  const process = async (action) => {
    if (!selectedFile || !selectedKeyId) return;
    setStatus('Processing...');
    
    const selectedKey = keys.find(k => k._id === selectedKeyId);
    let result;
    
    try {
      if (action === 'encrypt') {
        result = await encryptFile(selectedFile.path, selectedKey, intensity);
      } else {
        result = await decryptFile(selectedFile.path, selectedKey);
      }
      
      if (result.success) setStatus(`Success! Saved to: ${result.path}`);
      else setStatus(`Error: ${result.error}`);
      
      setSelectedFile(null); 
    } catch (e) {
      setStatus('Critical Error');
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      {/* File Selector */}
      <div className="p-4 bg-white rounded border border-gray-300">
        <button onClick={handleFileSelect} className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
          {selectedFile ? 'Change File' : 'Select File to Process'}
        </button>
        {selectedFile && <p className="mt-2 text-sm text-center font-mono">{selectedFile.name}</p>}
      </div>

      {/* Controls */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-500 uppercase">1. Choose Key</label>
        <select 
          value={selectedKeyId} 
          onChange={(e) => setSelectedKeyId(e.target.value)} 
          className="w-full p-2 border rounded bg-white"
        >
          <option value="">-- Select NASM Key --</option>
          {keys.map(k => <option key={k._id} value={k._id}>{k.name}</option>)}
        </select>

        <label className="text-xs font-bold text-gray-500 uppercase mt-2 block">2. Time Intensity (Encryption only)</label>
        <div className="flex items-center space-x-2">
          <input 
            type="range" min="1" max="1000" 
            value={intensity} onChange={(e) => setIntensity(parseInt(e.target.value))} 
            className="flex-1"
          />
          <span className="font-mono text-sm">{intensity}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        <button 
          onClick={() => process('encrypt')} 
          disabled={!selectedFile || !selectedKeyId}
          className="py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 disabled:opacity-50"
        >
          ENCRYPT
        </button>
        <button 
          onClick={() => process('decrypt')} 
          disabled={!selectedFile || !selectedKeyId}
          className="py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:opacity-50"
        >
          DECRYPT
        </button>
      </div>

      {status && <div className="p-2 bg-yellow-100 text-yellow-800 text-xs rounded break-all">{status}</div>}
    </div>
  );
}

export default CryptoApp;