import React, { useState, useEffect, useRef } from 'react';

const CommandPalette = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Static Actions
  const ACTIONS = [
    { id: 'app:tasks', title: 'Open Tasks', icon: '✅', action: () => window.dispatchEvent(new CustomEvent('cognicanvas:toggle-app', { detail: 'tasks' })) },
    { id: 'app:crypto', title: 'Open Cryptor', icon: '🔒', action: () => window.dispatchEvent(new CustomEvent('cognicanvas:toggle-app', { detail: 'crypto' })) },
    { id: 'app:settings', title: 'Open Settings', icon: '⚙️', action: () => window.dispatchEvent(new CustomEvent('cognicanvas:toggle-app', { detail: 'settings' })) },
    { id: 'canvas:add-frame', title: 'New Frame', icon: 'squares', action: () => window.dispatchEvent(new CustomEvent('cognicanvas:add-frame')) },
    { id: 'sys:reload', title: 'Reload System', icon: '🔄', action: () => window.location.reload() }
  ];

  const filteredItems = ACTIONS.filter(item => item.title.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="w-[600px] bg-[#1e1e1e] border border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100" onClick={e => e.stopPropagation()}>
        
        {/* Input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-700">
          <span className="text-gray-400 text-lg mr-3">🔍</span>
          <input 
            ref={inputRef}
            type="text" 
            className="flex-1 bg-transparent text-white text-lg outline-none placeholder-gray-500"
            placeholder="Type a command..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
          />
          <span className="text-xs text-gray-500 border border-gray-600 px-1.5 py-0.5 rounded">ESC</span>
        </div>

        {/* List */}
        <div className="max-h-[300px] overflow-y-auto py-2">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-3 text-gray-500 text-sm">No results found.</div>
          ) : (
            filteredItems.map((item, index) => (
              <div 
                key={item.id}
                className={`px-4 py-3 flex items-center cursor-pointer transition-colors
                  ${index === selectedIndex ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}
                `}
                onClick={() => { item.action(); onClose(); }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                <span className="font-medium">{item.title}</span>
                {index === selectedIndex && <span className="ml-auto text-xs opacity-70">↵ Enter</span>}
              </div>
            ))
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-[#111] px-4 py-1.5 border-t border-gray-700 text-[10px] text-gray-500 flex justify-between">
            <span>CogniCanvas OS v1.0</span>
            <span>Use ↑↓ to navigate</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;