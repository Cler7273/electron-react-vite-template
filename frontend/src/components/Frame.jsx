import React, { useRef, useState } from "react";
import Draggable from "react-draggable";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";

// DESTUCTURING onDrag HERE is critical to fix your error
const Frame = ({ frame, onUpdate, onDelete, onDrag, onDragStop, scale }) => {
    const nodeRef = useRef(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);

    // 1. Handle Dragging (Movement)
    const handleDrag = (e, data) => {
        // We pass the ID and the movement deltas to the parent
        if (onDrag) {
            onDrag(frame.id, data.deltaX, data.deltaY);
        }
    };

    // 2. Handle Stop (Save to DB)
    const handleStop = (e, data) => {
        if (onDragStop) {
            onDragStop(frame.id, { pos_x: data.x, pos_y: data.y });
        }
    };

    const handleResizeStop = (e, data) => {
        onUpdate(frame.id, { width: data.size.width, height: data.size.height });
    };

    const toggleCollapse = () => {
        // Toggle the boolean state (0 or 1 for SQLite)
        onUpdate(frame.id, { is_collapsed: frame.is_collapsed ? 0 : 1 });
    };

    const handleTitleBlur = (e) => {
        setIsEditingTitle(false);
        if (e.target.innerText !== frame.title) {
            onUpdate(frame.id, { title: e.target.innerText });
        }
    };

    return (
        <Draggable
            nodeRef={nodeRef}
            handle=".frame-header"
            // Use local state position or props position? 
            // Props position is safer for synchronized movement with children
            position={{ x: frame.pos_x, y: frame.pos_y }}
            scale={scale}
            onDrag={handleDrag} // Fires on every pixel move
            onStop={handleStop} // Fires when you let go
        >
            <div 
                ref={nodeRef} 
                className="absolute z-10 transition-opacity duration-200" 
                style={{ 
                    width: frame.width, 
                    height: frame.is_collapsed ? 'auto' : frame.height 
                }}
            >
                <ResizableBox 
                    width={frame.width} 
                    height={frame.is_collapsed ? 40 : frame.height} 
                    onResizeStop={handleResizeStop}
                    minConstraints={[200, 40]}
                    axis={frame.is_collapsed ? "x" : "both"}
                    handle={!frame.is_collapsed && <span className="react-resizable-handle react-resizable-handle-se" />}
                >
                    <div className="w-full h-full border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-lg flex flex-col bg-gray-50 bg-opacity-50">
                        
                        {/* HEADER */}
                        <div className="frame-header h-10 bg-gray-200 flex items-center px-2 cursor-move group rounded-t-lg select-none">
                            <button onClick={(e) => { e.stopPropagation(); toggleCollapse(); }} className="mr-2 text-gray-500 hover:text-black w-6 h-6 flex items-center justify-center font-bold">
                                {frame.is_collapsed ? '▶' : '▼'}
                            </button>

                            <div 
                                contentEditable
                                suppressContentEditableWarning
                                className="flex-grow font-bold text-gray-700 text-sm uppercase tracking-wide focus:outline-none focus:bg-white px-1 rounded cursor-text"
                                onBlur={handleTitleBlur}
                                onKeyDown={(e) => { if(e.key === 'Enter') e.target.blur(); }}
                                onMouseDown={(e) => e.stopPropagation()} // Allow clicking text without dragging
                            >
                                {frame.title}
                            </div>

                            <button 
                                onClick={(e) => { 
                                    e.preventDefault(); 
                                    e.stopPropagation(); // <--- THIS FIXES THE CONFLICT
                                    onDelete(frame.id); 
                                }} 
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 font-bold ml-2"
                                onMouseDown={(e) => e.stopPropagation()} // Prevent drag start on button
                            >
                                ×
                            </button>
                        </div>
                    </div>
                </ResizableBox>
            </div>
        </Draggable>
    );
};

export default Frame;