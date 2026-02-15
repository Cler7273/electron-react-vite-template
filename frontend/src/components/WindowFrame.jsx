import React, { useRef } from 'react'; 
import Draggable from 'react-draggable';

const WindowFrame = ({ title, onClose, children, initialPos = { x: 100, y: 100 }, width = 500, chromeless = false }) => {
  const nodeRef = useRef(null);

  // 1. DETERMINE MODE
  // If the title is TasksApp, or the prop is explicitly set, we go "Chromeless"
  const isChromeless = chromeless || title === "TasksApp";

  return (
        <Draggable 
            nodeRef={nodeRef} 
            handle={`.${windowAPI.dragHandleClass}`} 
            defaultPosition={initialPos}
            // Use onStop to persist coordinates
            onStop={(e, data) => onUpdate?.({ x: data.x, y: data.y, w: size.width, h: size.height })}
        >
            <div 
                ref={nodeRef} 
                className="absolute z-50 group" 
                style={{ width: size.width, height: size.height, touchAction: 'none' }}
            >
                <ResizableBox
                    width={size.width}
                    height={size.height}
                    minConstraints={[350, 400]}
                    onResize={(e, data) => {
                        setSize({ width: data.size.width, height: data.size.height });
                    }}
                    onResizeStop={(e, data) => {
                        onUpdate?.({ w: data.size.width, h: data.size.height });
                    }}
                    resizeHandles={['e', 's', 'se']}
                    handle={(h) => (
                        <div className={`absolute z-[60] opacity-0 group-hover:opacity-100 transition-opacity
                            ${h === 'e' ? 'right-0 top-0 w-2 h-full cursor-ew-resize bg-blue-500/20' : 
                              h === 's' ? 'bottom-0 left-0 h-2 w-full cursor-ns-resize bg-blue-500/20' : 
                              'bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1'}`}
                        >
                            {h === 'se' && <div className="w-2 h-2 border-r-2 border-b-2 border-blue-400" />}
                        </div>
                    )}
                >
                    {/* The content wrapper must have absolute fill to avoid collapsing */}
                    <div className="absolute inset-0 pointer-events-auto overflow-visible">
                        {React.isValidElement(children) ? React.cloneElement(children, { windowAPI }) : children}
                    </div>
                </ResizableBox>
            </div>
        </Draggable>
    );
};

export default WindowFrame;