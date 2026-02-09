import React, { useState, useEffect, useRef } from 'react';
import Note from './Note';

const Canvas = () => {
  const [data, setData] = useState({ notes: [], frames: [], tasks: [] });
  // Viewport State: x/y translation and scale
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
    } catch (e) {
      console.error("Canvas Load Error:", e);
    }
  };

  useEffect(() => {
    fetchData();

    // --- NATIVE WHEEL HANDLER FOR BETTER ZOOM PERFORMANCE ---
  const container = containerRef.current;
  if (!container) return;

  const handleWheelNative = (e) => {
    // 1. Force prevent default to stop browser-level zooming
    e.preventDefault();

    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    
    setView(prev => {
      const newScale = Math.min(Math.max(prev.scale + delta, 0.1), 3);
      return { ...prev, scale: newScale };
    });
  };

  // 2. Attach listener with { passive: false } to allow preventDefault()
  container.addEventListener('wheel', handleWheelNative, { passive: false });

  return () => container.removeEventListener('wheel', handleWheelNative);
}, []); // Empty dependency array means this runs once on mount

  // --- NOTE OPERATIONS ---
  const handleUpdateNote = async (id, changes) => {
    setData(prev => ({
      ...prev,
      notes: prev.notes.map(n => n.id === id ? { ...n, ...changes } : n)
    }));
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

  const handleDoubleClick = async (e) => {
    if (e.target !== e.currentTarget) return;
    
    // Math to place note exactly where clicked, considering zoom and pan
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Formula: (ScreenCoord - PanOffset) / Scale
    const canvasX = (clickX - view.x) / view.scale;
    const canvasY = (clickY - view.y) / view.scale;

    const token = await window.nativeAPI.getSecretToken();
    const newNote = {
      content: "New Note",
      pos_x: canvasX - 100, // Center on click
      pos_y: canvasY - 100,
      width: 200,
      height: 200,
      color_hex: "#fff000"
    };

    const res = await fetch('http://localhost:4000/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(newNote)
    });
    const savedNote = await res.json();
    setData(prev => ({ ...prev, notes: [...prev.notes, savedNote] }));
  };

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full overflow-hidden relative bg-[#242424] ${isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
      //onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      {/* Transformation Layer */}
      <div 
        style={{ 
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
            position: 'absolute'
        }}
      >
          {/* Grid Background (Moves with transformation) */}
          <div className="absolute top-[-10000px] left-[-10000px] w-[20000px] h-[20000px] pointer-events-none opacity-20"
             style={{ 
                 backgroundImage: 'radial-gradient(#888 1px, transparent 1px)', 
                 backgroundSize: '40px 40px' 
             }} 
          />

          {data.notes.map(note => (
            <Note 
              key={note.id} 
              note={note} 
              scale={view.scale} // Pass scale to draggable
              onNoteUpdate={handleUpdateNote}
              onNoteDelete={handleDeleteNote}
              onTagAdd={(type, id, name) => handleTagAction('add', type, id, name)}
              onTagRemove={(type, id, name) => handleTagAction('remove', type, id, name)}
              onDataChange={fetchData}
              onNavigateTo={(link) => console.log("Nav to", link)}
            />
          ))}
      </div>

      {/* HUD: Zoom Indicator */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-xs font-mono select-none">
          {Math.round(view.scale * 100)}%
      </div>
    </div>
  );
};

export default Canvas;