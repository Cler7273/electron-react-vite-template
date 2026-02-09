import React, { useState, useEffect } from 'react';
import { initializeApi } from './api';
import Canvas from './components/Canvas';
import WindowFrame from './components/WindowFrame';
import CryptoApp from './apps/CryptoApp';
import ShortcutWidget from './components/ShortcutWidget'; // Assuming you kept this

function App() {
  const [openApps, setOpenApps] = useState([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initializeApi();
      setIsReady(true);
    };
    init();
  }, []);

  const toggleApp = (appName) => {
    if (openApps.includes(appName)) {
      setOpenApps(openApps.filter(a => a !== appName));
    } else {
      setOpenApps([...openApps, appName]);
    }
  };

  if (!isReady) return <div className="text-white p-4">Loading CogniCanvas OS...</div>;

  return (
    <div className="flex h-screen w-screen overflow-hidden text-gray-900 font-sans">
      
      {/* 1. LEFT DOCK / FASTBAR */}
      <nav className="w-16 bg-[#1a1a1a] flex flex-col items-center py-4 space-y-4 z-50 shadow-xl border-r border-gray-800">
        {/* Logo / Home */}
        <div className="w-10 h-10 bg-yellow-400 rounded-lg mb-4 flex items-center justify-center font-bold text-black text-xl cursor-pointer" title="Canvas">
          C
        </div>

        {/* App Icons */}
        <DockIcon label="Cryptor" active={openApps.includes('crypto')} onClick={() => toggleApp('crypto')}>
          🔒
        </DockIcon>
        
        <DockIcon label="MPSI" active={openApps.includes('mpsi')} onClick={() => toggleApp('mpsi')}>
          ⚛️
        </DockIcon>
        
        <DockIcon label="Tasks" active={openApps.includes('tasks')} onClick={() => toggleApp('tasks')}>
          ✅
        </DockIcon>

        <div className="flex-1" /> {/* Spacer */}
        
        <DockIcon label="Settings">⚙️</DockIcon>
      </nav>

      {/* 2. MAIN WORKSPACE */}
      <main className="flex-1 relative">
        
        {/* Layer A: Infinite Canvas (Background) */}
        <Canvas />

        {/* Layer B: Widgets (Fixed on screen) */}
        <div className="absolute top-4 left-4 z-30 pointer-events-none">
             {/* Shortcut Widget Wrapper (Enable pointer events for children) */}
             <div className="pointer-events-auto mb-2">
                <ShortcutWidget shortcut={{ title: "MPSI Drive", target: "C:\\", type: "url" }} />
             </div>
        </div>

        {/* Layer C: Floating Windows */}
        {openApps.includes('crypto') && (
          <WindowFrame title="NASM Cryptor 2.0" onClose={() => toggleApp('crypto')}>
            <CryptoApp />
          </WindowFrame>
        )}

        {openApps.includes('tasks') && (
          <WindowFrame title="Chronometer & Tasks" onClose={() => toggleApp('tasks')}>
             <div className="p-4 text-center">
               <h3 className="font-bold">Task Manager</h3>
               <p className="text-sm">Coming in Module 3...</p>
             </div>
          </WindowFrame>
        )}

      </main>
    </div>
  );
}

// Helper Component for the Dock
const DockIcon = ({ children, label, onClick, active }) => (
  <button 
    onClick={onClick}
    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all duration-200 group relative
      ${active ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'}
    `}
  >
    {children}
    {/* Tooltip */}
    <span className="absolute left-14 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
      {label}
    </span>
  </button>
);

export default App;