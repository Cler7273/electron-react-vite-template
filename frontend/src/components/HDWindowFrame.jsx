import React, { useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import "react-resizable/css/styles.css";

const HDWindowFrame = ({ children, initialPos, initialSize = { width: 500, height: 600 }, onDelete, onUpdate }) => {
    const nodeRef = useRef(null); // The master reference
    const [size, setSize] = useState(initialSize);

    const windowAPI = {
        dragHandleClass: "hd-drag-handle",
        size: size,
        close: () => onDelete?.()
    };

    return (
        <Draggable 
            nodeRef={nodeRef} 
            handle={`.${windowAPI.dragHandleClass}`} 
            defaultPosition={initialPos}
            onStop={(e, data) => onUpdate?.({ x: data.x, y: data.y, w: size.width, h: size.height })}
        >
            {/* The actual element being moved/resized */}
            <div ref={nodeRef} className="absolute z-50 group" style={{ width: size.width, height: size.height }}>
                <ResizableBox
                    width={size.width}
                    height={size.height}
                    onResize={(e, data) => setSize({ width: data.size.width, height: data.size.height })}
                    onResizeStop={(e, data) => onUpdate?.({ x: initialPos.x, y: initialPos.y, w: data.size.width, h: data.size.height })}
                    minConstraints={[350, 400]}
                    resizeHandles={['e', 's', 'se']}
                    handle={(h) => (
                        <div className={`absolute z-[60] hover:bg-blue-500/20 transition-colors
                            ${h === 'e' ? 'right-0 top-0 w-2 h-full cursor-ew-resize' : 
                              h === 's' ? 'bottom-0 left-0 h-2 w-full cursor-ns-resize' : 
                              'bottom-0 right-0 w-5 h-5 cursor-nwse-resize border-r-4 border-b-4 border-blue-500/30'}`} 
                        />
                    )}
                >
                    <div className="w-full h-full relative pointer-events-auto overflow-visible">
                        {React.isValidElement(children) ? React.cloneElement(children, { windowAPI }) : children}
                    </div>
                </ResizableBox>
            </div>
        </Draggable>
    );
};

export default HDWindowFrame;