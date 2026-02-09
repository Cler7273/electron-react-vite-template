// frontend/src/pages/KeyManager.jsx
import React, { useState, useEffect } from 'react';
import { getKeys, saveKey } from '../api.js'; // Import the new API module
// Assume KeyConfigForm is a component for editing key details
import KeyConfigForm from '../components/KeyConfigForm'; 

function KeyManager() {
  const [keys, setKeys] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);

  const refreshKeys = () => {
    getKeys().then(setKeys);
  };

  useEffect(() => {
    refreshKeys();
  }, []);

  const handleSaveKey = async (keyData) => {
    await saveKey(keyData);
    refreshKeys();
    setSelectedKey(null); // Close the form
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Key Manager</h1>
      <div className="flex space-x-4">
        <div className="w-1/3">
          <button onClick={() => setSelectedKey({})} className="w-full p-2 bg-blue-500 text-white rounded">
            Create New Key
          </button>
          <ul className="mt-4 space-y-2">
            {keys.map(key => (
              <li key={key._id} onClick={() => setSelectedKey(key)} className="p-2 border rounded cursor-pointer hover:bg-gray-200">
                {key.name}
              </li>
            ))}
          </ul>
        </div>
        <div className="w-2/3">
          {selectedKey && (
            <KeyConfigForm
              initialData={selectedKey}
              onSave={handleSaveKey}
              onCancel={() => setSelectedKey(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default KeyManager;