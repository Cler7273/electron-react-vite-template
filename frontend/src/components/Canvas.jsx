import React, { useState, useEffect, useRef } from 'react';
import Note from './Note';
import Frame from './Frame';
import TaskWidget from './TaskWidget';

const Canvas = ({ searchQuery = "", activeFilters = [], onTagClick, showTasks, bgColor = '#242424' }) => {
  const [data, setData] = useState({ notes: [], frames: [], tasks: [] });
  const viewRef = useRef({ x: 0, y: 0, scale: 1 });
  const [forceRender, setForceRender] = useState(0); 
  const [isPanning, setIsPanning] = useState(false);
  const containerRef = useRef(null);

  // --- STATE MANAGEMENT ---
  const setView = (newView) => {
      viewRef.current = { ...viewRef.current, ...newView };
      setForceRender(prev => prev + 1);
  };

  const fetchData = async () => {
    try {
      const token = await window.nativeAPI.getSecretToken();
      const res = await fetch('http://localhost:4000/api/all', { headers: { 'Authorization': `Bearer ${token}` } });
      const json = await res.json();
      setData(json);
      window.dispatchEvent(new CustomEvent('cognicanvas:data-updated'));
    } catch (e) { console.error(e); }
  };

  useEffect(() => { 
    fetchData(); 
    const container = containerRef.current;
    if (!container) return;

    // Native Wheel Handler for smooth zoom
    const handleWheelNative = (e) => {
      e.preventDefault();
      const current = viewRef.current;
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - current.x) / current.scale;
      const worldY = (mouseY - current.y) / current.scale;

      const delta = -e.deltaY * 0.001;
      const newScale = Math.min(Math.max(current.scale + delta, 0.05), 4);

      const newX = mouseX - (worldX * newScale);
      const newY = mouseY - (worldY * newScale);

      setView({ x: newX, y: newY, scale: newScale });
    };

    container.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => container.removeEventListener('wheel', handleWheelNative);
  }, []);

  // --- CAMERA TELEPORT ---
  const focusOnItem = (type, id) => {
      let target = null;
      const itemId = parseInt(id);

      if (type === 'note') target = data.notes.find(n => n.id === itemId);
      else if (type === 'frame') target = data.frames.find(f => f.id === itemId);

      if (target) {
          const targetCenterX = target.pos_x + (target.width / 2);
          const targetCenterY = target.pos_y + (target.height / 2);

          const canvasWidth = containerRef.current?.clientWidth || window.innerWidth;
          const canvasHeight = containerRef.current?.clientHeight || window.innerHeight;

          const newScale = 1;
          const newX = (canvasWidth / 2) - (targetCenterX * newScale);
          const newY = (canvasHeight / 2) - (targetCenterY * newScale);

          setView({ x: newX, y: newY, scale: newScale });
      }
  };

  // --- ACTIONS ---
  const handleDoubleClick = async (e) => {
    if (e.target !== containerRef.current && e.target.id !== 'transform-layer') return;
    const rect = containerRef.current.getBoundingClientRect();
    const current = viewRef.current;
    const x = ((e.clientX - rect.left) - current.x) / current.scale;
    const y = ((e.clientY - rect.top) - current.y) / current.scale;

    const token = await window.nativeAPI.getSecretToken();
    await fetch('http://localhost:4000/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ content: "New Note", pos_x: x - 100, pos_y: y - 100, width: 200, height: 200, color_hex: "#fff000" })
    });
    fetchData();
  };

  const handleNoteUpdateDrag = async (id, changes) => {
    let updates = { ...changes };
    // Check for frame capture if moving
    if (changes.pos_x !== undefined) {
        const note = data.notes.find(n => n.id === id);
        const cx = changes.pos_x + (note.width / 2);
        const cy = changes.pos_y + (note.height / 2);
        const parentFrame = data.frames.find(f => !f.is_collapsed && cx >= f.pos_x && cx <= (f.pos_x + f.width) && cy >= f.pos_y && cy <= (f.pos_y + f.height));
        updates.frame_id = parentFrame ? parentFrame.id : null;
    }
    // Optimistic Update
    setData(prev => ({ ...prev, notes: prev.notes.map(n => n.id === id ? { ...n, ...updates } : n) }));
    
    const token = await window.nativeAPI.getSecretToken();
    await fetch(`http://localhost:4000/api/notes/${id}`, { 
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
        body: JSON.stringify(updates) 
    });
  };

  const handleFrameDrag = (frameId, dx, dy) => {
    // Synchronous movement of frame + children
    setData(prev => ({
      ...prev,
      frames: prev.frames.map(f => f.id === frameId ? { ...f, pos_x: f.pos_x + dx, pos_y: f.pos_y + dy } : f),
      notes: prev.notes.map(n => n.frame_id === frameId ? { ...n, pos_x: n.pos_x + dx, pos_y: n.pos_y + dy } : n)
    }));
  };

  const handleFrameStop = async (id, finalPos) => {
    const token = await window.nativeAPI.getSecretToken();
    // 1. Save Frame
    await fetch(`http://localhost:4000/api/frames/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(finalPos)
    });
    // 2. Save Children
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
    setData(prev => ({ ...prev, frames: prev.frames.map(f => f.id === id ? { ...f, ...changes } : f) }));
    const token = await window.nativeAPI.getSecretToken();
    await fetch(`http://localhost:4000/api/frames/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(changes)
    });
  };

  const handleTagAction = async (action, type, id, tagName) => {
    const token = await window.nativeAPI.getSecretToken();
    const url = action === 'add' ? `http://localhost:4000/api/tags/${type}/${id}` : `http://localhost:4000/api/${type}/${id}/tags/${tagName}`;
    await fetch(url, { method: action === 'add' ? 'POST' : 'DELETE', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: action === 'add' ? JSON.stringify({ name: tagName }) : undefined });
    fetchData();
  };

  // --- VISUAL FILTERS ---
  const getFilterMatch = (note) => {
      const normContent = (note.content || "").toLowerCase();
      const normSearch = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || normContent.includes(normSearch);
      const matchesTags = activeFilters.length === 0 || (note.tags && note.tags.some(tag => activeFilters.includes(tag.name)));
      return matchesSearch && matchesTags;
  };

  const notesToRender = data.notes.map(note => {
      if (note.frame_id) {
          const parent = data.frames.find(f => f.id === note.frame_id);
          if (parent && parent.is_collapsed) return null;
      }
      const isMatch = getFilterMatch(note);
      const isDimmed = (searchQuery || activeFilters.length > 0) && !isMatch;

      return (
          <Note 
            key={note.id} note={note} scale={viewRef.current.scale} isDimmed={isDimmed} 
            onNoteUpdate={handleNoteUpdateDrag}
            onNoteDelete={async (id) => {
                setData(p => ({...p, notes: p.notes.filter(n => n.id !== id)}));
                await fetch(`http://localhost:4000/api/notes/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${await window.nativeAPI.getSecretToken()}` }});
            }}
            onTagAdd={(type, id, name) => handleTagAction('add', type, id, name)}
            onTagRemove={(type, id, name) => handleTagAction('remove', type, id, name)}
            onDataChange={fetchData}
            onTagClick={onTagClick} 
            onNavigate={focusOnItem} 
          />
      );
  }).filter(Boolean);

  useEffect(() => {
    const onAddFrame = async () => {
        const token = await window.nativeAPI.getSecretToken();
        const current = viewRef.current;
        const newFrame = { 
            title: "NEW FRAME", 
            pos_x: (-current.x + 100) / current.scale, 
            pos_y: (-current.y + 100) / current.scale, 
            width: 400, 
            height: 300 
        };
        await fetch('http://localhost:4000/api/frames', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(newFrame) });
        fetchData();
    };
    window.addEventListener('cognicanvas:add-frame', onAddFrame);
    return () => window.removeEventListener('cognicanvas:add-frame', onAddFrame);
  }, []);

   return (
    <div 
        ref={containerRef}
        onDoubleClick={handleDoubleClick}
        onMouseDown={(e) => { if(e.button===1 || e.buttons===4 || (e.button===0 && e.altKey)) setIsPanning(true); }}
        onMouseMove={(e) => { if(isPanning) setView({ x: viewRef.current.x + e.movementX, y: viewRef.current.y + e.movementY }); }}
        onMouseUp={() => setIsPanning(false)}
        className="w-full h-full overflow-hidden relative cursor-default"
        style={{ backgroundColor: bgColor }}
    >
      <div 
        id="transform-layer"
        style={{ 
            transform: `translate(${viewRef.current.x}px, ${viewRef.current.y}px) scale(${viewRef.current.scale})`, 
            transformOrigin: '0 0',
            position: 'absolute',
            width: '100%', height: '100%',
            pointerEvents: 'none' 
        }}
      >
          {/* GRID: Massive coverage */}
          <div className="absolute opacity-10 top-[-200000px] left-[-200000px] w-[400000px] h-[400000px] pointer-events-none"
             style={{ backgroundImage: 'radial-gradient(#888 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
          />

          <div className="pointer-events-auto">
            {data.frames.map(frame => (
                <Frame 
                    key={frame.id} frame={frame} scale={viewRef.current.scale} 
                    onUpdate={handleUpdateFrame} 
                    onDelete={async (id) => {
                        await fetch(`http://localhost:4000/api/frames/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${await window.nativeAPI.getSecretToken()}` }});
                        fetchData();
                    }}
                    onDrag={handleFrameDrag}
                    onDragStop={handleFrameStop}
                />
            ))}
            
            {notesToRender}
            
            {/* TASK WIDGETS */}
            {showTasks && data.tasks.map(task => (
                <TaskWidget key={task.id} task={task} scale={viewRef.current.scale} onUpdate={fetchData} />
            ))}
          </div>
      </div>
      
      {/* HUD Info */}
      <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-mono select-none pointer-events-none">
          {Math.round(viewRef.current.scale * 100)}% | {Math.round(viewRef.current.x)},{Math.round(viewRef.current.y)}
      </div>
    </div>
  );
};

export default Canvas;