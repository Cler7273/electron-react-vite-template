// frontend/src/components/TaskWidget.jsx
import React, { useState, useEffect, useRef } from "react";
import Draggable from "react-draggable";
import { ResizableBox } from "react-resizable";
import * as API from "../api";
import "react-resizable/css/styles.css";

// --- HELPER: TIME FORMAT ---
const formatTime = (ms) => {
    if (!ms || ms < 0 || isNaN(ms)) return "00:00:00";
    const s = Math.floor((ms / 1000) % 60)
        .toString()
        .padStart(2, "0");
    const m = Math.floor((ms / 1000 / 60) % 60)
        .toString()
        .padStart(2, "0");
    const h = Math.floor(ms / 1000 / 3600)
        .toString()
        .padStart(2, "0");
    return `${h}:${m}:${s}`;
};

const TaskWidget = ({ task: initialTask, scale = 1 }) => {
    const nodeRef = useRef(null);

    // --- STATE ---

    const [totalElapsed, setTotalElapsed] = useState(0);
    const [sessionElapsed, setSessionElapsed] = useState(0);
    const [noteDraft, setNoteDraft] = useState("");

    const [localTask, setLocalTask] = useState(initialTask);
    const [isVisible, setIsVisible] = useState(initialTask.is_running);

    const [defaultPos] = useState({
        x: Math.random() * (window.innerWidth - 300) + 100,
        y: Math.random() * (window.innerHeight - 300) + 100,
    });
    // PERSISTENCE: Check session on mount
    useEffect(() => {
        const resume = async () => {
            const active = await API.getActiveSession();
            if (active && active.id === initialTask.id) {
                setLocalTask((prev) => ({ ...prev, ...active, is_running: true }));
                setIsVisible(true);
            }
        };
        resume();
    }, []);
    // --- MISSION: DATA BINDING (Sync with Global System) ---
    const fetchLatest = async () => {
        try {
            const data = await API.getTasks();
            const updated = data.tasks.find((t) => t.id === localTask.id);
            if (updated) {
                // If it was started in the TasksApp, the widget detects it here and appears
                if (updated.is_running && !localTask.is_running) {
                    setIsVisible(true);
                }
                setLocalTask(updated);
            }
        } catch (e) {
            console.error("Widget sync failed", e);
        }
    };
    useEffect(() => {
        const checkGlobalPersistence = async () => {
            try {
                const active = await API.getActiveSession();
                // If the DB says this specific task is running, force it visible
                if (active && active.id === initialTask.id) {
                    setLocalTask({ ...initialTask, ...active, is_running: true });
                    setIsVisible(true);
                }
            } catch (e) {
                console.error("Persistence check failed", e);
            }
        };
        checkGlobalPersistence();
    }, [initialTask.id]);

    useEffect(() => {
        // 1. Remote Data Sync
        const handleRemote = () => fetchLatest();

        // 2. Specific Show/Hide command from Dashboard
        const handleToggleRequest = (e) => {
            if (e.detail.taskId === localTask.id) {
                setIsVisible((prev) => !prev);
            }
        };

        window.addEventListener("cognicanvas:data-updated", handleRemote);
        window.addEventListener("task:toggle-visibility", handleToggleRequest);

        if (initialTask.is_running) setIsVisible(true);
        setLocalTask(initialTask);

        return () => {
            window.removeEventListener("cognicanvas:data-updated", handleRemote);
            window.removeEventListener("task:toggle-visibility", handleToggleRequest);
        };
    }, [initialTask.id]);

    // --- DUAL TIMER LOGIC ---
    useEffect(() => {
        const updateClocks = () => {
            if (!localTask.is_running) {
                setTotalElapsed(parseInt(localTask.total_time_ms) || 0);
                setSessionElapsed(0);
                return;
            }

            const startTime = new Date(localTask.current_session_start).getTime();
            const now = Date.now();
            const sessionDiff = Math.max(0, now - startTime);

            setSessionElapsed(sessionDiff);
            setTotalElapsed((parseInt(localTask.total_time_ms) || 0) + sessionDiff);
        };

        updateClocks();
        const interval = setInterval(updateClocks, 1000);
        return () => clearInterval(interval);
    }, [localTask]);

    // --- ACTIONS ---
    const handleToggle = async (e) => {
        e.stopPropagation();
        const action = localTask.is_running ? "stop" : "start";

        try {
            // Note: stop returns the { success, task } object
            const result = await API.toggleTask(localTask.id, action, {
                manual_note: noteDraft,
            });

            if (action === "stop" && result.task) {
                setLocalTask(result.task); // Atomic Update
                setNoteDraft("");
                // We keep it visible so they can see the final time,
                // but you can setIsVisible(false) if desired.
            } else {
                await fetchLatest();
            }

            // Notify other components (Dashboard)
            window.dispatchEvent(new CustomEvent("cognicanvas:data-updated"));
        } catch (err) {
            // Handle 409 Conflict here if another task is running
            if (err.message.includes("already running")) {
                alert("Another protocol is active. Please terminate it first.");
            }
        }
    };

    if (!localTask || !isVisible) return null;
    // --- MISSION: VISUAL POLISH (Glassmorphism & Glow) ---
    const glowStyle = localTask.is_running
        ? {
              boxShadow: `0 0 25px -5px ${localTask.color_hex || "#3b82f6"}88`,
              border: `1px solid ${localTask.color_hex}aa`,
          }
        : {
              border: `1px solid rgba(255,255,255,0.1)`,
          };
    return (
        <Draggable nodeRef={nodeRef} scale={scale} handle=".widget-drag-handle" defaultPosition={defaultPos}>
            <div ref={nodeRef} className="absolute z-50 group">
                <ResizableBox
                    width={180}
                    height={180}
                    minConstraints={[150, 150]}
                    maxConstraints={[500, 500]}
                    resizeHandles={["se", "e", "s"]}
                    className="rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl border border-white/20 flex flex-col transition-colors transition-opacity"
                    style={{
                        ...glowStyle,
                        backgroundColor: localTask.color_hex ? `${localTask.color_hex}22` : "#111111CC",
                        backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.4) 100%)`,
                    }}
                >
                    {/* DRAG HANDLE */}
                    <div className="widget-drag-handle h-7 bg-black/30 cursor-move flex justify-between items-center px-3 shrink-0">
                        <span className="text-[10px] font-black text-white/50 uppercase tracking-tighter">{localTask.is_running ? "● Active Session" : "Standby"}</span>
                        <button onClick={() => setIsVisible(false)} className="text-white/40 hover:text-white font-bold">
                            ×
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col p-3 min-h-0 text-white">
                        {/* TASK TITLE */}
                        <h4 className="text-center text-xs font-bold truncate mb-2 uppercase tracking-wide opacity-90">{localTask.title}</h4>

                        {/* TIMER GRID */}
                        <div className="flex-1 flex flex-col justify-center items-center gap-1 border-y border-white/10 py-2">
                            {/* Main Display: Total Time */}
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] uppercase font-bold text-white/40 mb-[-4px]">Accumulated</span>
                                <span className="font-mono text-2xl font-black tracking-tight">{formatTime(totalElapsed)}</span>
                            </div>

                            {/* Sub Display: Session Time */}
                            <div className="flex flex-col items-center opacity-80">
                                <span className="text-[8px] uppercase font-bold text-white/40 mb-[-4px]">Current Session</span>
                                <span className="font-mono text-sm font-bold text-green-400">{formatTime(sessionElapsed)}</span>
                            </div>
                        </div>

                        {/* CONTROLS */}
                        <div className="mt-3 space-y-2">
                            {localTask.is_running && <input type="text" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Log note..." onMouseDown={(e) => e.stopPropagation()} className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-white/30" />}
                            <button
                                onClick={handleToggle}
                                onMouseDown={(e) => e.stopPropagation()}
                                className={`w-full py-2 rounded-xl text-[10px] font-black uppercase transition-colors transition-opacity transform active:scale-95
                                    ${localTask.is_running ? "bg-red-600 hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)]" : "bg-white text-black hover:bg-gray-200"}`}
                            >
                                {localTask.is_running ? "Terminate Session" : "Start Session"}
                            </button>
                        </div>
                    </div>
                </ResizableBox>
            </div>
        </Draggable>
    );
};

export default TaskWidget;
