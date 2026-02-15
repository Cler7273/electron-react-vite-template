import React, { useState, useEffect, useRef } from "react";
import { ResizableBox } from "react-resizable";
import * as API from "../api";
import "../styles/calendar.css"; // Ensure you have basic calendar styles or Tailwind

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
const TasksApp = ({ windowAPI , isHeaderOnly }) => {
    const scrollRef = useRef(null); // Add this at the top of TasksApp
    // --- WIDGET SYNC HELPER ---
    const toggleWidgetVisibility = (taskId) => {
        window.dispatchEvent(new CustomEvent("task:toggle-visibility", { detail: { taskId } }));
    };
    // -------------------------------------------------------------------------
    // 1. STATE MANAGEMENT (ALL HOOKS TOP LEVEL)
    // -------------------------------------------------------------------------

    // UI View State
    const [view, setView] = useState("dashboard"); // 'dashboard', 'history', 'calendar'

    // Calendar Specific State
    const [calendarMode, setCalendarMode] = useState("month"); // 'year', 'month', 'week', 'day'
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [zoomLevel, setZoomLevel] = useState(1);

    // Dashboard Specific State
    const [activeMenuId, setActiveMenuId] = useState(null); // Accordion toggle for tasks
    const [colorPickerId, setColorPickerId] = useState(null); // (Optional) for inline color picking

    // History Specific State
    const [expandedLogId, setExpandedLogId] = useState(null);
    const [noteDraft, setNoteDraft] = useState("");

    // Data State
    const [tasks, setTasks] = useState([]);
    const [logs, setLogs] = useState([]);
    const [newTask, setNewTask] = useState("");

    // Ref for resizing context
    const containerRef = useRef(null);

    // -------------------------------------------------------------------------
    // 2. SYNCHRONIZATION & DATA LOADING
    // -------------------------------------------------------------------------

    const loadData = async () => {
        try {
            const [tData, lData] = await Promise.all([API.getTasks(), API.getHistory()]);
            setTasks(tData.tasks || []);
            setLogs(lData || []);
        } catch (e) {
            console.error("Load failed", e);
        }
    };

    // Initial Load & Polling
    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000);

        // Listen for sync events (e.g., from TaskWidget)
        const handleRemote = () => loadData();
        window.addEventListener("cognicanvas:data-updated", handleRemote);

        return () => {
            clearInterval(interval);
            window.removeEventListener("cognicanvas:data-updated", handleRemote);
        };
    }, []);

    // Broadcast update helper
    const broadcastSync = () => {
        window.dispatchEvent(new CustomEvent("cognicanvas:data-updated"));
        loadData();
    };

    // -------------------------------------------------------------------------
    // 3. ACTIONS (CRUD)
    // -------------------------------------------------------------------------

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
        // Implement API call to save note for specific log
        // console.log("Saving note:", noteDraft, " for log:", logId);
        // await API.updateLog(logId, { manual_note: noteDraft });
        broadcastSync();
    };

    const handleUpdateColor = async (taskId, hex) => {
        await API.updateTask(taskId, { color_hex: hex });
        broadcastSync();
    };

    const goToCalendarTime = (isoString) => {
        const date = new Date(isoString);
        setSelectedDate(date);
        setCalendarMode("day");
        setView("calendar");

        // Calculate vertical scroll position
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const scrollTarget = (hours * 60 + minutes) * zoomLevel;

        // Wait for the view to switch, then scroll
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTo({
                    top: scrollTarget,
                    behavior: "smooth",
                });
            }
        }, 100);
    };

    // NOTE COLORS PRESET
    const NOTE_COLORS = ["#111827", "#7f1d1d", "#7c2d12", "#14532d", "#1e3a8a", "#581c87", "#422006", "#713f12", "#164e63", "#4c1d95", "#0f172a", "#831843"];
    // -------------------------------------------------------------------------
    // 4. RENDERERS (VIEW COMPONENTS)
    // -------------------------------------------------------------------------

    // A. THE PILL HEADER (Floating, Interactable, Drag Handle)
    const renderHeader = () => (
        // Changed: -top-7 pushes it slightly above/flush with the top edge
        <div className="absolute -top-2 left-0 right-0 h-14 z-50 flex justify-center items-start pointer-events-none">
            {/* The Pill Container */}
            <div className="group pointer-events-auto mt-2 relative">
                {/* 1. Default State (Simple Pill) */}
                <div className="bg-[#1a1a1a] border border-gray-600 rounded-full px-4 py-1.5 shadow-lg flex items-center gap-2 transition-all duration-300 group-hover:opacity-0 absolute top-0 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="text-[10px] font-bold text-gray-300 tracking-widest uppercase">Task Manager</span>
                </div>

                {/* 2. Expanded State (Hover) */}
                <div className="bg-[#111] border border-gray-500 rounded-xl p-1.5 shadow-2xl flex items-center gap-3 opacity-0 translate-y-2 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-200 ease-out origin-top">
                    {/* FIXED: DRAG HANDLE CONNECTED TO HDWindowFrame */}
                    <div className={`${windowAPI?.dragHandleClass || "custom-window-drag"} cursor-move px-2 py-1 hover:bg-gray-800 rounded flex items-center gap-2 border-r border-gray-700 mr-1`}>
                        <span className="text-xs font-bold text-white">⋮⋮</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Grip</span>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex bg-black rounded p-0.5 border border-gray-800">
                        {["dashboard", "history", "calendar"].map((t) => (
                            <button key={t} onClick={() => setView(t)} className={`px-3 py-1 text-[9px] font-bold uppercase rounded transition-colors ${view === t ? "bg-blue-700 text-white" : "text-gray-500 hover:text-gray-300"}`}>
                                {t}
                            </button>
                        ))}
                    </div>

                    {/* FIXED: CLOSE BUTTON NOW CALLS THE API */}
                    <button onClick={() => windowAPI?.close?.()} className="w-5 h-5 flex items-center justify-center rounded-full bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white transition-colors ml-2">
                        ×
                    </button>
                </div>
            </div>
        </div>
    );

    // B. DASHBOARD VIEW
    const renderDashboard = () => {
        const activeList = tasks.filter((t) => t.is_done === 0);
        const archivedList = tasks.filter((t) => t.is_done === 1);
        const combinedList = [...activeList, ...archivedList];
        // Inside TasksApp.jsx Dashboard render:
        const toggleWidgetVisibility = (taskId) => {
            // This event is caught by the new TaskWidget listener
            window.dispatchEvent(
                new CustomEvent("task:toggle-visibility", {
                    detail: { taskId },
                }),
            );
        };
        return (
            <div className="h-full flex flex-col p-4 pt-16">
                <div className="flex justify-between items-end mb-4 px-2">
                    <h2 className="text-xl font-bold text-white tracking-tighter">PROTOCOLS</h2>
                    <form onSubmit={handleCreate} className="flex gap-2">
                        <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="New Protocol..." className="bg-[#111] border border-gray-700 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none w-32 focus:w-48 transition-all" />
                        <button className="bg-blue-700 hover:bg-blue-600 px-3 rounded text-white font-bold text-xs">+</button>
                    </form>
                </div>

                <div className="flex-1 overflow-y-auto custom-scroll pr-2 space-y-2">
                    {combinedList.map((task) => {
                        const isExpanded = activeMenuId === task.id;
                        const isArchived = task.is_done === 1;

                        return (
                            <div key={task.id} className={`rounded-lg border transition-all duration-300 overflow-hidden ${isArchived ? "bg-black border-gray-800 opacity-60" : "bg-[#111] border-gray-700"} ${isExpanded ? "border-blue-900 ring-1 ring-blue-900/50" : "hover:border-gray-600"}`}>
                                {/* Task Header */}
                                <div onClick={() => setActiveMenuId(isExpanded ? null : task.id)} className="flex items-center p-3 cursor-pointer select-none h-14">
                                    <div className="w-1.5 h-8 rounded-full mr-3" style={{ backgroundColor: task.color_hex || "#333" }} />
                                    <div className="flex-1 min-w-0">
                                        <h3 className={`font-bold text-sm truncate ${isArchived ? "line-through text-gray-500" : "text-gray-200"}`}>{task.title}</h3>
                                        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
                                            <span>{formatDuration(task.total_time_ms)}</span>
                                            {task.is_running && <span className="text-green-500 animate-pulse">● REC</span>}
                                        </div>
                                    </div>
                                    <div className="text-gray-600 text-xs">{isExpanded ? "▲" : "▼"}</div>
                                </div>

                                {/* Task Details (Accordion) */}
                                <div className={`transition-all duration-300 ease-in-out bg-[#080808] border-t border-gray-800 ${isExpanded ? "max-h-48 opacity-100" : "max-h-0 opacity-0"}`}>
                                    <div className="p-3 grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <button onClick={() => handleTaskAction(task, "toggle")} className={`w-full py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${task.is_running ? "bg-red-900/30 text-red-400" : "bg-green-900/30 text-green-400"}`}>
                                                {task.is_running ? "❚❚ Stop" : "▶ Start"}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleWidgetVisibility(task.id);
                                                }}
                                                className="w-full py-2 rounded text-xs font-bold uppercase tracking-wider bg-blue-900/30 text-blue-400"
                                            >
                                                👁 Toggle Widget
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex gap-1 justify-between bg-black p-1 rounded border border-gray-800">
                                                {NOTE_COLORS.slice(0, 5).map((hex) => (
                                                    <button key={hex} onClick={() => handleUpdateColor(task.id, hex)} style={{ backgroundColor: hex }} className="w-4 h-4 rounded-full hover:scale-125 transition-transform" />
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

    // C. HISTORY VIEW
    const renderHistory = () => (
        <div className="h-full flex flex-col pt-10 bg-[#0a0a0a]">
            <div className="px-4 pb-2 border-b border-gray-800 mb-2 mt-4">
                <h2 className="text-lg font-bold text-gray-300">Chronological Logs</h2>
            </div>
            <div className="flex-1 overflow-y-auto custom-scroll px-2 pb-10">
                {logs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                        <div key={log.id} className="mb-2 bg-[#111] border border-gray-800 rounded-lg overflow-hidden hover:border-gray-700">
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
                                        <span className="font-mono text-blue-400 text-xs">{formatDuration(log.end_time ? log.end_time - log.start_time : 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{formatDate(log.start_time)}</span>
                                        <span className="text-[10px] text-gray-600">{formatTime(log.start_time)}</span>
                                    </div>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="bg-[#050505] border-t border-gray-800 p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                    {/* Data Grid */}
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div className="space-y-2">
                                            <div>
                                                <div className="text-gray-500 uppercase text-[9px] font-bold">Task Name</div>
                                                <div className="text-gray-200 font-bold">{log.task_title}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500 uppercase text-[9px] font-bold">Duration</div>
                                                <div className="text-blue-400 font-mono text-sm">{formatDuration(log.end_time ? log.end_time - log.start_time : 0)}</div>
                                            </div>
                                        </div>
                                        <div className="space-y-2 border-l border-gray-800 pl-4">
                                            <div>
                                                <div className="text-gray-500 uppercase text-[9px] font-bold">Start Time</div>
                                                <div className="text-gray-300 font-mono">{new Date(log.start_time).toLocaleString()}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500 uppercase text-[9px] font-bold">End Time</div>
                                                <div className="text-gray-300 font-mono">{log.end_time ? new Date(log.end_time).toLocaleString() : "Still Active"}</div>
                                            </div>
                                        </div>
                                        <div className="col-span-2 pt-2 border-t border-gray-800/50">
                                            <div className="flex justify-between text-[9px] text-gray-500 uppercase font-bold">
                                                <span>Day Start: {new Date(log.start_time).toLocaleDateString()} 00:00:00</span>
                                                <span>Day End: {new Date(log.start_time).toLocaleDateString()} 23:59:59</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Note Section & Action */}
                                    <div className="flex gap-4 items-end mt-2 pt-4 border-t border-gray-800">
                                        <div className="flex-1">
                                            <div className="text-gray-500 uppercase text-[9px] font-bold mb-1">Session Note</div>
                                            <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} onBlur={() => saveNote(log.id)} className="w-full bg-[#111] border border-gray-700 rounded p-2 text-xs text-gray-300 h-16 resize-none focus:border-blue-500 outline-none" placeholder="Add session notes..." />
                                        </div>
                                        <button onClick={() => goToCalendarTime(log.start_time)} className="bg-blue-900/30 hover:bg-blue-800 text-blue-300 text-xs px-4 py-3 rounded border border-blue-900/50 transition-colors h-16 flex items-center">
                                            📅 Jump to Date
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
    // D. CALENDAR VIEW
    const renderCalendar = () => {
        // Calendar Header Helper
        const CalendarHeader = () => (
            <div className="flex justify-between items-center px-4 py-3 bg-[#111] border-b border-gray-800 mt-12">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">{selectedDate.toLocaleString("default", { month: "long", year: "numeric" })}</h2>
                    <div className="flex bg-black rounded p-0.5 border border-gray-800">
                        {["year", "month", "week", "day"].map((m) => (
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
                            if (calendarMode === "year") d.setFullYear(d.getFullYear() - 1);
                            else if (calendarMode === "month") d.setMonth(d.getMonth() - 1);
                            else if (calendarMode === "week") d.setDate(d.getDate() - 7);
                            else if (calendarMode === "day") d.setDate(d.getDate() - 1);
                            setSelectedDate(d);
                        }}
                        className="p-1 hover:bg-gray-800 rounded text-white"
                    >
                        ◀
                    </button>
                    <button onClick={() => setSelectedDate(new Date())} className="p-1 hover:bg-gray-800 rounded text-white">
                        Today
                    </button>
                    <button
                        onClick={() => {
                            const d = new Date(selectedDate);
                            if (calendarMode === "year") d.setFullYear(d.getFullYear() + 1);
                            else if (calendarMode === "month") d.setMonth(d.getMonth() + 1);
                            else if (calendarMode === "week") d.setDate(d.getDate() + 7);
                            else if (calendarMode === "day") d.setDate(d.getDate() + 1);
                            setSelectedDate(d);
                        }}
                        className="p-1 hover:bg-gray-800 rounded text-white"
                    >
                        ▶
                    </button>
                </div>
            </div>
        );

        // 1. Month Mode
        if (calendarMode === "month") {
            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const startOffset = new Date(year, month, 1).getDay();
            const monthLogs = logs.filter((l) => {
                const d = new Date(l.start_time);
                return d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
            });
            const monthTotalMs = monthLogs.reduce((acc, l) => acc + (l.end_time ? l.end_time - l.start_time : 0), 0);
            return (
                <div className="h-full flex flex-col bg-[#050505]">
                    <CalendarHeader />
                    <div className="px-4 py-1.5 bg-blue-900/10 border-b border-blue-900/30 flex justify-between items-center">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Month Statistics</span>
                        <div className="flex gap-4">
                            <span className="text-[10px] text-gray-400 font-mono">Sessions: {monthLogs.length}</span>
                            <span className="text-[10px] text-green-400 font-mono font-bold">Total: {formatDuration(monthTotalMs)}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 text-center py-1 border-b border-gray-800 text-[10px] text-gray-500 font-bold uppercase">
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                            <div key={d}>{d}</div>
                        ))}
                    </div>
                    <div className="flex-1 grid grid-cols-7 gap-px bg-gray-800 overflow-y-auto custom-scroll">
                        {Array.from({ length: startOffset }).map((_, i) => (
                            <div key={`empty-${i}`} className="bg-[#080808]" />
                        ))}
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
                                    <span className={`text-xs font-bold p-1 ${currentDate.toDateString() === new Date().toDateString() ? "text-blue-500" : "text-gray-500 group-hover:text-white"}`}>{d}</span>
                                    {totalMs > 0 && (
                                        <div className="px-1 pb-1">
                                            <div className="flex gap-0.5 mb-1 flex-wrap content-end">
                                                {dayLogs.slice(0, 6).map((l, idx) => (
                                                    <div key={idx} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: l.color_hex || "#3b82f6" }} title={l.task_title} />
                                                ))}
                                            </div>
                                            <div className="text-[9px] text-green-400 font-mono text-right border-t border-gray-800 pt-0.5">{formatDuration(totalMs)}</div>
                                        </div>
                                    )}
                                    <div className="px-1 py-1 bg-black/40 text-[10px] text-blue-400 font-mono flex justify-between">
                                        <span>Total:{formatDuration(monthTotalMs)}</span>
                                        <span className="font-bold -left-5"></span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }
        // 0. Year Mode (NEW)
        if (calendarMode === "year") {
            const year = selectedDate.getFullYear();
            const months = Array.from({ length: 12 });
            return (
                <div className="h-full flex flex-col bg-[#050505]">
                    <CalendarHeader />
                    <div className="flex-1 grid grid-cols-3 gap-3 p-4 overflow-y-auto custom-scroll">
                        {months.map((_, i) => {
                            const monthLogs = logs.filter((l) => new Date(l.start_time).getFullYear() === year && new Date(l.start_time).getMonth() === i);
                            const totalMs = monthLogs.reduce((acc, l) => acc + (l.end_time ? l.end_time - l.start_time : 0), 0);
                            return (
                                <div
                                    key={i}
                                    onClick={() => {
                                        setSelectedDate(new Date(year, i, 1));
                                        setCalendarMode("month");
                                    }}
                                    className="bg-[#11] border border-gray-800 hover:border-blue-800 hover:bg-blue-900/10 rounded-lg p-3 cursor-pointer flex flex-col items-center justify-center transition-all min-h-[100px]"
                                >
                                    <span className="text-sm font-bold text-gray-300 uppercase tracking-widest">{new Date(year, i).toLocaleString("default", { month: "short" })}</span>
                                    <span className="text-lg font-mono font-black text-blue-400 mt-2">{formatDuration(totalMs)}</span>
                                    <span className="text-[10px] text-gray-500 mt-1">{monthLogs.length} Sessions</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }
        // 2. Time Grid (Week/Day)
        // 2. Time Grid (Week/Day) - FIXED SCROLLING
        const renderTimeGrid = (days) => (
            <div
                ref={scrollRef}
                className="flex-1 overflow-auto bg-[#080808] relative custom-scroll flex"
                onWheel={(e) => {
                    if (e.ctrlKey) {
                        e.preventDefault();
                        setZoomLevel((z) => Math.min(3, Math.max(0.2, z + (e.deltaY > 0 ? -0.05 : 0.05))));
                    }
                }}
            >
                {/* LEFT TIME AXIS: The background spans the full height of the content */}
                <div className="sticky left-0 bg-[#111] border-r border-gray-800 z-20 flex-shrink-0" style={{ height: `${24 * 60 * zoomLevel + 32}px` }}>
                    <div className="h-8 border-b border-gray-800 bg-[#111] sticky top-0 z-30" /> {/* Top corner intersection */}
                    {Array.from({ length: 24 }).map((_, i) => (
                        <div key={i} className="text-[10px] text-gray-500 font-mono text-right pr-2 border-b border-gray-800/20" style={{ height: `${60 * zoomLevel}px`, lineHeight: `${20 * zoomLevel}px` }}>
                            {i}:00
                        </div>
                    ))}
                </div>

                <div className="flex flex-1" style={{ height: `${24 * 60 * zoomLevel + 32}px` }}>
                    {days.map((dateObj, idx) => {
                        const dateStr = dateObj.toDateString();
                        const dayLogs = logs.filter((l) => new Date(l.start_time).toDateString() === dateStr);
                        return (
                            <div key={idx} className="flex-1 border-r border-gray-800/50 relative min-w-[200px] bg-[#0c0c0c]">
                                {/* TOP DATE HEADER: Sticky and covers the full width */}
                                <div className="sticky top-0 bg-[#111] h-8 flex items-center justify-center text-[10px] font-bold text-gray-300 border-b border-gray-700 z-10 shadow-md">
                                    <span>{dateObj.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}</span>
                                </div>

                                <div className="relative w-full" style={{ height: `${24 * 60 * zoomLevel}px` }}>
                                    {Array.from({ length: 24 }).map((_, i) => (
                                        <div key={i} className="border-b border-gray-800/10 w-full absolute" style={{ top: `${i * 60 * zoomLevel}px`, height: `${60 * zoomLevel}px` }} />
                                    ))}
                                    {/* Logs... */}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );

        const gridDays =
            calendarMode === "week"
                ? Array.from({ length: 7 }, (_, i) => {
                      const d = new Date(selectedDate);
                      const day = d.getDay() || 7;
                      if (day !== 1) d.setHours(-24 * (day - 1));
                      d.setDate(d.getDate() + i);
                      return d;
                  })
                : [selectedDate];

        return (
            <div className="h-full flex flex-col bg-[#050505]">
                <CalendarHeader />
                {renderTimeGrid(gridDays)}
            </div>
        );
    };

    // -------------------------------------------------------------------------
    // 5. MAIN RENDER
    // -------------------------------------------------------------------------
    return (
        <div className="h-full w-full flex flex-col pt-10 overflow-visible relative">
            {/* Pill floats in the pt-10 zone */}
            {renderHeader()}

            {/* The Body uses flex-1 to fill the remaining HDWindowFrame space */}
            <div className="flex-1 flex flex-col bg-[#050505] rounded-xl border border-gray-800/50 shadow-2xl overflow-hidden relative">
                {view === "dashboard" && renderDashboard()}
                {view === "history" && renderHistory()}
                {view === "calendar" && renderCalendar()}
            </div>

            {/* Visual resize handle in bottom right corner */}
            <div className="absolute bottom-1 right-1 pointer-events-none opacity-20">
                <div className="w-4 h-4 border-r-2 border-b-2 border-white"></div>
            </div>
        </div>
    );
};

export default TasksApp;
