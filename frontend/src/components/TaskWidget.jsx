// frontend/src/components/TaskWidget.jsx
import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import { toggleTask, updateTask, terminateTask } from '../api';
import "react-resizable/css/styles.css";

const formatTime = (ms) => {
  const s = Math.floor((ms / 1000) % 60).toString().padStart(2, '0');
  const m = Math.floor((ms / 1000 / 60) % 60).toString().padStart(2, '0');
  const h = Math.floor(ms / 1000 / 3600).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const NOTE_COLORS = [
    { hex: '#1f2937', name: 'Dark' },
    { hex: '#7f1d1d', name: 'Red' },
    { hex: '#7c2d12', name: 'Orange' },
    { hex: '#14532d', name: 'Green' },
    { hex: '#1e3a8a', name: 'Blue' },
    { hex: '#581c87', name: 'Purple' }
];

const TaskWidget = ({ task, onUpdate, scale = 1 }) => {
  const nodeRef = useRef(null); 
  const [elapsed, setElapsed] = useState(task.total_time_ms || 0);
  const [showColorMenu, setShowColorMenu] = useState(false);

  // Timer Sync
  useEffect(() => {
    let interval;
    if (task.is_running && task.current_session_start) {
      const start = task.current_session_start;
      const base = task.total_time_ms || 0;
      interval = setInterval(() => {
        setElapsed(base + (Date.now() - start));
      }, 1000);
    } else {
      setElapsed(task.total_time_ms || 0);
    }
    return () => clearInterval(interval);
  }, [task.is_running, task.current_session_start, task.total_time_ms]);

  const handleToggle = async () => {
    await toggleTask(task.id, task.is_running ? 'stop' : 'start');
    onUpdate();
  };

  const handleTerminate = async () => {
    if(confirm("Terminate task? (Moves to History)")) {
        await terminateTask(task.id);
        onUpdate();
    }
  };

  const changeColor = async (hex) => {
    await updateTask(task.id, { color_hex: hex });
    setShowColorMenu(false);
    onUpdate();
  };

  return (
    <Draggable nodeRef={nodeRef} scale={scale} handle=".drag-handle">
      <div ref={nodeRef} className="absolute z-30 shadow-2xl group"> 
        <ResizableBox 
            width={280} 
            height={160} 
            minConstraints={[200, 120]} 
            className="rounded-xl overflow-hidden border border-gray-600 transition-colors bg-opacity-95 backdrop-blur-md" 
            style={{ backgroundColor: task.color_hex || '#1f2937' }}
        >
            <div className="w-full h-full flex flex-col relative text-gray-100">
                
                {/* Header / Drag Handle */}
                <div className="drag-handle bg-black/30 p-2 cursor-move flex justify-between items-center select-none h-10">
                    <span className="font-bold text-xs uppercase tracking-wider truncate max-w-[180px]">{task.title}</span>
                    <div className="flex gap-2">
                        <button onClick={() => setShowColorMenu(!showColorMenu)} className="w-3 h-3 rounded-full bg-white/20 hover:bg-white/50" title="Color" />
                        <button onClick={handleTerminate} className="text-white/40 hover:text-red-500 font-bold px-1">×</button>
                    </div>
                </div>

                {/* Color Menu Overlay */}
                {showColorMenu && (
                    <div className="absolute top-10 left-0 right-0 bg-black/80 z-20 flex justify-around p-2 animate-in fade-in">
                        {NOTE_COLORS.map(c => (
                            <button key={c.hex} onClick={() => changeColor(c.hex)} style={{backgroundColor: c.hex}} className="w-6 h-6 rounded-full border border-gray-400 hover:scale-110" />
                        ))}
                    </div>
                )}

                {/* Main Content */}
                <div className="flex-1 flex flex-col justify-center items-center relative">
                     <div className="font-mono text-5xl font-bold tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                         {formatTime(elapsed)}
                     </div>
                     <div className="text-[10px] text-white/50 mt-1 uppercase">
                        {task.is_running ? 'Focusing...' : 'Paused'}
                     </div>
                </div>

                {/* Footer Controls */}
                <div className="p-2 bg-black/10">
                     <button 
                        onClick={handleToggle} 
                        className={`w-full py-1.5 rounded text-xs font-bold uppercase shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2
                            ${task.is_running ? 'bg-red-600/90 hover:bg-red-500' : 'bg-green-600/90 hover:bg-green-500'}`}
                     >
                        {task.is_running ? <span>❚❚ STOP</span> : <span>▶ START</span>}
                     </button>
                </div>
            </div>
        </ResizableBox>
      </div>
    </Draggable>
  );
};

export default TaskWidget;