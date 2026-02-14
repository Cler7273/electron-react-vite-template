import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// THIS IS THE FIX: Import the main CSS file which contains the
// @tailwind directives. This loads all of Tailwind's utility classes.
import './index.css'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);