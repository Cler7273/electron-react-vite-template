import React, { useState, useEffect, useRef } from 'react';
import Note from './Note';
import TaskWidget from './TaskWidget';
import Frame from './Frame';

const Canvas = ({ searchQuery = "", activeFilters = [], onTagClick }) => {
    const [data, setData] = useState({ notes: [], frames: [], tasks: [] });
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const containerRef = useRef(null);

  // --- DATA LOADING ---
  const fetchData = async () => {
    try {
      const token = await window.nativeAPI.getSecretToken();
      const res = await fetch('http://localhost:4000/api/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      setData(json);
    } catch (e) { console.error("Canvas Load Error:", e); }
  };

   <button 
    onClick={triggerAddFrame} // Attach Handler
    className="bg-[#4285f4] text-white px-4 py-1.5 rounded-md text-sm font-bold hover:shadow-md transition-all active:scale-95"
  >
    Add Frame
  </button>

  // --- HANDLERS (Properly Async) ---

  const handleUpdateFrame = async (id, changes) => {
    // 1. Optimistic Update (Prevents "Reset/Snap back")
    setData(prev => ({
        ...prev,
        frames: prev.frames.map(f => f.id === id ? { ...f, ...changes } : f)
    }));

    // 2. API Call
    const token = await window.nativeAPI.getSecretToken(); // AWAIT THIS!
    await fetch(`http://localhost:4000/api/frames/${id}`, { // Make sure this route exists in backend
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(changes)
    });
  };

  const handleUpdateNote = async (id, changes) => {
    setData(prev => ({ ...prev, notes: prev.notes.map(n => n.id === id ? { ...n, ...changes } : n) }));
    const token = await window.nativeAPI.getSecretToken();
    await fetch(`http://localhost:4000/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(changes)
    });
  };

  const handleDeleteNote = async (id) => {
    setData(prev => ({ ...prev, notes: prev.notes.filter(n => n.id !== id) }));
    const token = await window.nativeAPI.getSecretToken();
    await fetch(`http://localhost:4000/api/notes/${id}`, { 
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } 
    });
  };

  // --- TAG OPERATIONS ---
  const handleTagAction = async (action, type, id, tagName) => {
      // Optimistic update could go here
      const token = await window.nativeAPI.getSecretToken();
      const method = action === 'add' ? 'POST' : 'DELETE';
      const url = action === 'add' 
        ? `http://localhost:4000/api/tags/${type}/${id}`
        : `http://localhost:4000/api/${type}/${id}/tags/${tagName}`;
      
      await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: action === 'add' ? JSON.stringify({ name: tagName }) : undefined
      });
      fetchData(); // Refresh to get tag colors/IDs
  };

  // --- CANVAS INTERACTION (ZOOM & PAN) ---
  const handleWheel = (e) => {
    // Zoom on Wheel
    if (e.ctrlKey || e.metaKey || true) { // Always zoom on wheel for now
        e.preventDefault(); // Prevent browser zoom
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        const newScale = Math.min(Math.max(view.scale + delta, 0.1), 5); // Limit 0.1x to 5x
        
        // Zoom towards mouse pointer logic (simplified for now: center zoom)
        // Ideally: calculate offset based on mouse pos.
        setView(prev => ({ ...prev, scale: newScale }));
    }
  };

  const handleMouseDown = (e) => {
      // Middle click (button 1) or Spacebar held
      if (e.button === 1 || e.buttons === 4 || (e.button === 0 && e.altKey)) {
          setIsPanning(true);
          e.preventDefault();
      }
  };

  const handleMouseMove = (e) => {
      if (isPanning) {
          setView(prev => ({
              ...prev,
              x: prev.x + e.movementX,
              y: prev.y + e.movementY
          }));
      }
  };

  const handleMouseUp = () => setIsPanning(false);

  // Double Click to Add Note
  const handleDoubleClick = async (e) => {
    if (e.target !== e.currentTarget) return; // Only click on empty canvas
    
    // Math to place note exactly where clicked
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const canvasX = (clickX - view.x) / view.scale;
    const canvasY = (clickY - view.y) / view.scale;

    const token = await window.nativeAPI.getSecretToken();
    const newNote = {
      content: "New Note",
      pos_x: canvasX - 100,
      pos_y: canvasY - 100,
      width: 200, height: 200, color_hex: "#fff000"
    };

    const res = await fetch('http://localhost:4000/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(newNote)
    });
    const savedNote = await res.json();
    setData(prev => ({ ...prev, notes: [...prev.notes, savedNote] }));
  };
  // Expose a method for App.jsx to call (Optional, or move addFrame logic to App and pass down)
  // For now, let's keep it simple: Filter logic
  const filteredNotes = data.notes.filter(note => {
      const matchesSearch = note.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTags = activeFilters.length === 0 || (note.tags && note.tags.some(t => activeFilters.includes(t.name)));
      return matchesSearch && matchesTags;
  });
  return (
    <div 
        ref={containerRef}
        className={`w-full h-full overflow-hidden relative bg-[#242424] ${isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
        // Note: attach wheel listener via useEffect as discussed previously
        onMouseDown={(e) => { if(e.button===1 || e.buttons===4 || (e.button===0 && e.altKey)) { setIsPanning(true); e.preventDefault(); } }}
        onMouseMove={(e) => { if(isPanning) setView(p => ({...p, x: p.x + e.movementX, y: p.y + e.movementY})); }}
        onMouseUp={() => setIsPanning(false)}
        onMouseLeave={() => setIsPanning(false)}
        onDoubleClick={handleDoubleClick}
    >
      <div style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: '0 0', width: '100%', height: '100%', position: 'absolute' }}>
          
          {/* GRID */}
          <div className="absolute pointer-events-none opacity-10 top-[-5000px] left-[-5000px] w-[10000px] h-[10000px]"
             style={{ backgroundImage: 'radial-gradient(#888 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
          />

          {/* FRAMES */}
          {data.frames.map(frame => (
            <Frame
                key={frame.id}
                frame={frame}
                scale={view.scale}
                onUpdate={handleUpdateFrame} // FIXED: Uses the async wrapper
                onDelete={async (id) => {
                    await fetch(`http://localhost:4000/api/frames/${id}`, { 
                        method: 'DELETE', 
                        headers: { 'Authorization': `Bearer ${await window.nativeAPI.getSecretToken()}` }
                    });
                    fetchData();
                }}
            />
          ))}

          {/* NOTES */}
          {data.notes.map(note => {
              // Dimming Logic
              const isMatch = filteredNotes.find(n => n.id === note.id);
              const isDimmed = (searchQuery || activeFilters.length > 0) && !isMatch;
              
              return (
                <Note 
                    key={note.id} 
                    note={note} 
                    scale={view.scale}
                    isDimmed={isDimmed}
                    onNoteUpdate={handleUpdateNote}
                    // ... other props
                    onDataChange={fetchData} 
                />
              );
          })}

          {/* TASKS - Only show if App is active or if you want them always visible */}
          {data.tasks && data.tasks.map(task => (
             <TaskWidget key={task.id} task={task} scale={view.scale} onUpdate={fetchData} />
          ))}

      </div>
      {/* HUD */}
      <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-mono">{Math.round(view.scale * 100)}%</div>
    </div>
  );
};
export default Canvas;