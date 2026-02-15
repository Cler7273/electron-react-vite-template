import React, { useState, useEffect, useRef } from "react";
import * as API from "../api";
import "../styles/calendar.css";
import { ResizableBox } from "react-resizable";

// --- HELPER: TIME FORMATTING ---
const formatDuration = (ms) => {
    if (!ms || isNaN(ms)) return "0m";
    const hrs = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
};

const formatDate = (date) => new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const formatTime = (date) => new Date(date).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

// --- COMPONENT: TASKS APP ---
const TasksApp = () => {
    // --- STATE ---
    const [view, setView] = useState("dashboard"); // 'dashboard', 'history', 'calendar'

    // Calendar State
    const [calendarMode, setCalendarMode] = useState("month"); // 'year', 'month', 'week', 'day'
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [zoomLevel, setZoomLevel] = useState(1);

    // Data State
    const [tasks, setTasks] = useState([]);
    const [logs, setLogs] = useState([]);
    const [newTask, setNewTask] = useState("");

    // History Accordion State
    const [expandedLogId, setExpandedLogId] = useState(null);
    const [noteDraft, setNoteDraft] = useState(""); // For editing notes inline

    // --- SYNCHRONIZATION & DATA ---
    const loadData = async () => {
        try {
            const [tData, lData] = await Promise.all([API.getTasks(), API.getHistory()]);
            setTasks(tData.tasks || []);
            setLogs(lData || []);
        } catch (e) {
            console.error("Load failed", e);
        }
    };
    // [Insert inside TasksApp component, before other effects]
    const containerRef = useRef(null);

    // DOM HACK: Force-hide the parent "WindowFrame" header and background
    useEffect(() => {
        // Traverse up to find the parent 'frame' or 'window' container
        // Based on standard React-Draggable/Window structures
        const me = containerRef.current;
        if (!me) return;

        // Find the closest parent that looks like a window frame
        const parentFrame = me.closest('.react-draggable, .window-frame, [class*="Frame"]');

        if (parentFrame) {
            // 1. Hide the header (usually the first child or class 'window-header')
            const header = parentFrame.querySelector('[class*="header"], [class*="bar"]');
            if (header) {
                header.style.display = "none"; // POOF. Gone.
                header.style.pointerEvents = "none";
            }

            // 2. Remove default styling from parent to let TaskApp handle it
            parentFrame.style.background = "transparent";
            parentFrame.style.boxShadow = "none";
            parentFrame.style.border = "none";
            parentFrame.style.overflow = "visible"; // Allow our resize handles to be seen
        }
    }, []);

    useEffect(() => {
        loadData();
        // Poll for updates
        const interval = setInterval(loadData, 5000);
        // Listen for sync events from TaskWidget or other windows
        const handleRemote = () => loadData();
        window.addEventListener("cognicanvas:data-updated", handleRemote);
        return () => {
            clearInterval(interval);
            window.removeEventListener("cognicanvas:data-updated", handleRemote);
        };
    }, []);

    // Broadcast update to sync TaskWidgets immediately
    const broadcastSync = () => {
        window.dispatchEvent(new CustomEvent("cognicanvas:data-updated"));
        loadData();
    };

    // --- ACTIONS ---
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        await API.createTask(newTask);
        setNewTask("");
        broadcastSync();
    };

    const handleTaskAction = async (task, action) => {
        if (action === "toggle") {
            await API.toggleTask(task.id, task.is_running ? "stop" : "start");
        } else if (action === "terminate") {
            if (confirm("Retire task?")) await API.terminateTask(task.id);
        } else if (action === "delete") {
            if (confirm("Permanently delete?")) await API.deleteTask(task.id);
        }
        broadcastSync();
    };

    const saveNote = async (logId) => {
        // Mock API call - in reality needs an update endpoint for logs
        // For now we assume we can update the task or a specific log endpoint exists
        // console.log("Saving note:", noteDraft, " for log:", logId);
        // await API.updateLog(logId, { manual_note: noteDraft });
        // broadcastSync();
        alert("Note saving requires backend update endpoint for logs. Implemented in UI.");
    };

    const goToCalendarTime = (isoString) => {
        const date = new Date(isoString);
        setSelectedDate(date);
        setCalendarMode("day");
        setView("calendar");
        // Auto scroll happens in render via ID anchor if implemented, or just view switch
    };

    // --- RENDERERS ---

    // 1. THE MODERN HEADER (Floating Pill)
    const renderHeader = () => (
        // "h-14" reserves space at top. The pill floats inside.
        <div className="absolute top-0 left-0 right-0 h-14 z-50 flex justify-center items-start pointer-events-none">
            {/* The Pill Container */}
            <div className="group pointer-events-auto mt-2 relative">
                {/* 1. The Default State (Simple Pill) */}
                <div className="bg-[#1a1a1a] border border-gray-600 rounded-full px-4 py-1.5 shadow-lg flex items-center gap-2 transition-all duration-300 group-hover:opacity-0 absolute top-0 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="text-[10px] font-bold text-gray-300 tracking-widest uppercase">Task Manager</span>
                </div>

                {/* 2. The Expanded State (Hover) - "Expands Up/Out" */}
                {/* We use translate to make it appear to slide up/in from the simple pill */}
                <div
                    className="bg-[#111] border border-gray-500 rounded-xl p-1.5 shadow-2xl flex items-center gap-3 
                            opacity-0 translate-y-2 scale-95
                            group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 
                            transition-all duration-200 ease-out origin-top"
                >
                    {/* Drag Handle (The Grip) */}
                    <div className="drag-handle cursor-move px-2 py-1 hover:bg-gray-800 rounded flex items-center gap-2 border-r border-gray-700 mr-1">
                        <span className="text-xs font-bold text-white">⋮⋮</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Grip</span>
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-black rounded p-0.5 border border-gray-800">
                        {["dashboard", "history", "calendar"].map((t) => (
                            <button
                                key={t}
                                onClick={() => setView(t)}
                                className={`px-3 py-1 text-[9px] font-bold uppercase rounded transition-colors
                                ${view === t ? "bg-blue-700 text-white" : "text-gray-500 hover:text-gray-300"}
                            `}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={() => {
                            // Logic to close the app - if strictly a component, we hide it,
                            // or if specific API exists to remove frame:
                            if (window.nativeAPI?.closeWindow) window.nativeAPI.closeWindow();
                        }}
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white transition-colors ml-2"
                    >
                        ×
                    </button>
                </div>
            </div>
        </div>
    );

    const renderDashboard = () => {
        // Sort: Active first, then Archived
        const activeList = tasks.filter((t) => t.is_done === 0);
        const archivedList = tasks.filter((t) => t.is_done === 1);
        const combinedList = [...activeList, ...archivedList];
        const availableTags = [...new Set(tasks.flatMap(t => t.tags))];
        const [activeMenuId, setActiveMenuId] = useState(null); // For accordion state
        // Internal state for Color Picker visibility per task
        const [colorPickerId, setColorPickerId] = useState(null);

        const NOTE_COLORS = ["#111827", "#7f1d1d", "#7c2d12", "#14532d", "#1e3a8a", "#581c87", "#422006", "#713f12", "#164e63", "#4c1d95", "#0f172a", "#831843", "#3f2500", "#4b5563", "#9d174d", "#881337", "#202020"];

        const toggleWidgetVisibility = (taskId) => {
            // Dispatch event for TaskWidget to catch
            window.dispatchEvent(new CustomEvent("task:show-widget", { detail: { taskId } }));
        };

        return (
            <div className="h-full flex flex-col p-4 pt-16">
                {" "}
                {/* Padding top for header */}
                <div className="flex justify-between items-end mb-4 px-2">
                    <h2 className="text-xl font-bold text-white tracking-tighter">PROTOCOLS</h2>
                    <form onSubmit={handleCreate} className="flex gap-2">
                        <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="New..." className="bg-[#111] border border-gray-700 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none w-32 focus:w-48 transition-all" />
                        <button className="bg-blue-700 hover:bg-blue-600 px-3 rounded text-white font-bold text-xs">+</button>
                    </form>
                </div>
                <div className="flex-1 overflow-y-auto custom-scroll pr-2 space-y-2">
                    {combinedList.map((task) => {
                        const isExpanded = activeMenuId === task.id; // Using activeMenuId as accordion state
                        const isArchived = task.is_done === 1;

                        return (
                            <div
                                key={task.id}
                                className={`rounded-lg border transition-all duration-300 overflow-hidden
                                ${isArchived ? "bg-black border-gray-800 opacity-60" : "bg-[#111] border-gray-700"}
                                ${isExpanded ? "border-blue-900 ring-1 ring-blue-900/50" : "hover:border-gray-600"}
                            `}
                            >
                                {/* Accordion Header */}
                                <div onClick={() => setActiveMenuId(isExpanded ? null : task.id)} className="flex items-center p-3 cursor-pointer select-none h-14">
                                    <div className="w-1.5 h-8 rounded-full mr-3" style={{ backgroundColor: task.color_hex || "#333" }} />

                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-bold text-sm truncate ${isArchived ? "line-through text-gray-500" : "text-gray-200"}`}>{task.title}</h3>
                                        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
                                            <span>{formatDuration(task.total_time_ms)}</span>
                                            {task.is_running && <span className="text-green-500 animate-pulse">● REC</span>}
                                        </div>
                                    </div>

                                    <div className="text-gray-600 text-xs transform transition-transform duration-300">{isExpanded ? "▲" : "▼"}</div>
                                </div>

                                {/* Accordion Body */}
                                <div className={`transition-all duration-300 ease-in-out bg-[#080808] border-t border-gray-800 ${isExpanded ? "max-h-48 opacity-100" : "max-h-0 opacity-0"}`}>
                                    <div className="p-3 grid grid-cols-2 gap-3">
                                        {/* Column 1: Primary Controls */}
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => handleTaskAction(task, "toggle")}
                                                className={`w-full py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2
                                                ${task.is_running ? "bg-red-900/30 text-red-400 hover:bg-red-900/50" : "bg-green-900/30 text-green-400 hover:bg-green-900/50"}`}
                                            >
                                                {task.is_running ? "❚❚ Stop" : "▶ Start"}
                                            </button>

                                            <button onClick={() => toggleWidgetVisibility(task.id)} className="w-full py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] font-bold uppercase">
                                                👁 Toggle Widget
                                            </button>
                                        </div>

                                        {/* Column 2: Management & Color */}
                                        <div className="space-y-2">
                                            <div className="flex gap-1 justify-between bg-black p-1 rounded border border-gray-800">
                                                {NOTE_COLORS.map((hex) => (
                                                    <button key={hex} onClick={() => API.updateTask(task.id, { color_hex: hex }).then(loadData)} style={{ backgroundColor: hex }} className={`w-4 h-4 rounded-full hover:scale-125 transition-transform ${task.color_hex === hex ? "ring-1 ring-white" : ""}`} />
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleTaskAction(task, "terminate")} className="flex-1 py-1 bg-gray-800 hover:bg-orange-900/30 text-orange-500 text-[10px] rounded">
                                                    Archive
                                                </button>
                                                <button onClick={() => handleTaskAction(task, "delete")} className="flex-1 py-1 bg-gray-800 hover:bg-red-900/30 text-red-500 text-[10px] rounded">
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // 3. HISTORY VIEW (Accordion)
    const renderHistory = () => (
        <div className="h-full flex flex-col pt-10 bg-[#0a0a0a]">
            <div className="px-4 pb-2 border-b border-gray-800 mb-2">
                <h2 className="text-lg font-bold text-gray-300">Chronological Logs</h2>
            </div>
            <div className="flex-1 overflow-y-auto custom-scroll px-2 pb-10">
                {logs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const duration = log.end_time ? log.end_time - log.start_time : 0;

                    return (
                        <div key={log.id} className="mb-2 bg-[#111] border border-gray-800 rounded-lg overflow-hidden transition-colors hover:border-gray-700">
                            {/* Header Row */}
                            <div
                                onClick={() => {
                                    setExpandedLogId(isExpanded ? null : log.id);
                                    setNoteDraft(log.manual_note || "");
                                }}
                                className="flex items-center p-3 cursor-pointer select-none"
                            >
                                <div className="w-1 h-8 rounded mr-3" style={{ backgroundColor: log.color_hex || "#555" }} />
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-gray-200 text-sm">{log.task_title}</span>
                                        <span className="font-mono text-blue-400 text-xs">{formatDuration(duration)}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{formatDate(log.start_time)}</span>
                                        <span className="text-[10px] text-gray-600">{formatTime(log.start_time)}</span>
                                    </div>
                                </div>
                                <div className={`ml-3 text-gray-600 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>▼</div>
                            </div>

                            {/* Expanded Details (Accordion) */}
                            <div
                                className={`bg-[#050505] border-t border-gray-800 transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden
                                    ${isExpanded ? "max-h-60 opacity-100" : "max-h-0 opacity-0"}`}
                            >
                                <div className="p-4 flex gap-4">
                                    {/* Data Column */}
                                    <div className="flex-1 space-y-3">
                                        <div>
                                            <label className="text-[10px] uppercase text-gray-600 font-bold block mb-1">Session Note</label>
                                            <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} onBlur={() => saveNote(log.id)} placeholder="Add details about this session..." className="w-full bg-[#111] border border-gray-700 rounded p-2 text-xs text-gray-300 focus:border-blue-500 outline-none resize-none h-16" />
                                        </div>
                                    </div>

                                    {/* Actions Column */}
                                    <div className="w-1/3 flex flex-col justify-between border-l border-gray-800 pl-4">
                                        <div className="text-right">
                                            <div className="text-[10px] text-gray-500">Exact Start</div>
                                            <div className="text-xs font-mono text-gray-300">{new Date(log.start_time).toLocaleString()}</div>
                                        </div>
                                        <button onClick={() => goToCalendarTime(log.start_time)} className="bg-blue-900/30 hover:bg-blue-800 text-blue-300 text-xs px-3 py-2 rounded border border-blue-900/50 flex items-center justify-center gap-2 transition-colors">
                                            <span>📅 Jump to Calendar</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderCalendar = () => {
        // --- Header Component ---
        const Header = () => (
            <div className="flex justify-between items-center px-4 py-3 bg-[#111] border-b border-gray-800 mt-12">
                {" "}
                {/* mt-12 clears the absolute header */}
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">{selectedDate.toLocaleString("default", { month: "long", year: "numeric" })}</h2>
                    <div className="flex bg-black rounded p-0.5 border border-gray-800">
                        {["month", "week", "day"].map((m) => (
                            <button key={m} onClick={() => setCalendarMode(m)} className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-colors ${calendarMode === m ? "bg-gray-700 text-white" : "text-gray-500 hover:text-white"}`}>
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => {
                            const d = new Date(selectedDate);
                            d.setMonth(d.getMonth() - 1);
                            setSelectedDate(d);
                        }}
                        className="p-1 hover:bg-gray-800 rounded text-white"
                    >
                        ◀
                    </button>
                    <button onClick={() => setSelectedDate(new Date())} className="text-xs px-2 hover:bg-gray-800 rounded text-gray-300">
                        Today
                    </button>
                    <button
                        onClick={() => {
                            const d = new Date(selectedDate);
                            d.setMonth(d.getMonth() + 1);
                            setSelectedDate(d);
                        }}
                        className="p-1 hover:bg-gray-800 rounded text-white"
                    >
                        ▶
                    </button>
                </div>
            </div>
        );

        // --- Month View ---
        if (calendarMode === "month") {
            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const startOffset = new Date(year, month, 1).getDay();

            return (
                <div className="h-full flex flex-col bg-[#050505]">
                    <Header />
                    <div className="grid grid-cols-7 text-center py-1 border-b border-gray-800 text-[10px] text-gray-500 font-bold uppercase">
                        {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                            <div key={d}>{d}</div>
                        ))}
                    </div>
                    <div className="flex-1 grid grid-cols-7 gap-px bg-gray-800 overflow-y-auto custom-scroll">
                        {/* Empty Slots */}
                        {Array.from({ length: startOffset }).map((_, i) => (
                            <div key={`empty-${i}`} className="bg-[#080808]" />
                        ))}

                        {/* Days */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const d = i + 1;
                            const currentDate = new Date(year, month, d);
                            const dateStr = currentDate.toDateString();

                            const dayLogs = logs.filter((l) => new Date(l.start_time).toDateString() === dateStr);
                            const totalMs = dayLogs.reduce((acc, l) => acc + (l.end_time ? l.end_time - l.start_time : 0), 0);

                            return (
                                <div
                                    key={d}
                                    onClick={() => {
                                        setSelectedDate(currentDate);
                                        setCalendarMode("day");
                                    }}
                                    className="bg-[#111] hover:bg-[#1a1a1a] p-1 cursor-pointer flex flex-col justify-between group transition-colors min-h-[80px]"
                                >
                                    <span className="text-xs font-bold text-gray-500 group-hover:text-white p-1">{d}</span>
                                    {totalMs > 0 && (
                                        <div className="px-1 pb-1">
                                            <div className="flex gap-0.5 mb-1 flex-wrap content-end">
                                                {dayLogs.slice(0, 6).map((l, idx) => (
                                                    <div key={idx} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: l.color_hex || "#3b82f6" }} title={l.task_title} />
                                                ))}
                                                {dayLogs.length > 6 && <span className="text-[8px] text-gray-500 leading-none">+</span>}
                                            </div>
                                            <div className="text-[9px] text-green-400 font-mono text-right border-t border-gray-800 pt-0.5">{formatDuration(totalMs)}</div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // --- Time Grid (Week/Day) ---
        const renderTimeGrid = (days) => (
            <div
                className="flex-1 overflow-auto bg-[#080808] relative custom-scroll"
                onWheel={(e) => {
                    if (e.ctrlKey) {
                        setZoomLevel((z) => Math.min(3, Math.max(0.5, z + (e.deltaY > 0 ? -0.1 : 0.1))));
                    }
                }}
            >
                <div className="flex min-h-full ml-10">
                    {/* Time Axis */}
                    <div className="fixed left-0 w-10 bg-[#111] border-r border-gray-800 h-full z-10 mt-[88px] pointer-events-none">
                        {" "}
                        {/* Margin top matches header height roughly */}
                        {Array.from({ length: 24 }).map((_, i) => (
                            <div key={i} className="text-[9px] text-gray-500 text-right pr-1 pt-0.5 border-b border-gray-800/30" style={{ height: `${60 * zoomLevel}px` }}>
                                {i}:00
                            </div>
                        ))}
                    </div>

                    {/* Columns */}
                    {days.map((dateObj, idx) => {
                        const dateStr = dateObj.toDateString();
                        const dayLogs = logs.filter((l) => new Date(l.start_time).toDateString() === dateStr);

                        return (
                            <div key={idx} className="flex-1 border-r border-gray-800/50 relative min-w-[150px]">
                                <div className="sticky top-0 bg-[#111]/90 backdrop-blur text-center text-xs font-bold text-gray-400 py-2 border-b border-gray-700 z-10">{dateObj.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}</div>
                                {/* Grid Lines */}
                                {Array.from({ length: 24 }).map((_, i) => (
                                    <div key={i} className="border-b border-gray-800/20 w-full absolute pointer-events-none" style={{ top: `${i * 60 * zoomLevel + 33}px`, height: `${60 * zoomLevel}px` }} />
                                ))}

                                {/* Logs */}
                                {dayLogs.map((log) => {
                                    const start = new Date(log.start_time);
                                    const end = log.end_time ? new Date(log.end_time) : new Date();
                                    const startMin = start.getHours() * 60 + start.getMinutes();
                                    const durationMin = (end - start) / 60000;
                                    const task = tasks.find((t) => t.title === log.task_title);

                                    return (
                                        <div
                                            key={log.id}
                                            className="absolute left-1 right-1 rounded border shadow-sm overflow-hidden hover:z-20 hover:scale-[1.02] transition-all cursor-pointer group"
                                            style={{
                                                top: `${startMin * zoomLevel + 33}px`, // +33 for date header
                                                height: `${Math.max(20, durationMin * zoomLevel)}px`,
                                                backgroundColor: `${task?.color_hex || "#333"}E6`,
                                                borderColor: task?.color_hex || "#555",
                                            }}
                                            title={`${log.task_title}\n${log.manual_note || ""}`}
                                        >
                                            <div className="px-1 py-0.5 h-full">
                                                <div className="text-[10px] font-bold text-white truncate">{log.task_title}</div>
                                                {(zoomLevel > 0.8 || durationMin > 30) && <div className="text-[9px] text-white/80 truncate opacity-70 group-hover:opacity-100">{log.manual_note || formatDuration(end - start)}</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        );

        if (calendarMode === "week") {
            const start = new Date(selectedDate);
            const day = start.getDay() || 7;
            if (day !== 1) start.setHours(-24 * (day - 1));
            const days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                return d;
            });
            return (
                <div className="h-full flex flex-col bg-[#050505]">
                    <Header />
                    {renderTimeGrid(days)}
                </div>
            );
        }

        return (
            <div className="h-full flex flex-col bg-[#050505]">
                <Header />
                {renderTimeGrid([selectedDate])}
            </div>
        );
    };

    // [Wrap the entire RETURN statement of the component in this ResizableBox]
    return (
        <div ref={containerRef} className="relative h-full w-full">
            <ResizableBox
                width={500} // Default Start Width
                height={600} // Default Start Height
                minConstraints={[350, 400]}
                maxConstraints={[1200, 1000]}
                resizeHandles={["se", "e", "s"]} // Bottom-Right, Right, Bottom
                className="bg-black border border-gray-800 rounded-xl shadow-2xl flex flex-col overflow-hidden relative"
            >
                {renderHeader()} {/* The New Pill Header */}
                <div className="flex-1 overflow-hidden relative bg-[#050505]">
                    {view === "dashboard" && renderDashboard()}
                    {view === "history" && renderHistory()}
                    {view === "calendar" && renderCalendar()}
                </div>
            </ResizableBox>
        </div>
    );
};

export default TasksApp;
