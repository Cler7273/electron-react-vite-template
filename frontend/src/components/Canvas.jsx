import React, { useState, useEffect, useRef } from 'react';
import Note from './Note';
import Frame from './Frame';
import TaskWidget from './TaskWidget';

// Receive 'showTasks' prop from App
const Canvas = ({ searchQuery = "", activeFilters = [], onTagClick, showTasks }) => {
  const [data, setData] = useState({ notes: [], frames: [], tasks: [] });
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const containerRef = useRef(null);

  const fetchData = async () => {
    try {
      const token = await window.nativeAPI.getSecretToken();
      const res = await fetch('http://localhost:4000/api/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      setData(json);
      
      // FIX TAG SYNC: Tell App.jsx to refresh the dropdown
      window.dispatchEvent(new CustomEvent('cognicanvas:data-updated'));
      
    } catch (e) { console.error("Canvas Load Error:", e); }
  };

  useEffect(() => { fetchData(); }, []);

  // --- MOUSE WHEEL FIX (RESTORED) ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelNative = (e) => {
      e.preventDefault(); // Stop browser zoom
      const zoomSensitivity = 0.001;
      const delta = -e.deltaY * zoomSensitivity;
      setView(prev => ({
        ...prev,
        scale: Math.min(Math.max(prev.scale + delta, 0.1), 3)
      }));
    };

    // Passive: false is required to preventDefault
    container.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => container.removeEventListener('wheel', handleWheelNative);
  }, []);

  // --- HANDLERS ---
  const handleUpdateNote = async (id, changes) => { /* ... same as before ... */ 
      setData(prev => ({ ...prev, notes: prev.notes.map(n => n.id === id ? { ...n, ...changes } : n) }));
      const token = await window.nativeAPI.getSecretToken();
      await fetch(`http://localhost:4000/api/notes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(changes) });
  };
  
  const handleDeleteNote = async (id) => { /* ... same as before ... */
      setData(prev => ({ ...prev, notes: prev.notes.filter(n => n.id !== id) }));
      const token = await window.nativeAPI.getSecretToken();
      await fetch(`http://localhost:4000/api/notes/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
  };

  const handleUpdateFrame = async (id, changes) => { /* ... same as before ... */
      setData(prev => ({ ...prev, frames: prev.frames.map(f => f.id === id ? { ...f, ...changes } : f) }));
      const token = await window.nativeAPI.getSecretToken();
      await fetch(`http://localhost:4000/api/frames/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(changes) });
  };

  const handleTagAction = async (action, type, id, tagName) => {
      // Optimistic update to make UI snappy
      const token = await window.nativeAPI.getSecretToken();
      const url = action === 'add' ? `http://localhost:4000/api/tags/${type}/${id}` : `http://localhost:4000/api/${type}/${id}/tags/${tagName}`;
      const method = action === 'add' ? 'POST' : 'DELETE';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: action === 'add' ? JSON.stringify({ name: tagName }) : undefined });
      
      fetchData(); // Refresh data AND Trigger Dropdown Update
  };

  const filteredNotes = data.notes.filter(note => {
      const matchesSearch = !searchQuery || note.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTags = activeFilters.length === 0 || (note.tags && note.tags.some(t => activeFilters.includes(t.name)));
      return matchesSearch && matchesTags;
  });

  // --- ADD FRAME LISTENER ---
  useEffect(() => {
    const onAddFrame = async () => {
        const token = await window.nativeAPI.getSecretToken();
        const newFrame = {
            title: "NEW FRAME",
            pos_x: (-view.x + 100) / view.scale,
            pos_y: (-view.y + 100) / view.scale,
            width: 400, height: 300
        };
        await fetch('http://localhost:4000/api/frames', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(newFrame) });
        fetchData();
    };
    window.addEventListener('cognicanvas:add-frame', onAddFrame);
    return () => window.removeEventListener('cognicanvas:add-frame', onAddFrame);
  }, [view]);

  // Double Click Note Creation
  const handleDoubleClick = async (e) => {
    if (e.target !== e.currentTarget) return;
    const rect = containerRef.current.getBoundingClientRect();
    const canvasX = ((e.clientX - rect.left) - view.x) / view.scale;
    const canvasY = ((e.clientY - rect.top) - view.y) / view.scale;

    const token = await window.nativeAPI.getSecretToken();
    const newNote = {
      content: "New Note", pos_x: canvasX - 100, pos_y: canvasY - 100,
      width: 200, height: 200, color_hex: "#fff000"
    };

    await fetch('http://localhost:4000/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(newNote)
    });
    fetchData();
  };

  return (
    <div 
        ref={containerRef}
        className={`w-full h-full overflow-hidden relative bg-[#242424] ${isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
        onMouseDown={(e) => { if(e.button===1 || e.buttons===4 || (e.button===0 && e.altKey)) { setIsPanning(true); e.preventDefault(); } }}
        onMouseMove={(e) => { if(isPanning) setView(p => ({...p, x: p.x + e.movementX, y: p.y + e.movementY})); }}
        onMouseUp={() => setIsPanning(false)}
        onMouseLeave={() => setIsPanning(false)}
        onDoubleClick={async (e) => {
            if (e.target !== e.currentTarget) return;
            const rect = containerRef.current.getBoundingClientRect();
            const token = await window.nativeAPI.getSecretToken();
            const newNote = {
                content: "New Note", 
                pos_x: ((e.clientX - rect.left) - view.x) / view.scale - 100, 
                pos_y: ((e.clientY - rect.top) - view.y) / view.scale - 100,
                width: 200, height: 200, color_hex: "#fff000"
            };
            await fetch('http://localhost:4000/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(newNote) });
            fetchData();
        }}
    >
      <div style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: '0 0', width: '100%', height: '100%', position: 'absolute' }}>
          
          <div className="absolute pointer-events-none opacity-10 top-[-5000px] left-[-5000px] w-[10000px] h-[10000px]"
             style={{ backgroundImage: 'radial-gradient(#888 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
          />

          {data.frames.map(frame => (
            <Frame
                key={frame.id} frame={frame} scale={view.scale}
                onUpdate={handleUpdateFrame}
                onDelete={async (id) => { await fetch(`http://localhost:4000/api/frames/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${await window.nativeAPI.getSecretToken()}` } }); fetchData(); }}
            />
          ))}

          {data.notes.map(note => (
            <Note 
                key={note.id} note={note} scale={view.scale}
                isDimmed={(searchQuery || activeFilters.length > 0) && !filteredNotes.find(n => n.id === note.id)}
                onNoteUpdate={handleUpdateNote}
                onNoteDelete={handleDeleteNote}
                onTagAdd={(type, id, name) => handleTagAction('add', type, id, name)}
                onTagRemove={(type, id, name) => handleTagAction('remove', type, id, name)}
                onDataChange={fetchData}
                onTagClick={onTagClick}
            />
          ))}

          {/* FIX TASKS: Only render if showTasks is true */}
          {showTasks && data.tasks && data.tasks.map(task => (
             <TaskWidget key={task.id} task={task} scale={view.scale} onUpdate={fetchData} />
          ))}
      </div>
    </div>
  );
};
export default Canvas;