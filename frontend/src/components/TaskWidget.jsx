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

const TaskWidget = ({ task, onUpdate }) => {
    const nodeRef = useRef(null);

    // --- STATE ---
    // We initialize state, but we also watch for prop changes below
    const [localTask, setLocalTask] = useState(task);
    const [isVisible, setIsVisible] = useState(task.is_running);
    const [noteDraft, setNoteDraft] = useState("");

    // Timer State
    const [totalElapsed, setTotalElapsed] = useState(0);
    const [sessionElapsed, setSessionElapsed] = useState(0);

    // Random position only on first mount
    const [defaultPos] = useState({
        x: Math.random() * (window.innerWidth - 300) + 100,
        y: Math.random() * (window.innerHeight - 300) + 100,
    });

    // --- 1. REACTIVITY: Keep Local State in Sync with Props ---
    useEffect(() => {
        setLocalTask(task);
        // If the prop says it's running, force visibility
        if (task.is_running) setIsVisible(true);
    }, [task]);

    // --- 2. GLOBAL EVENT LISTENER (The "Remote Control") ---
    useEffect(() => {
        const handleSignals = async (e) => {
            // A. Visibility Toggle Signal
            if (e.type === "task:toggle-visibility") {
                if (e.detail.taskId === localTask.id) {
                    setIsVisible((prev) => !prev);
                }
            }
            // B. Data Update Signal (Re-fetch specific task to stay accurate)
            else if (e.type === "cognicanvas:data-updated") {
                try {
                    const data = await API.getTasks();
                    const updated = data.tasks.find((t) => t.id === localTask.id);

                    if (!updated) {
                        // Task was deleted from DB, hide myself
                        setIsVisible(false);
                        return;
                    }

                    setLocalTask(updated);
                    if (updated.is_running && !localTask.is_running) {
                        setIsVisible(true);
                    }
                } catch (err) {
                    console.error("Widget sync error:", err);
                }
            }
        };

        window.addEventListener("task:toggle-visibility", handleSignals);
        window.addEventListener("cognicanvas:data-updated", handleSignals);

        return () => {
            window.removeEventListener("task:toggle-visibility", handleSignals);
            window.removeEventListener("cognicanvas:data-updated", handleSignals);
        };
    }, [localTask.id, localTask.is_running]);

    // --- 3. CLOCK LOGIC ---
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

            // Current Session Time
            setSessionElapsed(sessionDiff);
            // Total = Previous Total + Current Session
            setTotalElapsed((parseInt(localTask.total_time_ms) || 0) + sessionDiff);
        };

        // Run immediately and then interval
        updateClocks();
        const interval = setInterval(updateClocks, 1000);
        return () => clearInterval(interval);
    }, [localTask.is_running, localTask.current_session_start, localTask.total_time_ms]);

    // --- ACTIONS ---
    const handleToggle = async (e) => {
        e.stopPropagation(); // Prevent drag
        const action = localTask.is_running ? "stop" : "start";

        try {
            const result = await API.toggleTask(localTask.id, action, { manual_note: noteDraft });

            if (action === "stop") {
                setNoteDraft(""); // Clear note on stop
                // Optional: Hide widget on stop?
                // setIsVisible(false);
            }

            // Broadcast update so TasksApp and other Widgets know
            window.dispatchEvent(new CustomEvent("cognicanvas:data-updated"));
            if (onUpdate) onUpdate();
        } catch (err) {
            if (err.message.includes("already running")) {
                alert("Another protocol is active. Please terminate it first.");
            } else {
                console.error(err);
            }
        }
    };

    if (!isVisible) return null;

    // --- STYLES ---
    const glowStyle = {
        boxShadow: localTask.is_running ? `0 10px 30px -10px ${localTask.color_hex || "#3b82f6"}aa` : `0 4px 15px -5px rgba(0,0,0,0.5)`,
        borderColor: localTask.is_running
            ? `${localTask.color_hex}ff` // Full opacity when running
            : `${localTask.color_hex}66`, // 40% opacity when idle
        borderTopWidth: "4px", // Thicker top bar in task color
    };
    return (
        <Draggable nodeRef={nodeRef} handle=".drag-handle" defaultPosition={defaultPos}>
            <div ref={nodeRef} className="absolute z-50 pointer-events-auto">
                <ResizableBox
                    width={180}
                    height={170}
                    minConstraints={[160, 160]}
                    maxConstraints={[300, 300]}
                    className="rounded-2xl backdrop-blur-md overflow-hidden transition-opacity ease-in-out transition-colors duration-300"
                    style={{
                        ...glowStyle,
                        backgroundColor: "#000000aa",
                        borderWidth: "1px",
                    }}
                >
                    {/* FIX: Wrap everything in a single container div */}
                    <div className="w-full h-full flex flex-col">
                        {/* HEADER / DRAG HANDLE */}
                        <div
                            className="drag-handle h-9 cursor-move flex justify-between items-center px-3 border-b border-white/10 hover:brightness-125 transition-all shrink-0"
                            style={{ backgroundColor: `${localTask.color_hex}33` }} // 20% tint of task color
                        >
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${localTask.is_running ? "animate-pulse" : ""}`} style={{ backgroundColor: localTask.color_hex }} />
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">{localTask.is_running ? "Running" : "Standby"}</span>
                            </div>
                            <button onClick={() => setIsVisible(false)} className="text-gray-500 hover:text-white text-lg leading-none mb-1">
                                &times;
                            </button>
                        </div>

                        {/* CONTENT */}
                        <div className="flex-1 flex flex-col p-3 relative min-h-0">
                            {/* TITLE */}
                            <div className="text-center mb-2">
                                <h4 className="text-white text-xs font-bold truncate px-1" title={localTask.title}>
                                    {localTask.title}
                                </h4>
                            </div>

                            {/* TIMERS */}
                            <div className="flex-1 flex flex-col justify-center items-center">
                                <div className="text-2xl font-mono font-bold text-white tracking-tight drop-shadow-md">{formatTime(totalElapsed)}</div>
                                {localTask.is_running && <div className="text-[10px] font-mono text-green-400 mt-1 bg-green-900/20 px-2 rounded">Session: {formatTime(sessionElapsed)}</div>}
                            </div>

                            {/* CONTROLS */}
                            <div className="mt-3 flex flex-col gap-2">
                                {localTask.is_running && <input className="bg-black/50 border border-gray-700 rounded px-2 py-1 text-[10px] text-white focus:border-blue-500 outline-none w-full" placeholder="Session note..." value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} onMouseDown={(e) => e.stopPropagation()} />}

                                <button
                                    onClick={handleToggle}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className={`w-full py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all duration-300
        ${localTask.is_running ? "bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-600 hover:text-white" : "text-white shadow-lg hover:brightness-110 active:scale-95"}`}
                                    style={
                                        !localTask.is_running
                                            ? {
                                                  backgroundColor: localTask.color_hex,
                                                  boxShadow: `0 4px 15px -2px ${localTask.color_hex}66`,
                                              }
                                            : {}
                                    }
                                >
                                    {localTask.is_running ? "Terminate Session" : "Execute Protocol"}
                                </button>
                            </div>
                        </div>
                    </div>{" "}
                    {/* End of wrapper div */}
                </ResizableBox>
            </div>
        </Draggable>
    );
};

export default TaskWidget;
