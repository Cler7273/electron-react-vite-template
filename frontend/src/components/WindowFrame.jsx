import React, { useRef } from 'react'; // 1. Import useRef
import Draggable from 'react-draggable';

const WindowFrame = ({ title, onClose, children, initialPos = { x: 100, y: 100 }, width = 500 }) => {
  const nodeRef = useRef(null); // 2. Create the reference

  return (
    <Draggable 
      handle=".window-header" 
      defaultPosition={initialPos}
      nodeRef={nodeRef} // 3. Tell Draggable to use this ref (Stops the error)
    >
      <div 
        ref={nodeRef} // 4. Attach the ref to the actual DIV
        className="absolute z-50 flex flex-col bg-white rounded-lg shadow-2xl border border-gray-700 overflow-hidden"
        style={{ width: width, minHeight: '300px' }}
      >
        {/* Window Header */}
        <div className="window-header h-8 bg-gray-800 text-white flex items-center justify-between px-3 cursor-move select-none">
          <span className="font-bold text-xs uppercase tracking-wider">{title}</span>
          <div className="flex space-x-2">
            <button 
              onClick={onClose}
              className="w-4 h-4 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center"
            >
              <span className="text-xs pb-1">×</span>
            </button>
          </div>
        </div>

        {/* Window Content */}
        <div className="flex-1 overflow-auto p-4 bg-gray-100 text-gray-900">
          {children}
        </div>
      </div>
    </Draggable>
  );
};

export default WindowFrame;