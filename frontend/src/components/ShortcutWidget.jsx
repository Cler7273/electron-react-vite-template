// frontend/src/components/ShortcutWidget.jsx
import React, { useState } from 'react';

const ShortcutWidget = ({ shortcut }) => {
  // shortcut prop example: { title: "Open Google", target: "https://google.com", type: "url" }
  // or { title: "Run Python Script", command: "python", args: ["script.py"], type: "command" }
  
  const [status, setStatus] = useState("Idle");

  const execute = async () => {
    setStatus("Running...");
    const token = await window.electronAPI.getSecretToken();
    
    let url, body;

    if (shortcut.type === 'command') {
        url = 'http://localhost:4000/api/system/run';
        body = { command: shortcut.command, args: shortcut.args };
    } else {
        url = 'http://localhost:4000/api/system/open';
        body = { target: shortcut.target };
    }

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.success) setStatus("Done ✅");
        else setStatus("Error ❌");
        
        // Reset status after 2s
        setTimeout(() => setStatus("Idle"), 2000);

    } catch (e) {
        console.error(e);
        setStatus("Failed ⚠️");
    }
  };

  return (
    <div className="bg-gray-800 text-white p-3 rounded-lg shadow-lg w-48 flex items-center justify-between cursor-pointer hover:bg-gray-700 transition" onClick={execute}>
      <div>
        <div className="font-bold text-sm">{shortcut.title}</div>
        <div className="text-xs text-gray-400">{status}</div>
      </div>
      <div className="text-xl">🚀</div>
    </div>
  );
};

export default ShortcutWidget;