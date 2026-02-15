import React, { useRef } from 'react'; 
import Draggable from 'react-draggable';

const WindowFrame = ({ title, onClose, children, initialPos = { x: 100, y: 100 }, width = 500, chromeless = false }) => {
  const nodeRef = useRef(null);

  // 1. DETERMINE MODE
  // If the title is TasksApp, or the prop is explicitly set, we go "Chromeless"
  const isChromeless = chromeless || title === "TasksApp";

  return (
    <Draggable 
      // 2. DYNAMIC HANDLE
      // Standard mode grabs the gray bar (.window-header).
      // Chromeless mode expects the CHILD to have a class named .custom-window-drag (The Grip/Pill).
      handle={isChromeless ? ".custom-window-drag" : ".window-header"} 
      defaultPosition={initialPos}
      nodeRef={nodeRef} 
    >
      <div 
        ref={nodeRef} 
        className={`absolute z-50 flex flex-col 
          ${isChromeless 
            ? "bg-transparent shadow-none border-none" // Invisible Wrapper for TasksApp
            : "bg-white rounded-lg shadow-2xl border border-gray-700 overflow-hidden" // Standard Window
          }`}
        style={{ 
          width: width, 
          // Let TasksApp decide its own height, otherwise default to 300px
          minHeight: isChromeless ? 'auto' : '300px' 
        }}
      >
        {/* 3. CONDITIONAL HEADER */}
        {/* Only render the gray bar if we are NOT in chromeless mode */}
        {!isChromeless && (
          <div className="window-header h-8 bg-gray-800 text-white flex items-center justify-between px-3 cursor-move select-none">
            <span className="font-bold text-xs uppercase tracking-wider">{title}</span>
            <div className="flex space-x-2">
              <div>Chrome</div>
              <button 
                onClick={onClose}
                className="w-4 h-4 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center"
              >
                <span className="text-xs pb-1">×</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. CONTENT WRAPPER */}
        {/* Remove padding and background for TasksApp so it can round its own corners */}
        <div className={`flex-1 overflow-auto ${isChromeless ? "p-0 bg-transparent" : "p-4 bg-gray-100 text-gray-900"}`}>
          {children}
        </div>
      </div>
    </Draggable>
  );
};

export default WindowFrame;