import React, { useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import TagManager from './TagManager'; // Re-use your TagManager!
import "react-resizable/css/styles.css";

const formatTime = (ms) => {
  const s = Math.floor((ms / 1000) % 60).toString().padStart(2, '0');
  const m = Math.floor((ms / 1000 / 60) % 60).toString().padStart(2, '0');
  const h = Math.floor(ms / 1000 / 3600).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const TaskWidget = ({ task, onUpdate, scale }) => {
  const nodeRef = useRef(null); // FIX: Added ref
  const [elapsed, setElapsed] = useState(task.total_time_ms || 0);

  // Timer Logic
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
       body: JSON.stringify({ rating: 5, notes: "Session finished" }) // Now works with migration
    });
    onUpdate(); 
  };


  // Tag Handlers
  const handleTagAction = async (action, tagName) => {
      const token = await window.nativeAPI.getSecretToken();
      const method = action === 'add' ? 'POST' : 'DELETE';
      const url = action === 'add' 
        ? `http://localhost:4000/api/tags/tasks/${task.id}` 
        : `http://localhost:4000/api/tasks/${task.id}/tags/${tagName}`;
      
      await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: action === 'add' ? JSON.stringify({ name: tagName }) : undefined
      });
      onUpdate();
  };

  return (
    <Draggable nodeRef={nodeRef} scale={scale} handle=".task-header">
      <div ref={nodeRef} className="absolute z-30 shadow-2xl"> 
        <ResizableBox 
            width={300} height={180} minConstraints={[250, 150]} 
            className="rounded-xl overflow-hidden border border-gray-700 flex flex-col transition-colors"
            style={{ backgroundColor: task.color_hex || '#1f2937', color: 'white' }}
            handle={<span className="react-resizable-handle react-resizable-handle-se" />}
        >
            {/* Header */}
            <div className="task-header bg-black/20 p-2 cursor-move flex justify-between items-center select-none backdrop-blur-sm">
                <span className="font-bold text-sm truncate px-1">{task.title}</span>
                <div className={`w-2 h-2 rounded-full ${task.is_running ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col p-3 relative">
                 <div className="text-center my-auto">
                     <div className="font-mono text-5xl font-bold tracking-widest drop-shadow-lg opacity-90">
                         {formatTime(elapsed)}
                     </div>
                 </div>

                 {/* Tags Area */}
                 <div className="mt-2 mb-8 overflow-hidden">
                    <TagManager 
                        tags={task.tags || []} 
                        onAddTag={(t) => handleTagAction('add', t)}
                        onRemoveTag={(t) => handleTagAction('remove', t)}
                        onDataChange={onUpdate}
                    />
                 </div>

                 {/* Controls */}
                 <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                     <button onClick={() => handleAction(task.is_running ? 'stop' : 'start')}
                        className={`flex-1 py-1.5 rounded text-xs font-bold uppercase shadow-lg transition-transform active:scale-95
                            ${task.is_running ? 'bg-red-500 hover:bg-red-400' : 'bg-green-500 hover:bg-green-400'}`}
                     >
                        {task.is_running ? 'STOP' : 'START'}
                     </button>
                 </div>
            </div>
        </ResizableBox>
      </div>
    </Draggable>
  );
};
export default TaskWidget;