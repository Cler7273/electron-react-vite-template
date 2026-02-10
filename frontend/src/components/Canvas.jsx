import React, { useState, useEffect, useRef } from 'react';
import Note from './Note';
import Frame from './Frame';
import TaskWidget from './TaskWidget';

const Canvas = ({ searchQuery = "", activeFilters = [], onTagClick }) => {
  const [data, setData] = useState({ notes: [], frames: [], tasks: [] });
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const containerRef = useRef(null);

  // --- 1. DATA LOADING ---
  const fetchData = async () => {
    try {
      console.log("Canvas: Fetching data...");
      const token = await window.nativeAPI.getSecretToken();
      const res = await fetch('http://localhost:4000/api/all', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      setData(json);
      console.log("Canvas: Data loaded", json);
    } catch (e) { console.error("Canvas Load Error:", e); }
  };

  useEffect(() => { fetchData(); }, []);

  // --- 2. NOTE HANDLERS (The Missing Functions) ---

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
    console.log("Canvas: Deleting note", id);
    // Optimistic delete
    setData(prev => ({ ...prev, notes: prev.notes.filter(n => n.id !== id) }));
    const token = await window.nativeAPI.getSecretToken();
    await fetch(`http://localhost:4000/api/notes/${id}`, { 
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } 
    });
  };

  const handleTagAction = async (action, type, id, tagName) => {
      console.log(`Canvas: Tag Action [${action}] on ${type} ${id}: ${tagName}`);
      const token = await window.nativeAPI.getSecretToken();
      const url = action === 'add' 
        ? `http://localhost:4000/api/tags/${type}/${id}`
        : `http://localhost:4000/api/${type}/${id}/tags/${tagName}`;
      
      const method = action === 'add' ? 'POST' : 'DELETE';

      await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: action === 'add' ? JSON.stringify({ name: tagName }) : undefined
      });
      fetchData(); // Refresh to get updated tags/colors
  };

  // --- 3. FRAME HANDLERS ---

  const handleUpdateFrame = async (id, changes) => {
    setData(prev => ({ ...prev, frames: prev.frames.map(f => f.id === id ? { ...f, ...changes } : f) }));
    const token = await window.nativeAPI.getSecretToken();
    await fetch(`http://localhost:4000/api/frames/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(changes)
    });
  };

  // --- 4. ADD FRAME LISTENER (Debugged) ---
  useEffect(() => {
    const onAddFrame = async () => {
        console.log("Canvas: Event 'cognicanvas:add-frame' received!");
        const token = await window.nativeAPI.getSecretToken();
        const newFrame = {
            title: "NEW FRAME",
            pos_x: (-view.x + 100) / view.scale,
            pos_y: (-view.y + 100) / view.scale,
            width: 400, height: 300
        };
        const res = await fetch('http://localhost:4000/api/frames', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(newFrame)
        });
        if(res.ok) {
            console.log("Canvas: Frame created successfully");
            fetchData();
        } else {
            console.error("Canvas: Frame creation failed", await res.text());
        }
    };

    window.addEventListener('cognicanvas:add-frame', onAddFrame);
    return () => window.removeEventListener('cognicanvas:add-frame', onAddFrame);
  }, [view]);

  // --- 5. RENDER LOGIC ---
  
  // Apply Filters
  const filteredNotes = data.notes.filter(note => {
      const matchesSearch = !searchQuery || note.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTags = activeFilters.length === 0 || (note.tags && note.tags.some(t => activeFilters.includes(t.name)));
      return matchesSearch && matchesTags;
  });

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
        onDoubleClick={handleDoubleClick}
    >
      <div style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: '0 0', width: '100%', height: '100%', position: 'absolute' }}>
          
          <div className="absolute pointer-events-none opacity-10 top-[-5000px] left-[-5000px] w-[10000px] h-[10000px]"
             style={{ backgroundImage: 'radial-gradient(#888 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
          />

          {data.frames.map(frame => (
            <Frame
                key={frame.id}
                frame={frame}
                scale={view.scale}
                onUpdate={handleUpdateFrame}
                onDelete={async (id) => {
                    await fetch(`http://localhost:4000/api/frames/${id}`, { 
                        method: 'DELETE', 
                        headers: { 'Authorization': `Bearer ${await window.nativeAPI.getSecretToken()}` }
                    });
                    fetchData();
                }}
            />
          ))}

          {data.notes.map(note => {
              const isMatch = filteredNotes.find(n => n.id === note.id);
              const isDimmed = (searchQuery || activeFilters.length > 0) && !isMatch;
              
              return (
                <Note 
                    key={note.id} 
                    note={note} 
                    scale={view.scale}
                    isDimmed={isDimmed}
                    onNoteUpdate={handleUpdateNote}
                    onNoteDelete={handleDeleteNote} // FIXED: Passed correctly
                    onTagAdd={(type, id, name) => handleTagAction('add', type, id, name)} // FIXED: Passed correctly
                    onTagRemove={(type, id, name) => handleTagAction('remove', type, id, name)} // FIXED: Passed correctly
                    onDataChange={fetchData}
                    onTagClick={onTagClick}
                />
              );
          })}

          {data.tasks && data.tasks.map(task => (
             <TaskWidget key={task.id} task={task} scale={view.scale} onUpdate={fetchData} />
          ))}

      </div>
      <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-mono">{Math.round(view.scale * 100)}%</div>
    </div>
  );
};
export default Canvas;