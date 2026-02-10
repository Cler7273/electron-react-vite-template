import React, { useState, useEffect, useRef } from 'react';
import Note from './Note';
import Frame from './Frame';
import TaskWidget from './TaskWidget';

const Canvas = ({ searchQuery = "", activeFilters = [], onTagClick, showTasks, bgColor = '#242424'  }) => {
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
      window.dispatchEvent(new CustomEvent('cognicanvas:data-updated'));
    } catch (e) { console.error("Canvas Load Error:", e); }
  };

  useEffect(() => { fetchData(); }, []);

  // --- 1. FRAME MOVING LOGIC (Synchronized) ---
  const handleFrameDrag = (frameId, dx, dy) => {
    setData(prev => ({
      ...prev,
      // Move the Frame
      frames: prev.frames.map(f => f.id === frameId ? { ...f, pos_x: f.pos_x + dx, pos_y: f.pos_y + dy } : f),
      // Move the Children (Notes inside this frame)
      notes: prev.notes.map(n => n.frame_id === frameId ? { ...n, pos_x: n.pos_x + dx, pos_y: n.pos_y + dy } : n)
    }));
  };

  const handleFrameStop = async (id, finalPos) => {
    // 1. Update Frame in DB
    const token = await window.nativeAPI.getSecretToken();
    await fetch(`http://localhost:4000/api/frames/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(finalPos)
    });

    // 2. Update Children in DB (Batch update ideally, but separate calls for MVP)
    const children = data.notes.filter(n => n.frame_id === id);
    for (const child of children) {
        await fetch(`http://localhost:4000/api/notes/${child.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ pos_x: child.pos_x, pos_y: child.pos_y })
        });
    }
  };

  const handleUpdateFrame = async (id, changes) => {
    // For Collapse/Resize updates
    setData(prev => ({ ...prev, frames: prev.frames.map(f => f.id === id ? { ...f, ...changes } : f) }));
    const token = await window.nativeAPI.getSecretToken();
    await fetch(`http://localhost:4000/api/frames/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(changes)
    });
  };

  // --- 2. NOTE MOVING & CAPTURE LOGIC ---
  const handleNoteUpdate = async (id, changes) => {
    let updates = { ...changes };

    // If moving, check if we dropped into a frame
    if (changes.pos_x !== undefined && changes.pos_y !== undefined) {
        const note = data.notes.find(n => n.id === id);
        // Calculate Center of Note
        const cx = changes.pos_x + (note.width / 2);
        const cy = changes.pos_y + (note.height / 2);

        // Find a Frame that contains this center point
        const parentFrame = data.frames.find(f => 
            !f.is_collapsed && 
            cx >= f.pos_x && cx <= (f.pos_x + f.width) &&
            cy >= f.pos_y && cy <= (f.pos_y + f.height)
        );

        if (parentFrame) {
            updates.frame_id = parentFrame.id; // Capture!
        } else {
            updates.frame_id = null; // Release!
        }
    }

    // Optimistic Update
    setData(prev => ({ ...prev, notes: prev.notes.map(n => n.id === id ? { ...n, ...updates } : n) }));

    // API Call
    const token = await window.nativeAPI.getSecretToken();
    await fetch(`http://localhost:4000/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(updates)
    });
  };

  // --- 3. FILTERING & COLLAPSE LOGIC ---
  // We need to know which notes to render.
  
  // A. Filter Matching Logic
  const getFilterMatch = (note) => {
      const normContent = (note.content || "").toLowerCase();
      const normSearch = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || normContent.includes(normSearch);
      
      const matchesTags = activeFilters.length === 0 || 
        (note.tags && note.tags.some(tag => activeFilters.includes(tag.name)));

      return matchesSearch && matchesTags;
  };

  // B. Rendering List
  const notesToRender = data.notes.map(note => {
      // 1. Check Collapse
      if (note.frame_id) {
          const parent = data.frames.find(f => f.id === note.frame_id);
          // If parent exists and is collapsed, DO NOT RENDER this note
          if (parent && parent.is_collapsed) return null;
      }

      // 2. Check Filter (Dimming)
      const isMatch = getFilterMatch(note);
      // If there's an active search/filter, and this note doesn't match, it is dimmed.
      const isDimmed = (searchQuery || activeFilters.length > 0) && !isMatch;

      return (
          <Note 
            key={note.id} 
            note={note} 
            scale={view.scale}
            isDimmed={isDimmed} // Restore Dimming Prop
            onNoteUpdate={handleNoteUpdate}
            onNoteDelete={async (id) => {
                setData(p => ({...p, notes: p.notes.filter(n => n.id !== id)}));
                await fetch(`http://localhost:4000/api/notes/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${await window.nativeAPI.getSecretToken()}` }});
            }}
            onTagAdd={(type, id, name) => handleTagAction('add', type, id, name)}
            onTagRemove={(type, id, name) => handleTagAction('remove', type, id, name)}
            onDataChange={fetchData}
            onTagClick={onTagClick} 
          />
      );
  }).filter(Boolean); // Remove nulls (collapsed notes)

  // --- 4. HELPERS (Tag, Wheel, Add Frame) ---
  const handleTagAction = async (action, type, id, tagName) => {
      const token = await window.nativeAPI.getSecretToken();
      const url = action === 'add' ? `http://localhost:4000/api/tags/${type}/${id}` : `http://localhost:4000/api/${type}/${id}/tags/${tagName}`;
      await fetch(url, { method: action === 'add' ? 'POST' : 'DELETE', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: action === 'add' ? JSON.stringify({ name: tagName }) : undefined });
      fetchData();
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheelNative = (e) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      setView(prev => ({ ...prev, scale: Math.min(Math.max(prev.scale + delta, 0.1), 3) }));
    };
    container.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => container.removeEventListener('wheel', handleWheelNative);
  }, []);

  useEffect(() => {
    const onAddFrame = async () => {
        const token = await window.nativeAPI.getSecretToken();
        const newFrame = { title: "NEW FRAME", pos_x: (-view.x + 100) / view.scale, pos_y: (-view.y + 100) / view.scale, width: 400, height: 300 };
        await fetch('http://localhost:4000/api/frames', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(newFrame) });
        fetchData();
    };
    window.addEventListener('cognicanvas:add-frame', onAddFrame);
    return () => window.removeEventListener('cognicanvas:add-frame', onAddFrame);
  }, [view]);

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
        style={{ backgroundColor: bgColor }}
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
                onDrag={handleFrameDrag} // Pass the synchronized drag handler
                onDragStop={handleFrameStop} // Pass the saver
                onDelete={async (id) => {
                    await fetch(`http://localhost:4000/api/frames/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${await window.nativeAPI.getSecretToken()}` } });
                    fetchData();
                }}
            />
          ))}

          {/* RENDER THE COMPUTED LIST OF NOTES */}
          {notesToRender}

          {showTasks && data.tasks && data.tasks.map(task => (
             <TaskWidget key={task.id} task={task} scale={view.scale} onUpdate={fetchData} />
          ))}

      </div>
      <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-mono">{Math.round(view.scale * 100)}%</div>
    </div>
  );
};
export default Canvas;