import React, { useRef, useState, useEffect } from "react";
import Draggable from "react-draggable";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";

const Frame = ({ frame, scale, onUpdate, onDelete, onDrag, onDragStop }) => {
  const nodeRef = useRef(null); // StrictMode compliance
  const [title, setTitle] = useState(frame.title);

  // Sync internal state if props change externally
  useEffect(() => {
    setTitle(frame.title);
  }, [frame.title]);

  const handleResizeStop = (e, data) => {
    onUpdate(frame.id, { width: data.size.width, height: data.size.height });
  };

  const handleTitleBlur = () => {
    if (title !== frame.title) {
      onUpdate(frame.id, { title });
    }
  };

  const toggleCollapse = () => {
    onUpdate(frame.id, { is_collapsed: !frame.is_collapsed });
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".frame-handle"
      position={{ x: frame.pos_x, y: frame.pos_y }}
      scale={scale}
      onDrag={(e, data) => onDrag(frame.id, data.deltaX, data.deltaY)} // Real-time visual sync for children
      onStop={(e, data) => onDragStop(frame.id, { pos_x: data.x, pos_y: data.y })} // Persist on stop
    >
      <div
        ref={nodeRef}
        className="absolute z-10 group"
        style={{
          width: frame.width,
          height: frame.is_collapsed ? 'auto' : frame.height,
        }}
      >
        <ResizableBox
          width={frame.width}
          height={frame.is_collapsed ? 50 : frame.height}
          onResizeStop={handleResizeStop}
          minConstraints={[200, 50]}
          resizeHandles={frame.is_collapsed ? ['e'] : ['se', 'e', 's']}
          handle={
             !frame.is_collapsed && 
             <span className="react-resizable-handle react-resizable-handle-se opacity-0 group-hover:opacity-100 transition-opacity" />
          }
        >
          <div className="w-full h-full border-2 border-dashed border-gray-400/30 rounded-xl flex flex-col bg-gray-500/5 hover:bg-gray-500/10 transition-colors backdrop-blur-sm">
            
            {/* HEADER / DRAG HANDLE */}
            <div className="frame-handle h-10 flex items-center justify-between px-3 cursor-move bg-gray-700/20 rounded-t-xl select-none">
              <div className="flex items-center gap-2 text-white/70">
                <button 
                   onClick={toggleCollapse}
                   className="hover:text-white transition-colors text-xs"
                >
                  {frame.is_collapsed ? '▶' : '▼'}
                </button>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onMouseDown={(e) => e.stopPropagation()} // Allow clicking input without dragging
                  className="bg-transparent border-none outline-none font-bold font-mono text-sm w-40 text-white/80 focus:text-white placeholder-white/20"
                />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(frame.id); }}
                className="text-white/30 hover:text-red-400 font-bold px-2"
                onMouseDown={(e) => e.stopPropagation()}
              >
                ×
              </button>
            </div>

            {/* COLLAPSED HINT */}
            {frame.is_collapsed && (
                <div className="px-3 py-1 text-xs text-white/40 italic">
                    {Math.round(frame.width)}px wide container (Collapsed)
                </div>
            )}

            {/* BACKGROUND LABEL (Visual Aid when expanded) */}
            {!frame.is_collapsed && (
               <div className="absolute bottom-2 right-2 text-white/5 font-black text-4xl pointer-events-none select-none uppercase">
                   FRAME
               </div>
            )}
          </div>
        </ResizableBox>
      </div>
    </Draggable>
  );
};

export default Frame;