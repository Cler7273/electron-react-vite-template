import React, { useState, useEffect, useRef } from 'react';
import * as API from '../api';
import '../styles/calendar.css';

// --- HELPER: TIME FORMATTING ---
const formatDuration = (ms) => {
    if (!ms || isNaN(ms)) return "0m";
    const hrs = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
};

const formatDate = (date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const formatTime = (date) => new Date(date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

// --- COMPONENT: TASKS APP ---
const TasksApp = () => {
    // --- STATE ---
    const [view, setView] = useState('dashboard'); // 'dashboard', 'history', 'calendar'
    
    // Calendar State
    const [calendarMode, setCalendarMode] = useState('month'); // 'year', 'month', 'week', 'day'
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
        } catch (e) { console.error("Load failed", e); }
    };

    useEffect(() => {
        loadData();
        // Poll for updates
        const interval = setInterval(loadData, 5000);
        // Listen for sync events from TaskWidget or other windows
        const handleRemote = () => loadData();
        window.addEventListener('cognicanvas:data-updated', handleRemote);
        return () => {
            clearInterval(interval);
            window.removeEventListener('cognicanvas:data-updated', handleRemote);
        };
    }, []);

    // Broadcast update to sync TaskWidgets immediately
    const broadcastSync = () => {
        window.dispatchEvent(new CustomEvent('cognicanvas:data-updated'));
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
        if (action === 'toggle') {
            await API.toggleTask(task.id, task.is_running ? 'stop' : 'start');
        } else if (action === 'terminate') {
            if (confirm("Retire task?")) await API.terminateTask(task.id);
        } else if (action === 'delete') {
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
        setCalendarMode('day');
        setView('calendar');
        // Auto scroll happens in render via ID anchor if implemented, or just view switch
    };

    // --- RENDERERS ---

    // 1. THE MODERN HEADER (Floating Pill)
    const renderHeader = () => (
        <div className="absolute top-0 left-0 right-0 h-16 z-50 flex justify-center items-start group pointer-events-none">
            {/* The Trigger Zone is the h-16 area. The Pill is the content. */}
            <div className="mt-2 pointer-events-auto bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-700 rounded-2xl shadow-2xl 
                            transform -translate-y-[150%] group-hover:translate-y-0 transition-transform duration-300 ease-out
                            flex items-center gap-4 px-4 py-2 min-w-[200px] justify-between">
                
                {/* App Title */}
                <span className="font-bold text-xs text-gray-400 uppercase tracking-widest mr-2">Task Suite</span>
                
                {/* Tabs */}
                <div className="flex bg-black/50 rounded-lg p-1 gap-1">
                    {['dashboard', 'history', 'calendar'].map(t => (
                        <button
                            key={t}
                            onClick={() => setView(t)}
                            className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all
                                ${view === t ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}
                            `}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* Window Controls (Mocked for visual, parent frame usually handles close) */}
                <div className="flex gap-2 ml-2 border-l border-gray-700 pl-2">
                   <button className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 shadow-sm" title="Close" onClick={() => window.close()} /> 
                </div>
            </div>
        </div>
    );

    // 2. DASHBOARD VIEW
    const renderDashboard = () => {
        const activeTasks = tasks.filter(t => t.is_done === 0);
        
        return (
            <div className="h-full flex flex-col p-4 pt-10"> {/* pt-10 to leave room for header trigger */}
                <div className="flex justify-between items-end mb-4 border-b border-gray-800 pb-2">
                    <h1 className="text-xl font-bold text-white tracking-tight">Active Protocols</h1>
                    <div className="text-xs text-gray-500 font-mono">{activeTasks.length} Running</div>
                </div>

                <form onSubmit={handleCreate} className="flex gap-2 mb-6">
                    <input 
                        value={newTask} 
                        onChange={e => setNewTask(e.target.value)}
                        placeholder="Initialize new objective..."
                        className="flex-1 bg-[#111] border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-gray-600"
                    />
                    <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg transition-transform active:scale-95">
                        Initialize
                    </button>
                </form>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto pr-1 pb-10 custom-scroll">
                    {activeTasks.map(task => (
                        <div key={task.id} className="bg-[#1a1a1a] border border-gray-800 hover:border-gray-600 rounded-xl p-4 transition-all group relative overflow-hidden">
                            {/* Color Tag */}
                            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: task.color_hex || '#3b82f6' }} />
                            
                            <div className="flex justify-between items-start mb-2 pl-2">
                                <h3 className="font-bold text-gray-200 truncate pr-2">{task.title}</h3>
                                {task.is_running && <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>}
                            </div>
                            
                            <div className="pl-2 mb-4">
                                <span className="text-2xl font-mono font-bold text-gray-400 tracking-wider">
                                    {formatDuration(task.total_time_ms)}
                                </span>
                            </div>

                            <div className="pl-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                                <button 
                                    onClick={() => handleTaskAction(task, 'toggle')}
                                    className={`flex-1 py-1.5 rounded text-xs font-bold uppercase tracking-wider 
                                        ${task.is_running ? 'bg-red-900/50 text-red-400 hover:bg-red-900' : 'bg-green-900/50 text-green-400 hover:bg-green-900'}`}
                                >
                                    {task.is_running ? 'Stop' : 'Start'}
                                </button>
                                <button onClick={() => handleTaskAction(task, 'terminate')} className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs">
                                    Archive
                                </button>
                            </div>
                        </div>
                    ))}
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
                {logs.map(log => {
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
                                <div className="w-1 h-8 rounded mr-3" style={{ backgroundColor: log.color_hex || '#555' }} />
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
                                <div className={`ml-3 text-gray-600 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>▼</div>
                            </div>

                            {/* Expanded Details (Accordion) */}
                            <div 
                                className={`bg-[#050505] border-t border-gray-800 transition-[max-height,opacity] duration-300 ease-in-out overflow-hidden
                                    ${isExpanded ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}
                            >
                                <div className="p-4 flex gap-4">
                                    {/* Data Column */}
                                    <div className="flex-1 space-y-3">
                                        <div>
                                            <label className="text-[10px] uppercase text-gray-600 font-bold block mb-1">Session Note</label>
                                            <textarea 
                                                value={noteDraft}
                                                onChange={(e) => setNoteDraft(e.target.value)}
                                                onBlur={() => saveNote(log.id)}
                                                placeholder="Add details about this session..."
                                                className="w-full bg-[#111] border border-gray-700 rounded p-2 text-xs text-gray-300 focus:border-blue-500 outline-none resize-none h-16"
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Actions Column */}
                                    <div className="w-1/3 flex flex-col justify-between border-l border-gray-800 pl-4">
                                        <div className="text-right">
                                            <div className="text-[10px] text-gray-500">Exact Start</div>
                                            <div className="text-xs font-mono text-gray-300">{new Date(log.start_time).toLocaleString()}</div>
                                        </div>
                                        <button 
                                            onClick={() => goToCalendarTime(log.start_time)}
                                            className="bg-blue-900/30 hover:bg-blue-800 text-blue-300 text-xs px-3 py-2 rounded border border-blue-900/50 flex items-center justify-center gap-2 transition-colors"
                                        >
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

    // 4. CALENDAR VIEW
    const renderCalendar = () => {
        // Shared Header
        const Header = () => (
            <div className="flex justify-between items-center px-4 py-3 bg-[#111] border-b border-gray-800">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">
                        {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex bg-black rounded p-0.5 border border-gray-800">
                         {['month', 'week', 'day'].map(m => (
                            <button key={m} onClick={() => setCalendarMode(m)} className={`px-3 py-1 text-[10px] font-bold uppercase rounded transition-colors ${calendarMode === m ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-white'}`}>
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex gap-1">
                    <button onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth()-1); setSelectedDate(d); }} className="p-1 hover:bg-gray-800 rounded">◀</button>
                    <button onClick={() => setSelectedDate(new Date())} className="text-xs px-2 hover:bg-gray-800 rounded">Today</button>
                    <button onClick={() => { const d = new Date(selectedDate); d.setMonth(d.getMonth()+1); setSelectedDate(d); }} className="p-1 hover:bg-gray-800 rounded">▶</button>
                </div>
            </div>
        );

        // Month View (Bug Fixed Logic)
        if (calendarMode === 'month') {
            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const startOffset = new Date(year, month, 1).getDay();

            return (
                <div className="h-full flex flex-col pt-10">
                    <Header />
                    <div className="flex-1 grid grid-cols-7 gap-px bg-gray-800 overflow-y-auto">
                        {/* Empty Slots */}
                        {Array.from({length: startOffset}).map((_, i) => <div key={`empty-${i}`} className="bg-[#050505]" />)}
                        
                        {/* Days */}
                        {Array.from({length: daysInMonth}).map((_, i) => {
                            const d = i + 1;
                            const currentDayDate = new Date(year, month, d);
                            // BUG FIX: Normalize comparison to date strings
                            const dateStr = currentDayDate.toDateString(); 
                            
                            const dayLogs = logs.filter(l => new Date(l.start_time).toDateString() === dateStr);
                            const totalMs = dayLogs.reduce((acc, l) => acc + (l.end_time ? l.end_time - l.start_time : 0), 0);
                            
                            return (
                                <div 
                                    key={d} 
                                    onClick={() => { setSelectedDate(currentDayDate); setCalendarMode('day'); }}
                                    className="bg-[#111] hover:bg-[#1a1a1a] p-2 cursor-pointer flex flex-col justify-between group transition-colors"
                                >
                                    <span className="text-xs font-bold text-gray-500 group-hover:text-white">{d}</span>
                                    {totalMs > 0 && (
                                        <div>
                                            <div className="flex gap-0.5 mb-1 flex-wrap content-end h-8">
                                                {/* Mini dots for tasks */}
                                                {dayLogs.slice(0, 8).map((l, idx) => (
                                                    <div key={idx} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: l.color_hex || '#3b82f6' }} />
                                                ))}
                                            </div>
                                            <div className="text-[10px] text-green-400 font-mono text-right border-t border-gray-800 pt-1">
                                                {formatDuration(totalMs)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // Day/Week Views (Zoomable)
        const renderTimeGrid = (days) => (
            <div className="flex-1 overflow-auto bg-[#080808] relative custom-scroll" onWheel={(e) => {
                if (e.ctrlKey) {
                    setZoomLevel(z => Math.min(3, Math.max(0.5, z + (e.deltaY > 0 ? -0.1 : 0.1))));
                }
            }}>
                <div className="flex min-h-full ml-10">
                    {/* Time Axis */}
                    <div className="fixed left-0 w-10 bg-[#111] border-r border-gray-800 h-full z-10">
                        {Array.from({length: 24}).map((_, i) => (
                            <div key={i} className="text-[9px] text-gray-500 text-right pr-1 pt-0.5 border-b border-gray-800/30" style={{ height: `${60 * zoomLevel}px` }}>
                                {i}:00
                            </div>
                        ))}
                    </div>

                    {/* Columns */}
                    {days.map((dateObj, idx) => {
                         const dateStr = dateObj.toDateString();
                         const dayLogs = logs.filter(l => new Date(l.start_time).toDateString() === dateStr);
                         
                         return (
                             <div key={idx} className="flex-1 border-r border-gray-800/50 relative min-w-[150px]">
                                 <div className="sticky top-0 bg-[#111]/90 backdrop-blur text-center text-xs font-bold text-gray-400 py-1 border-b border-gray-700 z-10">
                                     {dateObj.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                                 </div>
                                 {/* Grid Lines */}
                                 {Array.from({length: 24}).map((_, i) => (
                                     <div key={i} className="border-b border-gray-800/20 w-full absolute pointer-events-none" style={{ top: `${i * 60 * zoomLevel + 24}px`, height: `${60 * zoomLevel}px` }} />
                                 ))}
                                 
                                 {/* Logs */}
                                 {dayLogs.map(log => {
                                     const start = new Date(log.start_time);
                                     const end = log.end_time ? new Date(log.end_time) : new Date();
                                     const startMin = start.getHours() * 60 + start.getMinutes();
                                     const durationMin = (end - start) / 60000;
                                     const task = tasks.find(t => t.title === log.task_title);

                                     return (
                                         <div 
                                            key={log.id}
                                            className="absolute left-1 right-1 rounded border shadow-sm overflow-hidden hover:z-20 hover:scale-[1.02] transition-all cursor-pointer"
                                            style={{
                                                top: `${startMin * zoomLevel + 24}px`, // +24 for header offset
                                                height: `${Math.max(20, durationMin * zoomLevel)}px`,
                                                backgroundColor: `${task?.color_hex || '#333'}CC`,
                                                borderColor: task?.color_hex || '#555',
                                            }}
                                            title={log.manual_note}
                                         >
                                             <div className="px-1 py-0.5">
                                                 <div className="text-[10px] font-bold text-white truncate">{log.task_title}</div>
                                                 {zoomLevel > 0.8 && <div className="text-[9px] text-white/80 truncate">{log.manual_note}</div>}
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

        if (calendarMode === 'week') {
            // Calculate week range
            const start = new Date(selectedDate);
            const day = start.getDay() || 7;
            if (day !== 1) start.setHours(-24 * (day - 1));
            const days = Array.from({length: 7}, (_, i) => {
                const d = new Date(start); d.setDate(start.getDate() + i); return d;
            });
            return <div className="h-full flex flex-col pt-10"><Header />{renderTimeGrid(days)}</div>;
        }

        return <div className="h-full flex flex-col pt-10"><Header />{renderTimeGrid([selectedDate])}</div>;
    };

    // --- MAIN RENDER ---
    return (
        <div className="h-full w-full bg-black text-white relative overflow-hidden font-sans select-none">
            {renderHeader()}
            
            <div className="h-full w-full">
                {view === 'dashboard' && renderDashboard()}
                {view === 'history' && renderHistory()}
                {view === 'calendar' && renderCalendar()}
            </div>
        </div>
    );
};

export default TasksApp;