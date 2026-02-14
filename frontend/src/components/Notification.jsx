// frontend/src/components/Notification.jsx
import React, { useState, useEffect } from 'react';

function Notification({ message, duration = 5000 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [message, duration]);

  if (!visible) return null;

  return (
    <div className="fixed top-5 right-5 bg-blue-500 text-white p-4 rounded-lg shadow-lg animate-fade-in-out">
      <h3 className="font-bold">{message.title}</h3>
      <p>{message.body}</p>
    </div>
  );
}

export default Notification;