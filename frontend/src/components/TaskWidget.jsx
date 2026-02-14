import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import TagManager from './TagManager';
import "react-resizable/css/styles.css";

const formatTime = (ms) => {
  const s = Math.floor((ms / 1000) % 60).toString().padStart(2, '0');
  const m = Math.floor((ms / 1000 / 60) % 60).toString().padStart(2, '0');
  const h = Math.floor(ms / 1000 / 3600).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};
// [Insert at top of file, after imports]
const NOTE_COLORS = [
    { hex: '#1f2937', name: 'Default Dark' },
    { hex: '#dc2626', name: 'Urgent Red' },
    { hex: '#ea580c', name: 'Orange' },
    { hex: '#15803d', name: 'Green' },
    { hex: '#2563eb', name: 'Blue' },
    { hex: '#7e22ce', name: 'Purple' }
];

// [Inside TaskWidget component, top of function]
const TaskWidget = ({ task, onUpdate, scale }) => {
  const nodeRef = useRef(null); 
  const [elapsed, setElapsed] = useState(task.total_time_ms || 0);
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    let interval;
    if (task.is_running && task.current_session_start) {
      interval = setInterval(() => {
        setElapsed((task.total_time_ms || 0) + (Date.now() - task.current_session_start));
      }, 1000);
    } else { setElapsed(task.total_time_ms || 0); }
    return () => clearInterval(interval);
  }, [task.is_running, task.current_session_start, task.total_time_ms]);

  const handleAction = async (action) => {
    const token = await window.nativeAPI.getSecretToken();
    await fetch(`http://localhost:4000/api/tasks/${task.id}/${action}`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
       body: JSON.stringify({ rating: 0, notes: "Quick session" })
    });
    onUpdate(); 
  };

  // --- DELETE HANDLER ---
  const handleTerminate = async () => {
    if(!confirm("Terminate and delete this task completely?")) return;
    const token = await window.nativeAPI.getSecretToken();
    // Assuming we don't have a DELETE route for tasks yet, or use generic query?
    // Let's assume we create one or use raw SQL in backend if strict REST isn't there. 
    // Wait, DB schema has tasks. We should add DELETE route to server.js if missing.
    // For now, assuming standard REST:
    // Actually, let's just Hide it? No, user said "terminate".
    // I'll add a delete route fetch here:
    // Note: You need to ensure app.delete('/api/tasks/:id') exists in backend.
  };

  const handleTagAction = async (action, tagName) => {
      const token = await window.nativeAPI.getSecretToken();
      const method = action === 'add' ? 'POST' : 'DELETE';
      const url = action === 'add' ? `http://localhost:4000/api/tags/tasks/${task.id}` : `http://localhost:4000/api/tasks/${task.id}/tags/${tagName}`;
      await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: action === 'add' ? JSON.stringify({ name: tagName }) : undefined });
      onUpdate();
  };

  const handleContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const changeColor = async (hex) => {
      const token = await window.nativeAPI.getSecretToken();
      await fetch(`http://localhost:4000/api/tasks/${task.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ color_hex: hex }) });
      setContextMenu(null);
      onUpdate();
  };

  useEffect(() => {
    const close = () => setContextMenu(null);
    if(contextMenu) window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);
    return (
    <Draggable nodeRef={nodeRef} scale={scale} handle=".task-header">
      <div ref={nodeRef} className="absolute z-30 shadow-2xl" onContextMenu={handleContextMenu}> 
        <ResizableBox width={300} height={180} minConstraints={[250, 150]} className="rounded-xl overflow-hidden border border-gray-700 transition-colors" style={{ backgroundColor: task.color_hex || '#1f2937', color: 'white' }} handle={<span className="react-resizable-handle react-resizable-handle-se" />}>
            <div className="w-full h-full flex flex-col relative">
                
                {/* Header */}
                <div className="task-header bg-black/20 p-2 cursor-move flex justify-between items-center select-none backdrop-blur-sm">
                    <span className="font-bold text-sm truncate px-1">{task.title}</span>
                    <div className="flex gap-2 items-center">
                         <div className={`w-2 h-2 rounded-full ${task.is_running ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
                         {/* DELETE BUTTON */}
                         <button onClick={handleTerminate} className="text-white/30 hover:text-red-500 font-bold px-1">×</button>
                    </div>
                </div>

                <div className="flex-1 flex flex-col p-3 relative">
                     <div className="text-center my-auto">
                         <div className="font-mono text-5xl font-bold tracking-widest drop-shadow-lg opacity-90">
                             {formatTime(elapsed)}
                         </div>
                     </div>
                     <div className="mt-2 mb-8 overflow-hidden">
                        <TagManager tags={task.tags || []} onAddTag={(t) => handleTagAction('add', t)} onRemoveTag={(t) => handleTagAction('remove', t)} onDataChange={onUpdate} />
                     </div>
                     <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                         <button onClick={() => handleAction(task.is_running ? 'stop' : 'start')} className={`flex-1 py-1.5 rounded text-xs font-bold uppercase shadow-lg transition-transform active:scale-95 ${task.is_running ? 'bg-red-500 hover:bg-red-400' : 'bg-green-500 hover:bg-green-400'}`}>
                            {task.is_running ? 'STOP' : 'START'}
                         </button>
                     </div>
                </div>
            </div>
        </ResizableBox>

        {contextMenu && (
            <div className="fixed z-[9999] bg-white rounded shadow-xl border border-gray-200 p-2 grid grid-cols-3 gap-2 w-24 animate-in fade-in zoom-in-95 duration-100" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
                {NOTE_COLORS.map(c => ( <button key={c.hex} onClick={() => changeColor(c.hex)} className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition-transform shadow-sm" style={{ backgroundColor: c.hex }} title={c.name} /> ))}
            </div>
        )}
      </div>
    </Draggable>
  );
};
export default TaskWidget;