import React, { useState, useEffect } from 'react';

const TasksApp = () => {
  const [tab, setTab] = useState('active'); // 'active' | 'history'
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const fetchTasks = async () => {
    try {
      const token = await window.nativeAPI.getSecretToken();
      const res = await fetch('http://localhost:4000/api/all', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (e) { console.error(e); }
  };

  const fetchHistory = async () => {
      try {
        const token = await window.nativeAPI.getSecretToken();
        const res = await fetch('http://localhost:4000/api/history', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        setHistory(data || []);
      } catch (e) { console.error(e); }
  };

  useEffect(() => { 
      if (tab === 'active') fetchTasks();
      if (tab === 'history') fetchHistory();
  }, [tab]);

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
    window.dispatchEvent(new CustomEvent('cognicanvas:data-updated'));
  };

  // Helper to format duration
  const formatDuration = (ms) => {
      const min = Math.floor(ms / 60000);
      return min < 60 ? `${min}m` : `${Math.floor(min/60)}h ${min%60}m`;
  };

  const renderActive = () => (
    <>
        <form onSubmit={handleCreate} className="flex gap-2 mb-4">
            <input 
            type="text" 
            className="flex-1 border border-gray-600 bg-gray-700 text-white rounded px-2 py-1 text-sm focus:border-blue-500 outline-none"
            placeholder="New Task Name..." 
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            autoFocus
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm font-bold">Add</button>
        </form>

        <div className="space-y-2 h-[calc(100%-3rem)] overflow-y-auto pr-1">
            {tasks.length === 0 && <p className="text-gray-500 text-sm italic text-center mt-10">No tasks yet.</p>}
            {tasks.map(task => (
            <div key={task.id} className="bg-gray-800 border border-gray-700 rounded p-2 flex justify-between items-center shadow-sm">
                <div>
                <div className="font-bold text-gray-200 text-sm">{task.title}</div>
                <div className="text-xs text-gray-400">
                    Total: {formatDuration(task.total_time_ms)}
                    {task.is_running && <span className="text-green-400 font-bold ml-2 animate-pulse">● RUNNING</span>}
                </div>
                </div>
            </div>
            ))}
        </div>
    </>
  );

  const renderHistory = () => (
      <div className="space-y-3 h-full overflow-y-auto pr-1">
          {history.length === 0 && <p className="text-gray-500 text-sm italic text-center mt-10">No sessions recorded.</p>}
          {history.map(log => (
              <div key={log.id} className="bg-gray-800 border-l-4 border-gray-600 pl-3 py-2 pr-2 rounded-r shadow-sm">
                  <div className="flex justify-between items-start">
                      <span className="font-bold text-gray-200 text-sm">{log.task_title}</span>
                      <span className="text-xs font-mono text-gray-500">{new Date(log.start_time).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                      <div className="text-xs text-gray-400">
                          {new Date(log.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                          {log.end_time ? new Date(log.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                      </div>
                      <div className="text-xs font-bold text-blue-400">
                          {log.end_time ? formatDuration(log.end_time - log.start_time) : 'Active'}
                      </div>
                  </div>
                  {/* Rating / Notes visualization if available */}
                  {(log.rating > 0 || log.session_notes) && (
                      <div className="mt-2 pt-2 border-t border-gray-700 flex gap-2 text-xs">
                          {log.rating > 0 && <span className="text-yellow-500">{'★'.repeat(log.rating)}</span>}
                          {log.session_notes && <span className="text-gray-400 italic truncate">{log.session_notes}</span>}
                      </div>
                  )}
              </div>
          ))}
      </div>
  );

  return (
    <div className="p-4 h-full flex flex-col bg-[#111] text-gray-100">
      {/* Tabs */}
      <div className="flex border-b border-gray-700 mb-4">
          <button 
            onClick={() => setTab('active')} 
            className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${tab==='active' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
              TASKS
          </button>
          <button 
            onClick={() => setTab('history')} 
            className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${tab==='history' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
              HISTORY
          </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'active' ? renderActive() : renderHistory()}
      </div>
    </div>
  );
};

export default TasksApp;