import React, { useState } from 'react';

const ShortcutWidget = ({ shortcut }) => {
  const [status, setStatus] = useState("Idle");

  const execute = async () => {
    // Check if the API is actually available
    if (!window.nativeAPI) {
      console.error("Native API not initialized");
      setStatus("Init Error");
      return;
    }

    setStatus("Running...");
    try {
      // FIXED: Changed from window.electronAPI to window.nativeAPI
      const token = await window.nativeAPI.getSecretToken();
      
      let url, body;
      if (shortcut.type === 'command') {
          url = 'http://localhost:4000/api/system/run';
          body = { command: shortcut.command, args: shortcut.args };
      } else {
          url = 'http://localhost:4000/api/system/open';
          body = { target: shortcut.target };
      }

      const res = await fetch(url, {
          method: 'POST',
          headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(body)
      });
      
      const data = await res.json();
      if (data.success || data.code === 0) {
          setStatus("Done ✅");
      } else {
          setStatus("Error ❌");
      }
      
      setTimeout(() => setStatus("Idle"), 2000);
    } catch (e) {
      console.error(e);
      setStatus("Failed ⚠️");
    }
  };

  return (
    <div 
      className="bg-gray-800 text-white p-3 rounded-lg shadow-lg w-48 flex items-center justify-between cursor-pointer hover:bg-gray-700 transition border border-gray-600 pointer-events-auto" 
      onClick={execute}
    >
      <div className="overflow-hidden">
        <div className="font-bold text-sm truncate">{shortcut.title}</div>
        <div className="text-[10px] uppercase tracking-tighter text-gray-400">{status}</div>
      </div>
      <div className="text-xl ml-2">🚀</div>
    </div>
  );
};

export default ShortcutWidget;