import React, { useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { ResizableBox } from 'react-resizable';
import "react-resizable/css/styles.css";

/**
 * HDWindowFrame (Headless Distributed Window Frame)
 * Provides DRAG and RESIZE physics without any UI.
 * Delegates all controls to the child component via the 'windowAPI' prop.
 */
const HDWindowFrame = ({ 
    children, 
    initialPos = { x: 100, y: 100 }, 
    initialSize = { width: 500, height: 600 },
    onSaveLayout // Callback to persist x, y, w, h to DB
}) => {
    const nodeRef = useRef(null);
    const [size, setSize] = useState(initialSize);

    // This API object is passed to the child (TasksApp)
    const windowAPI = {
        dragHandleClass: "hd-drag-handle", // The child must use this class on its drag element
        size: size,
        close: () => {
            // logic to unmount/delete this frame
            if (window.confirm("Close this application?")) {
                // Trigger parent deletion logic (passed via props usually)
            }
        }
    };

    const handleResize = (e, data) => {
        const newSize = { width: data.size.width, height: data.size.height };
        setSize(newSize);
    };

    const handleStop = (e, data) => {
        if (onSaveLayout) {
            onSaveLayout({ x: data.x, y: data.y, w: size.width, h: size.height });
        }
    };

    return (
        <Draggable 
            nodeRef={nodeRef} 
            handle={`.${windowAPI.dragHandleClass}`} 
            defaultPosition={initialPos}
            onStop={handleStop}
        >
            <div 
                ref={nodeRef} 
                className="absolute z-50 group" // 'group' allows showing resize handles on hover
                style={{ width: size.width, height: size.height }}
            >
                <ResizableBox
                    width={size.width}
                    height={size.height}
                    onResize={handleResize}
                    onResizeStop={handleStop}
                    minConstraints={[350, 400]}
                    maxConstraints={[1200, 1000]}
                    // SE = South East (bottom right)
                    resizeHandles={['se', 'e', 's']}
                    handle={(
                        <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-[60] opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-full h-full border-r-2 border-b-2 border-blue-500/50 rounded-br-md" />
                        </div>
                    )}
                >
                    {/* Inject the API into the child */}
                    <div className="w-full h-full pointer-events-auto">
                        {React.cloneElement(children, { windowAPI })}
                    </div>
                </ResizableBox>
            </div>
        </Draggable>
    );
};

export default HDWindowFrame;