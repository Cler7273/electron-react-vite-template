// frontend/src/components/TaskWidget.jsx
import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import * as API from '../api'; // Ensure API is imported for polling/actions
import "react-resizable/css/styles.css";

// --- HELPER: TIME FORMAT ---
const formatTime = (ms) => {
    if (!ms || isNaN(ms)) return "00:00:00";
    const s = Math.floor((ms / 1000) % 60).toString().padStart(2, '0');
    const m = Math.floor((ms / 1000 / 60) % 60).toString().padStart(2, '0');
    const h = Math.floor(ms / 1000 / 3600).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

const TaskWidget = ({ task: initialTask, onUpdate, scale = 1 }) => {
    const nodeRef = useRef(null);
    
    // --- STATE ---
    // We use localTask to allow independent syncing without waiting for parent re-render
    const [localTask, setLocalTask] = useState(initialTask);
    const [elapsed, setElapsed] = useState(0);
    const [isVisible, setIsVisible] = useState(false); // Default hidden
    const [noteDraft, setNoteDraft] = useState("");
    
    // Random Position on Mount
    const [defaultPos] = useState({
        x: Math.random() * (window.innerWidth - 200) + 50,
        y: Math.random() * (window.innerHeight - 200) + 50
    });

    // --- SYNC LOGIC ---
    const fetchLatest = async () => {
        try {
            // Ideally we'd have a specific endpoint, but fetching all is safe for now or /api/tasks/:id
            const data = await API.getTasks(); 
            const updated = data.tasks.find(t => t.id === localTask.id);
            if (updated) {
                // AUTO-SHOW logic: If task started remotely and we are hidden, Show us.
                if (updated.is_running && !localTask.is_running) {
                    setIsVisible(true);
                }
                setLocalTask(updated);
            }
        } catch (e) { console.error("Widget sync failed", e); }
    };

    // Global Event Listener for Sync
    useEffect(() => {
        const handleRemote = () => fetchLatest();
        window.addEventListener('cognicanvas:data-updated', handleRemote);
        
        // Initial check: if running on mount, show immediately
        if (initialTask.is_running) setIsVisible(true);
        setLocalTask(initialTask);

        return () => window.removeEventListener('cognicanvas:data-updated', handleRemote);
    }, [initialTask.id]); // Dep on ID, not full task object to avoid loops

    // Timer Logic
    useEffect(() => {
        const calculateElapsed = () => {
            let base = parseInt(localTask.total_time_ms) || 0;
            if (localTask.is_running && localTask.current_session_start) {
                const start = new Date(localTask.current_session_start).getTime();
                if (!isNaN(start)) base += (Date.now() - start);
            }
            return base;
        };

        setElapsed(calculateElapsed()); // Immediate set

        let interval;
        if (localTask.is_running) {
            interval = setInterval(() => {
                setElapsed(calculateElapsed());
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [localTask]);

    // --- ACTIONS ---
    const handleToggle = async (e) => {
        e.stopPropagation(); // Prevent drag
        const action = localTask.is_running ? 'stop' : 'start';
        // If stopping, send note if exists
        const body = (action === 'stop' && noteDraft) ? { manual_note: noteDraft } : {};
        
        await API.toggleTask(localTask.id, action, body);
        
        if (action === 'stop') setNoteDraft(""); // Clear note on stop
        
        fetchLatest(); // Immediate local refresh
        window.dispatchEvent(new CustomEvent('cognicanvas:data-updated')); // Notify others
    };

    const handleHide = () => setIsVisible(false);

    if (!localTask || !isVisible) return null;

    return (
        <Draggable nodeRef={nodeRef} scale={scale} handle=".widget-drag-handle" defaultPosition={defaultPos}>
            <div ref={nodeRef} className="absolute z-50 group">
                <ResizableBox
                    width={140}
                    height={140}
                    minConstraints={[120, 120]}
                    maxConstraints={[400, 400]}
                    resizeHandles={['se', 'e', 's']}
                    className="rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-md border border-white/10 flex flex-col transition-colors"
                    style={{ 
                        backgroundColor: localTask.color_hex ? `${localTask.color_hex}E6` : '#1f2937E6' 
                    }}
                >
                    {/* HEADER / GRIP */}
                    <div className="widget-drag-handle h-6 bg-black/20 cursor-move flex justify-between items-center px-2 shrink-0 group-hover:bg-black/40 transition-colors">
                        <div className="flex gap-1">
                            <div className={`w-2 h-2 rounded-full ${localTask.is_running ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
                        </div>
                        <button 
                            onClick={handleHide} 
                            className="text-white/50 hover:text-white text-[10px] font-bold"
                            title="Hide Widget"
                        >
                            —
                        </button>
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 flex flex-col relative p-2 min-h-0">
                        
                        {/* Title (Truncated) */}
                        <div className="text-center mb-1">
                            <h4 className="text-xs font-bold text-white drop-shadow-md truncate px-1 cursor-default" title={localTask.title}>
                                {localTask.title}
                            </h4>
                        </div>

                        {/* Timer */}
                        <div className="flex-1 flex items-center justify-center">
                            <span className="font-mono text-2xl font-bold text-white tracking-wider drop-shadow-lg">
                                {formatTime(elapsed)}
                            </span>
                        </div>

                        {/* Controls Layer */}
                        <div className="mt-2 space-y-2">
                             {/* Input only shows if height allows (simple responsive logic via CSS or just flex) */}
                             {localTask.is_running && (
                                <input 
                                    type="text" 
                                    value={noteDraft}
                                    onChange={(e) => setNoteDraft(e.target.value)}
                                    placeholder="Quick note..."
                                    className="w-full bg-black/20 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white placeholder-white/50 focus:outline-none focus:bg-black/40 transition-all"
                                    onMouseDown={(e) => e.stopPropagation()} // Allow text selection without drag
                                />
                             )}

                            <button 
                                onClick={handleToggle}
                                onMouseDown={(e) => e.stopPropagation()}
                                className={`w-full py-1.5 rounded-lg text-[10px] font-bold uppercase shadow-lg transition-transform active:scale-95 border border-white/10
                                    ${localTask.is_running 
                                        ? 'bg-red-500/80 hover:bg-red-500 text-white' 
                                        : 'bg-green-500/80 hover:bg-green-500 text-white'}`}
                            >
                                {localTask.is_running ? 'Stop' : 'Start'}
                            </button>
                        </div>
                    </div>
                </ResizableBox>
            </div>
        </Draggable>
    );
};

export default TaskWidget;