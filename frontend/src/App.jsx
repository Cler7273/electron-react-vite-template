import React, { useState, useEffect } from 'react';
import { initializeApi } from './api';
import Canvas from './components/Canvas';
import WindowFrame from './components/WindowFrame';
import CryptoApp from './apps/CryptoApp';
import ShortcutWidget from './components/ShortcutWidget';

function App() {
  const [openApps, setOpenApps] = useState([]); // Array of strings e.g. ["crypto"]
  const [isReady, setIsReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    initializeApi().then(() => setIsReady(true));
  }, []);

  // FIXED: Simplified toggle logic to ensure state triggers re-render
  const toggleApp = (appName) => {
    setOpenApps(current => {
      if (current.includes(appName)) {
        return current.filter(name => name !== appName);
      } else {
        return [...current, appName];
      }
    });
  };

  if (!isReady) return <div className="bg-[#1a1a1a] h-screen text-yellow-500 flex items-center justify-center font-mono">LOADING_SYSTEM_RESOURCES...</div>;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#111] text-gray-100 font-sans select-none">
      
      {/* SIDEBAR DOCK */}
      <nav className="w-16 bg-black flex flex-col items-center py-4 space-y-4 z-[100] border-r border-white/10">
        <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center font-black text-black text-xl mb-4">C</div>
        
        <DockIcon label="Cryptor" active={openApps.includes('crypto')} onClick={() => toggleApp('crypto')}>🔒</DockIcon>
        <DockIcon label="Tasks" active={openApps.includes('tasks')} onClick={() => toggleApp('tasks')}>✅</DockIcon>
        <DockIcon label="Settings" active={openApps.includes('settings')} onClick={() => toggleApp('settings')}>⚙️</DockIcon>
      </nav>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col relative">
        
        {/* TOP BAR */}
        <header className="h-12 bg-[#1a1a1a] border-b border-white/5 flex items-center px-4 space-x-4 z-50">
          <button className="bg-blue-600 px-3 py-1 rounded text-xs font-bold hover:bg-blue-500 transition-colors">ADD FRAME</button>
          <input 
            type="text" 
            placeholder="Search nodes..." 
            className="flex-1 max-w-xs bg-[#222] border-none rounded px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </header>

        {/* WINDOWS PORTAL LAYER (Always on top of Canvas) */}
        <div className="absolute inset-0 z-50 pointer-events-none">
          {openApps.includes('crypto') && (
            <div className="pointer-events-auto">
              <WindowFrame title="NASM Cryptor" onClose={() => toggleApp('crypto')} initialPos={{x: 150, y: 100}} width={450}>
                <CryptoApp />
              </WindowFrame>
            </div>
          )}

          {openApps.includes('settings') && (
            <div className="pointer-events-auto">
              <WindowFrame title="System Settings" onClose={() => toggleApp('settings')} initialPos={{x: 250, y: 150}} width={400}>
                <div className="p-4 space-y-4 text-gray-800">
                  <h2 className="font-bold border-b pb-2">Appearance</h2>
                  <p className="text-sm">Canvas Theme: Dark (Default)</p>
                  <button className="w-full py-2 bg-gray-200 rounded text-xs font-bold">EXPORT DATA (.JSON)</button>
                </div>
              </WindowFrame>
            </div>
          )}
        </div>

        {/* CANVAS LAYER (Background) */}
        <div className="flex-1 relative z-10">
          <Canvas searchQuery={searchQuery} />
          
          {/* DESKTOP WIDGETS */}
          <div className="absolute top-4 left-4 z-20 flex flex-col space-y-2 pointer-events-none">
            {/* Inside App.jsx render */}
<ShortcutWidget 
    shortcut={{ 
        title: "MPSI Drive", 
        // CORRECT: Double backslashes for JS string escaping
        target: "C:\\Users\\aperonylo\\Documents\\MPSI", 
        type: "url" 
    }} 
/>
          </div>
        </div>

      </div>
    </div>
  );
}

const DockIcon = ({ children, label, onClick, active }) => (
  <button 
    onClick={onClick}
    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all group relative
      ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40' : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white'}
    `}
  >
    {children}
    <span className="absolute left-14 bg-black text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[110]">
      {label.toUpperCase()}
    </span>
  </button>
);

export default App;