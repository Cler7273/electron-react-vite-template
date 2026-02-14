// frontend/src/apps/TasksApp.jsx
import React, { useState, useEffect } from 'react';

const TasksApp = () => {
  const [tab, setTab] = useState('active'); // 'active' | 'history' | 'calendar'
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // --- HELPERS ---
  const formatDurationHMS = (ms) => {
      if (!ms) return "0s";
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / (1000 * 60)) % 60);
      const hours = Math.floor((ms / (1000 * 60 * 60)));

      const parts = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
      
      return parts.join(' ');
  };

  const formatDate = (ts) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const formatTime = (ts) => new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  // --- API FETCHING ---
  const fetchTasks = async () => {
    try {
      const token = await window.nativeAPI.getSecretToken();
      const res = await fetch('http://localhost:4000/api/all', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (e) { console.error("Fetch tasks failed", e); }
  };

  const fetchHistory = async () => {
      try {
        const token = await window.nativeAPI.getSecretToken();
        const res = await fetch('http://localhost:4000/api/history', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        setHistory(data || []);
      } catch (e) { console.error("Fetch history failed", e); }
  };

  // --- LIFECYCLE ---
  useEffect(() => {
    // Initial Load
    fetchTasks();
    fetchHistory();

    // Listen for widget updates (start/stop on canvas) to refresh this list
    const handleRefresh = () => {
        fetchTasks();
        if (tab !== 'active') fetchHistory();
    };
    window.addEventListener('cognicanvas:data-updated', handleRefresh);
    return () => window.removeEventListener('cognicanvas:data-updated', handleRefresh);
  }, [tab]);

  // --- HANDLERS ---
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const token = await window.nativeAPI.getSecretToken();
    await fetch('http://localhost:4000/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title: newTaskTitle })
    });
    setNewTaskTitle("");
    fetchTasks();
    // Notify Canvas to spawn widget
    window.dispatchEvent(new CustomEvent('cognicanvas:data-updated'));
  };

  // --- RENDERERS ---
  const renderActive = () => (
    <>
        <form onSubmit={handleCreate} className="flex gap-2 mb-4">
            <input 
                type="text" 
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="New Task Name..." 
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                autoFocus
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-bold shadow-md transition-transform active:scale-95">
                Add
            </button>
        </form>

        <div className="space-y-2 overflow-y-auto pr-2 h-[300px] scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {tasks.length === 0 && <p className="text-gray-500 text-sm italic text-center mt-8">No active tasks.</p>}
            {tasks.map(task => (
                <div key={task.id} className="bg-gray-800/50 border border-gray-700 rounded p-3 flex justify-between items-center hover:bg-gray-800 transition-colors">
                    <div>
                        <div className="font-bold text-gray-200 text-sm flex items-center gap-2">
                            {task.title}
                            {task.is_running && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />}
                        </div>
                        <div className="text-xs text-gray-400 font-mono mt-1">
                            Total: {formatDurationHMS(task.total_time_ms)}
                        </div>
                    </div>
                    {task.is_running && <span className="text-[10px] font-bold bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-900">RUNNING</span>}
                </div>
            ))}
        </div>
    </>
  );

  const renderHistory = () => (
      <div className="space-y-3 overflow-y-auto pr-2 h-[350px] scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {history.length === 0 && <p className="text-gray-500 text-sm italic text-center mt-8">No session history found.</p>}
          {history.map(log => (
              <div key={log.id} className="bg-gray-800/30 border-l-2 border-blue-500 pl-3 py-2 pr-2 rounded-r hover:bg-gray-800/50 transition-colors">
                  <div className="flex justify-between items-start">
                      <span className="font-bold text-gray-200 text-sm">{log.task_title}</span>
                      <span className="text-xs font-mono text-gray-500">{formatDate(log.start_time)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                      <div className="text-xs text-gray-400 font-mono">
                          {formatTime(log.start_time)} - {log.end_time ? formatTime(log.end_time) : '...'}
                      </div>
                      <div className="text-xs font-bold text-blue-300 font-mono bg-blue-900/20 px-1.5 py-0.5 rounded">
                          {log.end_time ? formatDurationHMS(log.end_time - log.start_time) : 'Active'}
                      </div>
                  </div>
              </div>
          ))}
      </div>
  );

  const renderCalendar = () => {
      // Logic: Generate last 28 days
      const days = [];
      const today = new Date();
      // Reset to start of day for accurate comparison
      today.setHours(0,0,0,0);

      for(let i=27; i>=0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const dateStr = d.toLocaleDateString();
          
          // Aggregate Logs
          const dayLogs = history.filter(h => new Date(h.start_time).toLocaleDateString() === dateStr);
          const totalMs = dayLogs.reduce((acc, curr) => acc + (curr.end_time ? (curr.end_time - curr.start_time) : 0), 0);
          
          let colorClass = 'bg-gray-800 border-gray-700';
          if(totalMs > 0) colorClass = 'bg-green-900/60 border-green-800';
          if(totalMs > 3600000) colorClass = 'bg-green-700 border-green-600'; // > 1h
          if(totalMs > 14400000) colorClass = 'bg-green-500 border-green-400'; // > 4h

          days.push(
              <div key={i} className={`h-8 w-8 rounded ${colorClass} border flex items-center justify-center text-[10px] relative group cursor-help transition-all hover:scale-110`}>
                  <span className="text-gray-300 pointer-events-none">{d.getDate()}</span>
                  
                  {/* Tooltip */}
                  {totalMs > 0 && (
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap hidden group-hover:block z-50 border border-gray-600 shadow-xl">
                          {formatDurationHMS(totalMs)}
                      </div>
                  )}
              </div>
          );
      }

      return (
          <div className="p-2">
              <div className="flex justify-between items-baseline mb-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Efficiency Grid</h3>
                  <span className="text-[10px] text-gray-500">Last 28 Days</span>
              </div>
              <div className="grid grid-cols-7 gap-2">
                  {days}
              </div>
              <div className="mt-4 flex gap-2 justify-center text-[10px] text-gray-500">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-gray-800 rounded"></div> 0m</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-900/60 rounded"></div> &lt;1h</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-700 rounded"></div> &gt;1h</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded"></div> &gt;4h</span>
              </div>
          </div>
      );
  };

  return (
    <div className="h-full flex flex-col bg-[#111] text-gray-100 p-1">
      {/* Custom Tab Bar */}
      <div className="flex mb-4 bg-black/20 p-1 rounded-lg">
          {['active', 'history', 'calendar'].map(t => (
            <button 
                key={t}
                onClick={() => setTab(t)} 
                className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all
                    ${tab === t ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}
                `}
            >
                {t}
            </button>
          ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0">
        {tab === 'active' && renderActive()}
        {tab === 'history' && renderHistory()}
        {tab === 'calendar' && renderCalendar()}
      </div>
    </div>
  );
};

export default TasksApp;

/**COMPLEMENTARY CODE FOR FUTUR UNIFICATION. BUT IT WAS SOMEWHY INCOMPLETE SO ADDED HERE TO NOT LOOSE ANYTHING
 * 
 * import React, { useState, useEffect } from 'react';

const TasksApp = () => {
  const [tab, setTab] = useState('active'); // 'active' | 'history' | 'calendar'
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  // NEW: State for selected day details
  const [selectedDate, setSelectedDate] = useState(null);

  const formatDurationHMS = (ms) => {
      if (!ms) return "0s";
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / (1000 * 60)) % 60);
      const hours = Math.floor((ms / (1000 * 60 * 60)));
      const parts = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
      return parts.join(' ');
  };

  const formatDate = (ts) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const formatTime = (ts) => new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  const fetchTasks = async () => {
    try {
      const token = await window.nativeAPI.getSecretToken();
      const res = await fetch('http://localhost:4000/api/all', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (e) { console.error("Fetch tasks failed", e); }
  };

  const fetchHistory = async () => {
      try {
        const token = await window.nativeAPI.getSecretToken();
        const res = await fetch('http://localhost:4000/api/history', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        setHistory(data || []);
      } catch (e) { console.error("Fetch history failed", e); }
  };

  useEffect(() => {
    fetchTasks();
    fetchHistory();
    const handleRefresh = () => { fetchTasks(); if (tab !== 'active') fetchHistory(); };
    window.addEventListener('cognicanvas:data-updated', handleRefresh);
    return () => window.removeEventListener('cognicanvas:data-updated', handleRefresh);
  }, [tab]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const token = await window.nativeAPI.getSecretToken();
    await fetch('http://localhost:4000/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ title: newTaskTitle }) });
    setNewTaskTitle("");
    fetchTasks();
    window.dispatchEvent(new CustomEvent('cognicanvas:data-updated'));
  };

  // --- RENDERERS ---
  const renderActive = () => (
    <>
        <form onSubmit={handleCreate} className="flex gap-2 mb-4">
            <input type="text" className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="New Task Name..." value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} autoFocus />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-bold shadow-md transition-transform active:scale-95">Add</button>
        </form>
        <div className="space-y-2 overflow-y-auto pr-2 h-[300px] scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {tasks.map(task => (
                <div key={task.id} className="bg-gray-800/50 border border-gray-700 rounded p-3 flex justify-between items-center hover:bg-gray-800 transition-colors">
                    <div>
                        <div className="font-bold text-gray-200 text-sm flex items-center gap-2">{task.title} {task.is_running && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />}</div>
                        <div className="text-xs text-gray-400 font-mono mt-1">Total: {formatDurationHMS(task.total_time_ms)}</div>
                    </div>
                </div>
            ))}
        </div>
    </>
  );

  const renderHistoryList = (list) => (
      <div className="space-y-3 overflow-y-auto pr-2 h-[350px] scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {list.length === 0 && <p className="text-gray-500 text-sm italic text-center mt-8">No records found.</p>}
          {list.map(log => (
              <div key={log.id} className="bg-gray-800/30 border-l-2 border-blue-500 pl-3 py-2 pr-2 rounded-r hover:bg-gray-800/50 transition-colors">
                  <div className="flex justify-between items-start">
                      <span className="font-bold text-gray-200 text-sm">{log.task_title}</span>
                      <span className="text-xs font-mono text-gray-500">{formatDate(log.start_time)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                      <div className="text-xs text-gray-400 font-mono">
                          {formatTime(log.start_time)} - {log.end_time ? formatTime(log.end_time) : '...'}
                      </div>
                      <div className="text-xs font-bold text-blue-300 font-mono bg-blue-900/20 px-1.5 py-0.5 rounded">
                          {log.end_time ? formatDurationHMS(log.end_time - log.start_time) : 'Active'}
                      </div>
                  </div>
              </div>
          ))}
      </div>
  );

  const renderCalendar = () => {
      // Logic: Generate last 28 days
      const days = [];
      const today = new Date();
      today.setHours(0,0,0,0);

      for(let i=27; i>=0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const dateStr = d.toLocaleDateString();
          
          // Find logs for this specific day
          const dayLogs = history.filter(h => new Date(h.start_time).toLocaleDateString() === dateStr);
          const totalMs = dayLogs.reduce((acc, curr) => acc + (curr.end_time ? (curr.end_time - curr.start_time) : 0), 0);
          
          let colorClass = 'bg-gray-800 border-gray-700';
          if(totalMs > 0) colorClass = 'bg-green-900/60 border-green-800';
          if(totalMs > 3600000) colorClass = 'bg-green-700 border-green-600'; // > 1h
          
          const isSelected = selectedDate === dateStr;

          days.push(
              <div 
                key={i} 
                className={`h-8 w-8 rounded border flex items-center justify-center text-[10px] relative cursor-pointer transition-all hover:scale-110 
                    ${colorClass} ${isSelected ? 'ring-2 ring-white scale-110 z-10' : ''}`}
                onClick={() => setSelectedDate(dateStr)}
              >
                  <span className="text-gray-300 pointer-events-none">{d.getDate()}</span>
              </div>
          );
      }

      // Filter history for selected date
      const selectedLogs = selectedDate 
        ? history.filter(h => new Date(h.start_time).toLocaleDateString() === selectedDate)
        : [];

      return (
          <div className="p-2 h-full flex flex-col">
              <div className="flex justify-between items-baseline mb-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Efficiency Grid</h3>
                  <span className="text-[10px] text-gray-500">Click a day to view details</span>
              </div>
              <div className="grid grid-cols-7 gap-2 mb-4">
                  {days}
              </div>
              
              // Day Details View 
              <div className="flex-1 min-h-0 border-t border-gray-700 pt-2">
                  <h4 className="text-xs font-bold text-white mb-2">
                      {selectedDate ? `Activity for ${selectedDate}` : "Select a day above"}
                  </h4>
                  {selectedDate && renderHistoryList(selectedLogs)}
              </div>
          </div>
      );
  };

  return (
    <div className="h-full flex flex-col bg-[#111] text-gray-100 p-1">
      <div className="flex mb-4 bg-black/20 p-1 rounded-lg">
          {['active', 'history', 'calendar'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${tab === t ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
                {t}
            </button>
          ))}
      </div>
      <div className="flex-1 min-h-0">
        {tab === 'active' && renderActive()}
        {tab === 'history' && renderHistoryList(history)}
        {tab === 'calendar' && renderCalendar()}
      </div>
    </div>
  );
};

export default TasksApp;
 * 
 * 
 * 
 */