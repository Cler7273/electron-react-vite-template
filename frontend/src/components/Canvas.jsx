import React, { useState, useEffect } from 'react';
import Note from './Note'; // Make sure your old Note.jsx exists in components
// If Note.jsx is missing, I can provide it, but it seems it was in your file tree.

const Canvas = ({ onAddNote }) => {
  const [data, setData] = useState({ notes: [], frames: [] });
  const [scale, setScale] = useState(1);

  // Use the Unified API Fetch
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
  }, []);

  const handleUpdateNote = async (id, changes) => {
    // Optimistic UI update
    setData(prev => ({
      ...prev,
      notes: prev.notes.map(n => n.id === id ? { ...n, ...changes } : n)
    }));

    // API Call
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
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` } 
    });
  };

  // Double click background to add note
  const handleDoubleClick = async (e) => {
    if (e.target !== e.currentTarget) return; // Only if clicking empty space
    
    const token = await window.nativeAPI.getSecretToken();
    const newNote = {
      content: "New Note",
      pos_x: e.nativeEvent.offsetX,
      pos_y: e.nativeEvent.offsetY,
      width: 200,
      height: 200,
      color_hex: "#fff000" // Classic Yellow
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
      className="w-full h-full overflow-hidden relative bg-[#242424]"
      onDoubleClick={handleDoubleClick}
      style={{ 
        backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', 
        backgroundSize: '20px 20px' 
      }}
    >
      {data.notes.map(note => (
        <Note 
          key={note.id} 
          note={note} 
          scale={scale}
          onNoteUpdate={handleUpdateNote}
          onNoteDelete={handleDeleteNote}
          onTagAdd={() => {}} // Implement later
          onTagRemove={() => {}} // Implement later
          onDataChange={fetchData}
          onNavigateTo={() => {}}
        />
      ))}
    </div>
  );
};

export default Canvas;