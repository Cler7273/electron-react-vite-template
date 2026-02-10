import React, { useState, useEffect } from 'react';

const TasksApp = () => {
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const fetchTasks = async () => {
    try {
      const token = await window.nativeAPI.getSecretToken();
      const res = await fetch('http://localhost:4000/api/all', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchTasks(); }, []);

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
    // Refresh Canvas widgets too
    window.dispatchEvent(new CustomEvent('cognicanvas:data-updated'));
  };

  return (
    <div className="p-4 space-y-4">
      <form onSubmit={handleCreate} className="flex gap-2">
        <input 
          type="text" 
          className="flex-1 border rounded px-2 py-1 text-sm text-black"
          placeholder="New Task Name..." 
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          autoFocus
        />
        <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold">Add</button>
      </form>

      <div className="space-y-2">
        {tasks.length === 0 && <p className="text-gray-500 text-sm italic text-center">No tasks yet.</p>}
        {tasks.map(task => (
          <div key={task.id} className="bg-white border rounded p-2 flex justify-between items-center shadow-sm">
            <div>
              <div className="font-bold text-gray-800 text-sm">{task.title}</div>
              <div className="text-xs text-gray-500">
                Total: {Math.floor(task.total_time_ms / 1000 / 60)}m 
                {task.is_running && <span className="text-green-600 font-bold ml-1">(RUNNING)</span>}
              </div>
            </div>
            <div className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">
              Widget Active
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TasksApp;