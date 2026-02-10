import React, { useState, useEffect } from 'react';

const SettingsApp = () => {
  const [activeTab, setActiveTab] = useState('shortcuts');
  const [shortcuts, setShortcuts] = useState([]);
  const [canvasColor, setCanvasColor] = useState('#242424');

  // --- SHORTCUTS LOGIC ---
  const fetchShortcuts = async () => {
      const token = await window.nativeAPI.getSecretToken();
      const res = await fetch('http://localhost:4000/api/shortcuts', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setShortcuts(data || []);
      // Trigger App to reload widgets
      window.dispatchEvent(new CustomEvent('cognicanvas:config-updated'));
  };

  const handleAddShortcut = async () => {
      // 1. Ask User for File
      const filePath = await window.nativeAPI.selectFile();
      if (!filePath) return;

      // 2. Guess Name
      const name = filePath.split(/[/\\]/).pop();

      // 3. Save to DB
      const token = await window.nativeAPI.getSecretToken();
      await fetch('http://localhost:4000/api/shortcuts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ title: name, target: filePath, type: 'file' })
      });
      fetchShortcuts();
  };

  const handleDeleteShortcut = async (id) => {
      const token = await window.nativeAPI.getSecretToken();
      await fetch(`http://localhost:4000/api/shortcuts/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      fetchShortcuts();
  };

  // --- THEME LOGIC ---
  const saveTheme = async (color) => {
      setCanvasColor(color);
      const token = await window.nativeAPI.getSecretToken();
      await fetch('http://localhost:4000/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ key: 'canvas_bg', value: color })
      });
      window.dispatchEvent(new CustomEvent('cognicanvas:config-updated'));
  };

  useEffect(() => {
      fetchShortcuts();
      // Fetch initial theme (could be refactored into a hook)
  }, []);

  return (
    <div className="flex h-full text-gray-800">
      {/* Sidebar */}
      <div className="w-1/4 bg-gray-100 border-r p-2 space-y-1">
          <button onClick={() => setActiveTab('shortcuts')} className={`w-full text-left px-2 py-1.5 rounded text-sm font-bold ${activeTab==='shortcuts' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200'}`}>Shortcuts</button>
          <button onClick={() => setActiveTab('theme')} className={`w-full text-left px-2 py-1.5 rounded text-sm font-bold ${activeTab==='theme' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200'}`}>Theme</button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
          {activeTab === 'shortcuts' && (
              <div className="space-y-4">
                  <div className="flex justify-between items-center">
                      <h3 className="font-bold">System Shortcuts</h3>
                      <button onClick={handleAddShortcut} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-500">+ Add File/Exe</button>
                  </div>
                  <div className="space-y-2">
                      {shortcuts.map(s => (
                          <div key={s.id} className="flex justify-between items-center bg-white border p-2 rounded shadow-sm">
                              <div className="truncate flex-1 pr-2">
                                  <div className="font-bold text-sm">{s.title}</div>
                                  <div className="text-xs text-gray-400 truncate" title={s.target}>{s.target}</div>
                              </div>
                              <button onClick={() => handleDeleteShortcut(s.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">🗑️</button>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {activeTab === 'theme' && (
              <div className="space-y-4">
                  <h3 className="font-bold">Appearance</h3>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">CANVAS BACKGROUND</label>
                      <div className="flex gap-2">
                          {['#242424', '#1e1e1e', '#0f172a', '#312e81', '#ffffff'].map(c => (
                              <button 
                                key={c}
                                className={`w-8 h-8 rounded-full border-2 ${canvasColor === c ? 'border-blue-500 scale-110' : 'border-transparent'}`}
                                style={{ backgroundColor: c }}
                                onClick={() => saveTheme(c)}
                              />
                          ))}
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default SettingsApp;