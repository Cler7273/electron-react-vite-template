import React, { useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import "react-resizable/css/styles.css";

const formatTime = (ms) => {
  const s = Math.floor((ms / 1000) % 60);
  const m = Math.floor((ms / 1000 / 60) % 60);
  const h = Math.floor(ms / 1000 / 3600);
  // Pad with leading zeros for that digital clock look
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const TaskWidget = ({ task, onUpdate, scale }) => {
  const [elapsed, setElapsed] = useState(task.total_time_ms || 0);

  useEffect(() => {
    let interval;
    if (task.is_running && task.current_session_start) {
      interval = setInterval(() => {
        setElapsed((task.total_time_ms || 0) + (Date.now() - task.current_session_start));
      }, 1000);
    } else {
      setElapsed(task.total_time_ms || 0);
    }
    return () => clearInterval(interval);
  }, [task.is_running, task.current_session_start, task.total_time_ms]);

  const handleAction = async (action) => {
    const token = await window.nativeAPI.getSecretToken();
    
    // Future: Open a modal here to ask for "Efficiency Rating" when stopping
    // For now, simple stop.
    await fetch(`http://localhost:4000/api/tasks/${task.id}/${action}`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
       body: JSON.stringify(action === 'stop' ? { rating: 5 } : {}) 
    });
    onUpdate(); 
  };

  return (
    <Draggable scale={scale} handle=".task-header">
      {/* Absolute positioning handled by Canvas */}
      <div className="absolute z-30 shadow-2xl"> 
        <ResizableBox 
            width={250} 
            height={150} 
            minConstraints={[200, 120]} 
            className="bg-gray-900 text-white rounded-xl overflow-hidden border border-gray-700 flex flex-col"
            handle={<span className="react-resizable-handle react-resizable-handle-se" />}
        >
            {/* Header */}
            <div className="task-header bg-gray-800 p-2 cursor-move flex justify-between items-center select-none">
                <span className="font-bold text-sm truncate px-1">{task.title}</span>
                <div className={`w-3 h-3 rounded-full ${task.is_running ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-2 relative">
                 {/* Digital Clock Display */}
                 <div className="font-mono text-4xl font-bold tracking-widest text-blue-400 drop-shadow-md">
                     {formatTime(elapsed)}
                 </div>
                 
                 {/* Date Stamp (Today) */}
                 <div className="text-xs text-gray-500 mt-1">
                     {new Date().toLocaleDateString()}
                 </div>

                 {/* Controls */}
                 <div className="absolute bottom-2 w-full px-4 flex gap-2">
                     {!task.is_running ? (
                         <button 
                            onClick={() => handleAction('start')}
                            className="flex-1 bg-green-600 hover:bg-green-500 text-white py-1 rounded text-xs font-bold uppercase"
                         >
                            Start
                         </button>
                     ) : (
                         <button 
                            onClick={() => handleAction('stop')}
                            className="flex-1 bg-red-600 hover:bg-red-500 text-white py-1 rounded text-xs font-bold uppercase"
                         >
                            Stop
                         </button>
                     )}
                 </div>
            </div>
        </ResizableBox>
      </div>
    </Draggable>
  );
};

export default TaskWidget;