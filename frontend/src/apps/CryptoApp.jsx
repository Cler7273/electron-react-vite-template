import React, { useState, useEffect } from 'react';

const TabButton = ({ active, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors
      ${active ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
  >
    {label}
  </button>
);

const CryptoApp = () => {
  const [tab, setTab] = useState('process'); // 'process' or 'vault'
  const [keys, setKeys] = useState([]);
  
  // Process State
  const [mode, setMode] = useState('encrypt'); // 'encrypt' or 'decrypt'
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [filePath, setFilePath] = useState('');
  const [intensity, setIntensity] = useState(10);
  const [status, setStatus] = useState({ msg: '', type: '' });

  // Init
  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
        const token = await window.nativeAPI.getSecretToken();
        const res = await fetch('http://localhost:4000/api/keys', { headers: { 'Authorization': `Bearer ${token}` } });
        setKeys(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleSelectFile = async () => {
    const path = await window.nativeAPI.selectFile();
    if (path) setFilePath(path);
  };

  const execute = async () => {
    if (!filePath || !selectedKeyId) {
        setStatus({ msg: 'Missing File or Key', type: 'error' });
        return;
    }
    
    setStatus({ msg: 'Processing...', type: 'info' });
    const token = await window.nativeAPI.getSecretToken();
    const keyConfig = keys.find(k => k._id === selectedKeyId);
    
    // 1. Get Save Path
    const defaultName = mode === 'encrypt' ? `${filePath}.nasm` : filePath.replace('.nasm', '.dec');
    const savePath = await window.nativeAPI.showSaveDialog({ defaultPath: defaultName });
    if (!savePath) {
        setStatus({ msg: 'Cancelled', type: 'info' });
        return;
    }

    // 2. Execute
    try {
        const endpoint = mode === 'encrypt' ? '/api/encrypt' : '/api/decrypt';
        const res = await fetch(`http://localhost:4000${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ filePath, keyConfig, intensity, savePath })
        });
        const data = await res.json();
        
        if (data.success) setStatus({ msg: `Done! Saved to ${savePath.split(/[/\\]/).pop()}`, type: 'success' });
        else setStatus({ msg: data.error || 'Failed', type: 'error' });
    } catch (e) {
        setStatus({ msg: e.message, type: 'error' });
    }
  };

  // --- SUB-COMPONENT: VAULT ---
  const KeyVault = () => {
      const [newKeyName, setNewKeyName] = useState("");

      const createKey = async () => {
          // Simplified Key Gen for UX
          const newKey = {
              name: newKeyName || "New Key",
              d: 2, minBound: 32, maxBound: 126,
              starts: [10, 20], I: [['a', '+1']], TC: [1, 2] // Default basic NASM config
          };
          const token = await window.nativeAPI.getSecretToken();
          await fetch('http://localhost:4000/api/keys', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(newKey)
          });
          setNewKeyName("");
          fetchKeys();
      };

      const deleteKey = async (id) => {
          const token = await window.nativeAPI.getSecretToken();
          await fetch(`http://localhost:4000/api/keys/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
          fetchKeys();
      };

      return (
          <div className="space-y-4">
              <div className="flex gap-2">
                  <input 
                    className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                    placeholder="Key Name..." 
                    value={newKeyName} 
                    onChange={e => setNewKeyName(e.target.value)}
                  />
                  <button onClick={createKey} className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold">Generate</button>
              </div>
              <div className="space-y-2 h-48 overflow-y-auto pr-1">
                  {keys.map(k => (
                      <div key={k._id} className="flex justify-between items-center bg-gray-800 p-2 rounded border border-gray-700">
                          <div>
                              <div className="text-white font-bold text-sm">{k.name}</div>
                              <div className="text-xs text-gray-500 font-mono">NASM-d{k.d}</div>
                          </div>
                          <button onClick={() => deleteKey(k._id)} className="text-red-400 hover:text-red-300 text-xs font-bold">DEL</button>
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  return (
    <div className="bg-gray-900 text-gray-200 h-full flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-gray-700">
            <TabButton active={tab === 'process'} label="PROCESSOR" onClick={() => setTab('process')} />
            <TabButton active={tab === 'vault'} label="KEY VAULT" onClick={() => setTab('vault')} />
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto">
            {tab === 'vault' ? <KeyVault /> : (
                <div className="space-y-5">
                    {/* 1. Mode Select */}
                    <div className="flex bg-gray-800 rounded p-1">
                        <button 
                            onClick={() => setMode('encrypt')} 
                            className={`flex-1 py-1 rounded text-xs font-bold transition-colors ${mode === 'encrypt' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            ENCRYPT
                        </button>
                        <button 
                            onClick={() => setMode('decrypt')} 
                            className={`flex-1 py-1 rounded text-xs font-bold transition-colors ${mode === 'decrypt' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            DECRYPT
                        </button>
                    </div>

                    {/* 2. File Input */}
                    <div 
                        onClick={handleSelectFile}
                        className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-gray-800 transition-colors"
                    >
                        <div className="text-2xl mb-1">📄</div>
                        <div className="text-sm font-bold text-gray-300 truncate">
                            {filePath ? filePath.split(/[/\\]/).pop() : "Click to select file"}
                        </div>
                        <div className="text-xs text-gray-500">{filePath || "No file selected"}</div>
                    </div>

                    {/* 3. Key Select */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Select Key</label>
                        <select 
                            value={selectedKeyId}
                            onChange={(e) => setSelectedKeyId(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 text-white text-sm rounded p-2 mt-1 outline-none focus:border-blue-500"
                        >
                            <option value="">-- Choose Key --</option>
                            {keys.map(k => <option key={k._id} value={k._id}>{k.name}</option>)}
                        </select>
                    </div>

                    {/* 4. Intensity (Encrypt Only) */}
                    {mode === 'encrypt' && (
                        <div>
                            <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                                <span>Time Intensity</span>
                                <span>{intensity}x</span>
                            </div>
                            <input 
                                type="range" min="1" max="100" 
                                value={intensity} 
                                onChange={(e) => setIntensity(parseInt(e.target.value))}
                                className="w-full mt-1 accent-red-500"
                            />
                        </div>
                    )}

                    {/* 5. Action */}
                    <button 
                        onClick={execute}
                        className={`w-full py-3 rounded font-bold text-white shadow-lg transition-transform active:scale-95
                            ${mode === 'encrypt' ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}
                    >
                        {mode === 'encrypt' ? 'LOCK FILE' : 'UNLOCK FILE'}
                    </button>

                    {/* Status */}
                    {status.msg && (
                        <div className={`text-xs text-center p-2 rounded ${status.type === 'error' ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                            {status.msg}
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

export default CryptoApp;