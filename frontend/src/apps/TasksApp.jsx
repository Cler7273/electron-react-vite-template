// frontend/src/apps/TasksApp.jsx
import React, { useState, useEffect, useMemo } from 'react';
import * as API from '../api';
import '../styles/calendar.css';

// --- SUB-COMPONENT: CONTEXT MENU ---
const ContextMenu = ({ x, y, task, onClose, onAction }) => {
    if (!task) return null;
    return (
        <>
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />
            <div 
                className="fixed z-[9999] bg-[#222] border border-gray-600 rounded-md shadow-2xl py-1 w-48 text-gray-200 text-sm animate-in fade-in zoom-in-95 duration-75"
                style={{ top: y, left: x }}
            >
                <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase border-b border-gray-700 mb-1">{task.title}</div>
                <button onClick={() => onAction('toggle')} className="w-full text-left px-3 py-2 hover:bg-blue-600 flex gap-2">
                    <span>{task.is_running ? '⏸ Stop' : '▶ Start'}</span>
                </button>
                <button onClick={() => onAction('properties')} className="w-full text-left px-3 py-2 hover:bg-gray-700 flex gap-2">
                    <span>📊 History & Props</span>
                </button>
                <button onClick={() => onAction('terminate')} className="w-full text-left px-3 py-2 hover:bg-orange-600 flex gap-2 border-t border-gray-700 mt-1">
                    <span>🏁 Terminate</span>
                </button>
                <button onClick={() => onAction('delete')} className="w-full text-left px-3 py-2 hover:bg-red-700 text-red-300 flex gap-2">
                    <span>🗑 Hard Delete</span>
                </button>
            </div>
        </>
    );
};

// --- HELPER: FORMAT DURATION ---
const formatDuration = (ms) => {
    if (!ms) return "0m";
    const hrs = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
};

const TasksApp = () => {
    // --- STATE ---
    const [view, setView] = useState('dashboard'); // 'dashboard', 'history', 'calendar'
    const [calendarMode, setCalendarMode] = useState('month'); // 'month', 'day'
    const [selectedDate, setSelectedDate] = useState(new Date());
    
    const [tasks, setTasks] = useState([]);
    const [logs, setLogs] = useState([]);
    const [contextMenu, setContextMenu] = useState(null); // { x, y, task }
    const [newTask, setNewTask] = useState("");

    // --- DATA FETCHING ---
    const loadData = async () => {
        try {
            const tData = await API.getTasks();
            const lData = await API.getHistory();
            setTasks(tData.tasks || []);
            setLogs(lData || []);
        } catch (e) {
            console.error("Failed to load task data", e);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000); // Poll every 30s
        const handleRemote = () => loadData();
        window.addEventListener('cognicanvas:data-updated', handleRemote);
        return () => {
            clearInterval(interval);
            window.removeEventListener('cognicanvas:data-updated', handleRemote);
        };
    }, []);

    // --- ACTIONS ---
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        await API.createTask(newTask);
        setNewTask("");
        loadData();
    };

    const handleMenuAction = async (action) => {
        const { task } = contextMenu;
        setContextMenu(null); // Close menu
        
        switch (action) {
            case 'toggle':
                await API.toggleTask(task.id, task.is_running ? 'stop' : 'start');
                break;
            case 'terminate':
                if (confirm(`Retire "${task.title}" to archives?`)) await API.terminateTask(task.id);
                break;
            case 'delete':
                if (confirm(`PERMANENTLY DELETE "${task.title}" and all its history?`)) await API.deleteTask(task.id);
                break;
            case 'properties':
                setView('history');
                // Could implement a filter here later
                break;
            default: break;
        }
        loadData();
    };

    const goToDay = (date) => {
        setSelectedDate(date);
        setCalendarMode('day');
        setView('calendar');
    };

    // --- RENDERERS ---

    const renderDashboard = () => {
        const activeTasks = tasks.filter(t => t.is_done === 0);
        const terminatedTasks = tasks.filter(t => t.is_done === 1);

        const TaskCard = ({ task }) => (
            <div 
                className="bg-gray-800 hover:bg-gray-750 border-l-4 p-3 rounded shadow-sm cursor-context-menu flex justify-between items-center transition-all hover:translate-x-1"
                style={{ borderLeftColor: task.color_hex || '#3b82f6' }}
                onClick={(e) => {
                    // Left click opens context menu in this design as per prompt "Interaction"
                    setContextMenu({ x: e.clientX, y: e.clientY, task });
                }}
            >
                <div>
                    <h4 className="font-bold text-gray-200 text-sm">{task.title}</h4>
                    <span className="text-xs text-gray-500 font-mono">
                        {formatDuration(task.total_time_ms)} total
                    </span>
                </div>
                {task.is_running && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />}
            </div>
        );

        return (
            <div className="flex h-full gap-4 p-2 overflow-hidden">
                {/* Active Column */}
                <div className="flex-1 flex flex-col min-w-0">
                    <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Active Protocols</h3>
                    <form onSubmit={handleCreate} className="mb-2 flex gap-1">
                        <input 
                            value={newTask} 
                            onChange={e => setNewTask(e.target.value)}
                            placeholder="Initialize Task..."
                            className="flex-1 bg-black border border-gray-700 rounded px-2 py-1 text-sm focus:border-blue-500 outline-none"
                        />
                        <button className="bg-blue-600 px-3 rounded text-white font-bold text-xs">+</button>
                    </form>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                        {activeTasks.map(t => <TaskCard key={t.id} task={t} />)}
                        {activeTasks.length === 0 && <div className="text-center text-gray-600 italic text-xs mt-10">No active tasks.</div>}
                    </div>
                </div>

                {/* Terminated Column */}
                <div className="w-1/3 flex flex-col border-l border-gray-800 pl-4 min-w-0">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Archives</h3>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin opacity-75">
                        {terminatedTasks.map(t => <TaskCard key={t.id} task={t} />)}
                    </div>
                </div>
            </div>
        );
    };

    const renderHistory = () => (
        <div className="h-full overflow-y-auto pr-2 scrollbar-thin">
            <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#111] z-10 text-xs text-gray-500 uppercase">
                    <tr>
                        <th className="p-2 border-b border-gray-800">Date</th>
                        <th className="p-2 border-b border-gray-800">Task</th>
                        <th className="p-2 border-b border-gray-800">Duration</th>
                        <th className="p-2 border-b border-gray-800">Time</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {logs.map(log => {
                        const duration = log.end_time ? log.end_time - log.start_time : 0;
                        const opacity = Math.min(1, Math.max(0.2, duration / 3600000)); // Darker for longer tasks
                        const task = tasks.find(t => t.title === log.task_title) || {};
                        
                        return (
                            <tr 
                                key={log.id} 
                                className="hover:bg-gray-800 cursor-pointer transition-colors group"
                                onClick={() => goToDay(new Date(log.start_time))}
                            >
                                <td className="p-2 border-b border-gray-800 text-gray-400 font-mono text-xs">
                                    {new Date(log.start_time).toLocaleDateString()}
                                </td>
                                <td className="p-2 border-b border-gray-800 font-bold relative pl-4">
                                    <div 
                                        className="absolute left-0 top-2 bottom-2 w-1 rounded-r" 
                                        style={{ backgroundColor: task.color_hex || '#555' }} 
                                    />
                                    {log.task_title}
                                </td>
                                <td className="p-2 border-b border-gray-800 font-mono text-blue-300">
                                    {log.end_time ? formatDuration(duration) : 'Active'}
                                </td>
                                <td className="p-2 border-b border-gray-800 text-gray-500 text-xs">
                                    {new Date(log.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    const renderCalendar = () => {
        if (calendarMode === 'day') {
            // DAY VIEW
            const dateStr = selectedDate.toLocaleDateString();
            const dayLogs = logs.filter(l => new Date(l.start_time).toLocaleDateString() === dateStr);
            
            return (
                <div className="h-full flex flex-col calendar-wrapper">
                    <div className="flex justify-between items-center p-2 bg-gray-900 border-b border-gray-800">
                        <button onClick={() => setCalendarMode('month')} className="text-xs hover:text-white text-gray-400">← Back to Month</button>
                        <h2 className="font-bold text-white">{selectedDate.toDateString()}</h2>
                        <div className="w-10"></div>
                    </div>
                    <div className="day-view-container relative">
                        {/* Time Grid (0-24h) */}
                        {Array.from({ length: 24 }).map((_, i) => (
                            <div key={i} className="h-[60px] border-t border-gray-800 w-full" style={{top: `${i * 60}px`}}>
                                <span className="time-slot-label">{i}:00</span>
                            </div>
                        ))}
                        {/* Blocks */}
                        {dayLogs.map(log => {
                            const start = new Date(log.start_time);
                            const end = log.end_time ? new Date(log.end_time) : new Date(); // If running, assume now
                            const startMin = start.getHours() * 60 + start.getMinutes();
                            const durationMin = (end - start) / 60000;
                            const task = tasks.find(t => t.title === log.task_title);

                            return (
                                <div 
                                    key={log.id}
                                    className="task-block"
                                    style={{
                                        top: `${startMin}px`, // 1px = 1min
                                        height: `${Math.max(20, durationMin)}px`,
                                        backgroundColor: `${task?.color_hex || '#374151'}80`, // Add opacity
                                        border: `2px solid ${task?.color_hex || '#374151'}`,
                                    }}
                                >
                                    <div className="font-bold truncate">{log.task_title}</div>
                                    <div className="text-[10px] opacity-75">{formatDuration(end - start)}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // MONTH VIEW
        // Simple logic: Get first day of month, fill grid
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startOffset = firstDay.getDay(); // 0 = Sun
        
        const days = [];
        // Empty slots
        for(let i=0; i<startOffset; i++) days.push(<div key={`empty-${i}`} className="day-cell inactive" />);
        // Days
        for(let d=1; d<=daysInMonth; d++) {
            const currentDayStr = new Date(year, month, d).toLocaleDateString();
            const dayLogs = logs.filter(l => new Date(l.start_time).toLocaleDateString() === currentDayStr);
            const totalMs = dayLogs.reduce((acc, l) => acc + (l.end_time ? l.end_time - l.start_time : 0), 0);
            
            days.push(
                <div 
                    key={d} 
                    className="day-cell cursor-pointer flex flex-col"
                    onClick={() => goToDay(new Date(year, month, d))}
                >
                    <span className="text-gray-500 text-xs font-bold">{d}</span>
                    {totalMs > 0 && (
                        <div className="mt-auto">
                            <div className="h-1 bg-green-900 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-green-500" 
                                    style={{ width: `${Math.min(100, (totalMs / 28800000) * 100)}%` }} // Base on 8h work day
                                />
                            </div>
                            <div className="text-[10px] text-green-400 text-right mt-1">{formatDuration(totalMs)}</div>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="h-full flex flex-col calendar-wrapper p-2">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setSelectedDate(new Date(year, month - 1, 1))} className="px-2 py-1 bg-gray-800 rounded">◀</button>
                    <h2 className="font-bold text-lg uppercase tracking-widest">
                        {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={() => setSelectedDate(new Date(year, month + 1, 1))} className="px-2 py-1 bg-gray-800 rounded">▶</button>
                </div>
                <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-1">
                    <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                </div>
                <div className="month-grid flex-1">
                    {days}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-[#111] text-gray-100 font-sans relative">
            {/* Tabs */}
            <nav className="flex bg-black/40 p-1 m-2 rounded-lg gap-1 border border-gray-800">
                {['dashboard', 'history', 'calendar'].map(t => (
                    <button
                        key={t}
                        onClick={() => setView(t)}
                        className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-widest rounded transition-all
                            ${view === t ? 'bg-gray-700 text-white shadow-md' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}
                        `}
                    >
                        {t}
                    </button>
                ))}
            </nav>

            {/* Content */}
            <main className="flex-1 min-h-0 relative">
                {view === 'dashboard' && renderDashboard()}
                {view === 'history' && renderHistory()}
                {view === 'calendar' && renderCalendar()}
            </main>

            {/* Context Menu Portal */}
            {contextMenu && (
                <ContextMenu 
                    {...contextMenu} 
                    onClose={() => setContextMenu(null)} 
                    onAction={handleMenuAction}
                />
            )}
        </div>
    );
};

export default TasksApp;