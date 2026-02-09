// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { initializeApi } from './api';
import KeyManager from './pages/KeyManager';
import Dashboard from './pages/Dashboard';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');

  useEffect(() => {
    // Initialize the API client with the secret token from the main process.
    // This is necessary for communicating with the backend server securely.
    initializeApi();
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'keyManager':
        return <KeyManager />;
      case 'dashboard':
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar Navigation */}
      <nav className="w-64 bg-gray-800 text-white p-4 flex flex-col">
        <h1 className="text-2xl font-bold mb-8">NASMCryptor</h1>
        <ul className="space-y-2">
          <li><button onClick={() => setCurrentView('dashboard')} className="w-full text-left p-2 rounded hover:bg-gray-700">Dashboard</button></li>
          <li><button onClick={() => setCurrentView('keyManager')} className="w-full text-left p-2 rounded hover:bg-gray-700">Key Manager</button></li>
          {/* Add 'Peers' button here later */}
        </ul>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {renderView()}
      </main>
      {/* Global UI elements like Notification and Progress bar are removed
          as their data source (IPC listeners) are no longer available in the new architecture. */}
    </div>
  );
}

export default App;