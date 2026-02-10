import React, { useState, useEffect } from 'react';
import Draggable from 'react-draggable';

const formatTime = (ms) => {
  const s = Math.floor((ms / 1000) % 60);
  const m = Math.floor((ms / 1000 / 60) % 60);
  const h = Math.floor(ms / 1000 / 3600);
  return `${h}h ${m}m ${s}s`;
};

const TaskWidget = ({ task, onUpdate, scale }) => {
  // task includes: total_time_ms, is_running, current_session_start
  const [elapsed, setElapsed] = useState(task.total_time_ms || 0);

  useEffect(() => {
    let interval;
    if (task.is_running && task.current_session_start) {
      // Update UI every second without hitting DB
      interval = setInterval(() => {
        const currentSession = Date.now() - task.current_session_start;
        setElapsed((task.total_time_ms || 0) + currentSession);
      }, 1000);
    } else {
      setElapsed(task.total_time_ms || 0);
    }
    return () => clearInterval(interval);
  }, [task.is_running, task.current_session_start, task.total_time_ms]);

  const toggleTimer = async () => {
    const token = await window.nativeAPI.getSecretToken();
    const action = task.is_running ? 'stop' : 'start';
    
    await fetch(`http://localhost:4000/api/tasks/${task.id}/${action}`, {
       method: 'POST',
       headers: { 'Authorization': `Bearer ${token}` }
    });
    
    // Trigger parent refresh to get new DB state
    onUpdate(); 
  };

  return (
    <Draggable scale={scale} handle=".drag-handle">
      <div className="absolute z-30 w-64 bg-white rounded-lg shadow-xl border-l-4 border-blue-600 overflow-hidden group">
        
        {/* Drag Handle */}
        <div className="drag-handle h-4 bg-gray-100 cursor-move flex items-center justify-end px-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto"/>
        </div>

        <div className="p-4 pt-1">
          <h3 className="font-bold text-gray-800 text-lg leading-tight mb-1">{task.title}</h3>
          
          <div className={`font-mono text-3xl text-center my-3 tracking-wider ${task.is_running ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
            {formatTime(elapsed)}
          </div>

          <button 
            onClick={toggleTimer}
            className={`w-full py-2 rounded text-white font-bold uppercase tracking-widest text-xs transition-colors
              ${task.is_running ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
            `}
          >
            {task.is_running ? 'Stop Timer' : 'Start Timer'}
          </button>
        </div>
      </div>
    </Draggable>
  );
};

export default TaskWidget;