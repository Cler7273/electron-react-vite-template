import React, { useRef, useState } from "react";
import Draggable from "react-draggable";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";

const Frame = ({ frame, onUpdate, onDelete, scale }) => {
    const nodeRef = useRef(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);

    const handleDragStop = (e, data) => {
        onUpdate(frame.id, { pos_x: data.x, pos_y: data.y });
    };

    const handleResizeStop = (e, data) => {
        onUpdate(frame.id, { width: data.size.width, height: data.size.height });
    };

    const toggleCollapse = () => {
        onUpdate(frame.id, { is_collapsed: !frame.is_collapsed ? 1 : 0 });
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
            position={{ x: frame.pos_x, y: frame.pos_y }}
            scale={scale}
            onStop={handleDragStop}
        >
            <div 
                ref={nodeRef} 
                className="absolute z-10 transition-all duration-200"
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
                    // Disable vertical resizing if collapsed
                    axis={frame.is_collapsed ? "x" : "both"}
                    handle={!frame.is_collapsed && <span className="react-resizable-handle react-resizable-handle-se" />}
                >
                    <div className="w-full h-full border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-lg flex flex-col bg-gray-50 bg-opacity-50">
                        
                        {/* Frame Header */}
                        <div className="frame-header h-10 bg-gray-200 flex items-center px-2 cursor-move group rounded-t-lg">
                            {/* Collapse Button */}
                            <button onClick={toggleCollapse} className="mr-2 text-gray-500 hover:text-black focus:outline-none">
                                {frame.is_collapsed ? '▶' : '▼'}
                            </button>

                            {/* Editable Title */}
                            <div 
                                contentEditable
                                suppressContentEditableWarning
                                className="flex-grow font-bold text-gray-700 text-sm uppercase tracking-wide focus:outline-none focus:bg-white px-1 rounded"
                                onBlur={handleTitleBlur}
                                onKeyDown={(e) => { if(e.key === 'Enter') e.target.blur(); }}
                            >
                                {frame.title}
                            </div>

                            {/* Delete Button (Hidden unless hovering) */}
                            <button 
                                onClick={() => onDelete(frame.id)}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 font-bold ml-2"
                            >
                                ×
                            </button>
                        </div>

                        {/* Frame Body (Hidden if collapsed) */}
                        {!frame.is_collapsed && (
                            <div className="flex-1 w-full pointer-events-none">
                                {/* This area is transparent/pointer-events-none so you can click notes BEHIND/INSIDE it if needed, 
                                    or standard if you want it to capture clicks. For a background frame, 'none' is usually better 
                                    unless you implement drag-grouping. */}
                            </div>
                        )}
                    </div>
                </ResizableBox>
            </div>
        </Draggable>
    );
};

export default Frame;