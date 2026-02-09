import React, { useState, useEffect } from 'react';
import { initializeApi } from './api';
import Canvas from './components/Canvas';
import WindowFrame from './components/WindowFrame';
import CryptoApp from './apps/CryptoApp';
import ShortcutWidget from './components/ShortcutWidget';

function App() {
  const [openApps, setOpenApps] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    initializeApi().then(() => setIsReady(true));
  }, []);

  const toggleApp = (appName) => {
    setOpenApps(prev => prev.includes(appName) 
      ? prev.filter(a => a !== appName) 
      : [...prev, appName]
    );
  };

  if (!isReady) return <div className="bg-[#242424] h-screen text-white flex items-center justify-center font-mono">INITIALIZING_COGNICANVAS_OS...</div>;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#1a1a1a] text-gray-100 font-sans select-none">
      
      {/* 1. LEFT DOCK */}
      <nav className="w-16 bg-[#111] flex flex-col items-center py-4 space-y-4 z-[100] shadow-2xl border-r border-white/5">
        <div className="w-10 h-10 bg-yellow-400 rounded-xl mb-4 flex items-center justify-center font-black text-black text-xl shadow-lg shadow-yellow-400/20">C</div>
        
        <DockIcon label="Cryptor" active={openApps.includes('crypto')} onClick={() => toggleApp('crypto')}>🔒</DockIcon>
        <DockIcon label="MPSI" active={openApps.includes('mpsi')} onClick={() => toggleApp('mpsi')}>⚛️</DockIcon>
        <DockIcon label="Tasks" active={openApps.includes('tasks')} onClick={() => toggleApp('tasks')}>✅</DockIcon>
        
        <div className="flex-1" />
        <DockIcon label="Settings" active={openApps.includes('settings')} onClick={() => toggleApp('settings')}>⚙️</DockIcon>
      </nav>

      {/* 2. WORKSPACE AREA */}
      <div className="flex-1 flex flex-col relative">
        
        {/* TOP TOOLBAR (Restored Filter/Search) */}
        <header className="h-12 bg-[#222] border-b border-white/5 flex items-center px-4 space-x-4 z-40 shadow-md">
          <button className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold transition-colors">ADD FRAME</button>
          
          <div className="flex-1 max-w-md relative">
            <input 
              type="text" 
              placeholder="Search nodes..." 
              className="w-full bg-[#333] border-none rounded px-3 py-1 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Filters:</span>
            <div className="px-2 py-0.5 bg-red-500 rounded-full text-[10px] font-bold flex items-center">
              GLOBAL <span className="ml-1 cursor-pointer">×</span>
            </div>
          </div>
        </header>

        {/* THE CANVAS */}
        <div className="flex-1 relative overflow-hidden">
          <Canvas searchQuery={searchQuery} />

          {/* FLOATING SHORTCUTS LAYER */}
          <div className="absolute top-4 left-4 z-30 flex flex-col space-y-2 pointer-events-none">
             <ShortcutWidget shortcut={{ title: "MPSI Drive", target: "C:\\", type: "url" }} />
             <ShortcutWidget shortcut={{ title: "Wolfram Alpha", target: "https://www.wolframalpha.com", type: "url" }} />
          </div>

          {/* WINDOWS LAYER */}
          {openApps.includes('crypto') && (
            <WindowFrame title="NASM Cryptor" onClose={() => toggleApp('crypto')} initialPos={{x: 200, y: 100}}>
              <CryptoApp />
            </WindowFrame>
          )}

          {openApps.includes('settings') && (
            <WindowFrame title="System Settings" onClose={() => toggleApp('settings')} initialPos={{x: 300, y: 150}}>
              <div className="p-4 space-y-4">
                 <div>
                   <label className="block text-xs font-bold text-gray-500 mb-1">CANVAS COLOR</label>
                   <input type="color" className="w-full h-8 rounded bg-transparent border-none" defaultValue="#242424" />
                 </div>
                 <p className="text-xs text-gray-400 italic">Configuration saved to internal cognicanvas.db</p>
              </div>
            </WindowFrame>
          )}
        </div>
      </div>
    </div>
  );
}

const DockIcon = ({ children, label, onClick, active }) => (
  <button 
    onClick={onClick}
    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all group relative
      ${active ? 'bg-blue-600 text-white scale-110 shadow-lg shadow-blue-600/40' : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white'}
    `}
  >
    {children}
    <span className="absolute left-14 bg-black text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[110] border border-white/10 shadow-xl">
      {label.toUpperCase()}
    </span>
  </button>
);

export default App;