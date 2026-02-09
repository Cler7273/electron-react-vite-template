// frontend/src/components/TaskWidget.jsx
// A specialized widget for the Canvas to track time
import React, { useState, useEffect } from 'react';

const formatTime = (ms) => {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / 1000 / 60) % 60);
  const hours = Math.floor(ms / 1000 / 3600);
  return `${hours}h ${minutes}m ${seconds}s`;
};

const TaskWidget = ({ task, onUpdate }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(task.total_time_ms || 0);
  const [sessionStart, setSessionStart] = useState(null);

  // If the timer is running, update the UI every second
  useEffect(() => {
    let interval;
    if (isRunning && sessionStart) {
      interval = setInterval(() => {
        const currentSession = Date.now() - sessionStart;
        setElapsed((task.total_time_ms || 0) + currentSession);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, sessionStart, task.total_time_ms]);

  const toggleTimer = async () => {
    if (isRunning) {
      // Stop
      const res = await fetch(`http://localhost:4000/api/tasks/${task.id}/stop`, {
         method: 'POST',
         headers: { 'Authorization': `Bearer ${await window.electronAPI.getSecretToken()}` }
      });
      const data = await res.json();
      setIsRunning(false);
      setSessionStart(null);
      onUpdate(); // Refresh parent data
    } else {
      // Start
      await fetch(`http://localhost:4000/api/tasks/${task.id}/start`, {
         method: 'POST',
         headers: { 'Authorization': `Bearer ${await window.electronAPI.getSecretToken()}` }
      });
      setIsRunning(true);
      setSessionStart(Date.now());
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow-lg border-l-4 border-blue-500 w-64">
      <h3 className="font-bold text-gray-800">{task.title}</h3>
      <div className="text-2xl font-mono my-2 text-center">
        {formatTime(elapsed)}
      </div>
      <button 
        onClick={toggleTimer}
        className={`w-full py-1 rounded text-white font-bold ${isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
      >
        {isRunning ? 'STOP' : 'START'}
      </button>
    </div>
  );
};

export default TaskWidget;