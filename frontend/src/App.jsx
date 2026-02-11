import React, { useState, useEffect } from 'react';
import { initializeApi } from './api';
import Canvas from './components/Canvas';
import WindowFrame from './components/WindowFrame';
import CryptoApp from './apps/CryptoApp';
import TasksApp from './apps/TasksApp';
import ShortcutWidget from './components/ShortcutWidget';
import SettingsApp from './apps/SettingsApp';
import CommandPalette from './components/CommandPalette';

function App() {
  const [openApps, setOpenApps] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState([]); 
  const [availableTags, setAvailableTags] = useState([]); 
  
  // Settings & Theme
  const [shortcuts, setShortcuts] = useState([]);
  const [theme, setTheme] = useState({ canvas_bg: '#242424' });
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // --- INITIALIZATION ---
  const fetchTags = async () => {
     try {
         const token = await window.nativeAPI.getSecretToken();
         const res = await fetch('http://localhost:4000/api/all', { headers: { 'Authorization': `Bearer ${token}` } });
         const data = await res.json();
         const tags = new Set();
         data.notes.forEach(n => n.tags.forEach(t => tags.add(t.name)));
         setAvailableTags(Array.from(tags));
     } catch(e) { console.error("Tag fetch error", e); }
  };

  const refreshConfig = async () => {
      const token = await window.nativeAPI.getSecretToken();
      // Load Shortcuts
      const sRes = await fetch('http://localhost:4000/api/shortcuts', { headers: { 'Authorization': `Bearer ${token}` } });
      setShortcuts(await sRes.json());
      // Load Settings
      const tRes = await fetch('http://localhost:4000/api/settings', { headers: { 'Authorization': `Bearer ${token}` } });
      const tData = await tRes.json();
      if (tData.canvas_bg) setTheme({ canvas_bg: tData.canvas_bg });
  };

  useEffect(() => {
    initializeApi().then(() => {
       setIsReady(true);
       fetchTags(); 
       refreshConfig();
    });

    // Event Listeners
    const handleToggleApp = (e) => toggleApp(e.detail);
    window.addEventListener('cognicanvas:data-updated', fetchTags);
    window.addEventListener('cognicanvas:config-updated', refreshConfig);
    window.addEventListener('cognicanvas:toggle-app', handleToggleApp);
    
    // Command Palette Shortcut
    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            setIsPaletteOpen(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
        window.removeEventListener('cognicanvas:data-updated', fetchTags);
        window.removeEventListener('cognicanvas:config-updated', refreshConfig);
        window.removeEventListener('cognicanvas:toggle-app', handleToggleApp);
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleApp = (appName) => {
    setOpenApps(prev => prev.includes(appName) ? prev.filter(a => a !== appName) : [...prev, appName]);
  };

  const toggleFilter = (tagName) => {
    setActiveFilters(prev => prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]);
  };

  const triggerAddFrame = () => {
    window.dispatchEvent(new CustomEvent('cognicanvas:add-frame'));
  };

  if (!isReady) return <div className="bg-[#1a1a1a] h-screen text-yellow-500 flex items-center justify-center font-mono">SYSTEM_BOOT...</div>;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#111] text-gray-100 font-sans select-none">
      
      {/* COMMAND PALETTE */}
      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />

      {/* SIDEBAR DOCK */}
      <nav className="w-16 bg-black flex flex-col items-center py-4 space-y-4 z-[100] border-r border-white/10">
        <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center font-black text-black text-xl mb-4">C</div>
        <DockIcon label="Cryptor" active={openApps.includes('crypto')} onClick={() => toggleApp('crypto')}>🔒</DockIcon>
        <DockIcon label="Tasks" active={openApps.includes('tasks')} onClick={() => toggleApp('tasks')}>✅</DockIcon>
        <div className="flex-1" />
        <DockIcon label="Settings" active={openApps.includes('settings')} onClick={() => toggleApp('settings')}>⚙️</DockIcon>
      </nav>

      <div className="flex-1 flex flex-col relative">
        
        {/* HEADER */}
        <header className="h-14 bg-[#f8f9fa] border-b border-gray-300 flex items-center px-4 space-x-4 z-40 shadow-sm text-gray-800">
          <button onClick={triggerAddFrame} className="bg-[#4285f4] text-white px-4 py-1.5 rounded-md text-sm font-bold hover:shadow-md active:scale-95 transition-all whitespace-nowrap">
            + Frame
          </button>
          
          <div className="w-64 relative">
            <input 
              type="text" 
              placeholder="Search content..." 
              className="w-full bg-[#e9ecef] border-none rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute right-2 top-2 text-xs text-gray-400">Ctrl+K</div>
          </div>

          <div className="h-8 w-px bg-gray-300 mx-2"></div>

          {/* Tag Filter */}
          <div className="flex-1 flex items-center space-x-2 overflow-hidden">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Tags:</span>
            <select 
                className="bg-white border border-gray-300 text-gray-700 text-xs rounded p-1 outline-none focus:border-blue-500"
                onChange={(e) => { if(e.target.value) { toggleFilter(e.target.value); e.target.value = ""; } }}
            >
                <option value="">+ Add Filter</option>
                {availableTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                ))}
            </select>
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
                {activeFilters.map(tag => (
                <div key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 border border-blue-200 rounded-md text-xs font-bold flex items-center whitespace-nowrap">
                    {tag} <button className="ml-1 text-blue-400 hover:text-blue-900" onClick={() => toggleFilter(tag)}>×</button>
                </div>
                ))}
            </div>
            {activeFilters.length > 0 && (
                <button onClick={() => setActiveFilters([])} className="text-xs text-red-500 hover:text-red-700 underline font-bold whitespace-nowrap">Clear</button>
            )}
          </div>
        </header>

       <div className="flex-1 relative z-10">
          <Canvas 
            searchQuery={searchQuery} 
            activeFilters={activeFilters} 
            showTasks={openApps.includes('tasks')}
            bgColor={theme.canvas_bg} 
          />
          
          {/* DESKTOP SHORTCUTS */}
          <div className="absolute top-4 left-4 z-20 flex flex-col space-y-2 pointer-events-none">
            {shortcuts.map(s => (
                <ShortcutWidget key={s.id} shortcut={s} />
            ))}
          </div>

          {/* APP WINDOWS LAYER */}
          <div className="absolute inset-0 z-50 pointer-events-none">
            
            {/* TASKS APP WINDOW */}
            {openApps.includes('tasks') && (
              <div className="pointer-events-auto">
                <WindowFrame title="Task Manager" onClose={() => toggleApp('tasks')} width={450} initialPos={{x: 100, y: 100}}>
                  <TasksApp />
                </WindowFrame>
              </div>
            )}

            {/* CRYPTO APP WINDOW */}
            {openApps.includes('crypto') && (
              <div className="pointer-events-auto">
                <WindowFrame title="NASM Cryptor 2.0" onClose={() => toggleApp('crypto')} width={600} initialPos={{x: 150, y: 150}}>
                  <CryptoApp />
                </WindowFrame>
              </div>
            )}
            
            {/* SETTINGS APP WINDOW */}
            {openApps.includes('settings') && (
              <div className="pointer-events-auto">
                <WindowFrame title="System Settings" onClose={() => toggleApp('settings')} width={600} initialPos={{x: 200, y: 200}}>
                  <SettingsApp />
                </WindowFrame>
              </div>
            )}
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
      ${active ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white'}
    `}
  >
    {children}
    <span className="absolute left-14 bg-black text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[110]">
      {label.toUpperCase()}
    </span>
  </button>
);

export default App;