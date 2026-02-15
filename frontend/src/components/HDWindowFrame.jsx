import React, { useState, useRef, useEffect, useCallback } from 'react';

const HDWindowFrame = ({ children, windowAPI: externalAPI, initialPos = { x: 100, y: 100 }, initialSize = { width: 500, height: 600 }, onDelete, onUpdate }) => {
    // 1. Local State (Used for initial render and final sync)
    const [pos, setPos] = useState(initialPos);
    const [size, setSize] = useState({ w: initialSize.width, h: initialSize.height });

    // 2. Direct DOM Access (To bypass React rendering during drag)
    const frameRef = useRef(null);

    // 3. Interaction State
    const interaction = useRef({
        active: false,
        type: null,
        startMouse: { x: 0, y: 0 },
        startRect: { x: 0, y: 0, w: 0, h: 0 }
    });

    const windowAPI = {
        dragHandleClass: "hd-drag-handle",
        size: size,
        close: () => onDelete?.()
    };

    // --- MOUSE DOWN ---
    const onMouseDown = (e) => {
        const target = e.target;
        let type = null;

        // Identify handles
        if (target.classList.contains('rs-e')) type = 'resize-e';
        else if (target.classList.contains('rs-s')) type = 'resize-s';
        else if (target.classList.contains('rs-se')) type = 'resize-se';
        else if (target.closest(`.${windowAPI.dragHandleClass}`)) type = 'move';

        if (!type || target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

        e.preventDefault();
        e.stopPropagation();

        // Snapshot current values from DOM or State
        interaction.current = {
            active: true,
            type: type,
            startMouse: { x: e.clientX, y: e.clientY },
            // We use the current committed state as the baseline
            startRect: { x: pos.x, y: pos.y, w: size.w, h: size.h }
        };

        document.body.style.userSelect = 'none';
        document.body.style.cursor = type.includes('resize') 
            ? (type === 'resize-e' ? 'ew-resize' : 'nwse-resize') 
            : 'move';

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        // Optimization: Force GPU layer
        if (frameRef.current) {
            frameRef.current.style.transition = 'none';
            frameRef.current.style.willChange = 'width, height, left, top';
            frameRef.current.style.zIndex = '9999';
        }
    };

    // --- MOUSE MOVE (Direct DOM) ---
    const onMouseMove = useCallback((e) => {
        if (!interaction.current.active || !frameRef.current) return;

        requestAnimationFrame(() => {
            if (!interaction.current.active) return;

            const { type, startMouse, startRect } = interaction.current;
            const dx = e.clientX - startMouse.x;
            const dy = e.clientY - startMouse.y;
            const el = frameRef.current;

            if (type === 'move') {
                el.style.left = `${startRect.x + dx}px`;
                el.style.top = `${startRect.y + dy}px`;
            } else {
                let newW = startRect.w;
                let newH = startRect.h;

                if (type === 'resize-e' || type === 'resize-se') {
                    newW = Math.max(380, startRect.w + dx);
                    el.style.width = `${newW}px`;
                }
                if (type === 'resize-s' || type === 'resize-se') {
                    newH = Math.max(450, startRect.h + dy);
                    el.style.height = `${newH}px`;
                }
            }
        });
    }, []);

    // --- MOUSE UP ---
    const onMouseUp = useCallback(() => {
        if (!interaction.current.active) return;

        interaction.current.active = false;
        
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        document.body.style.userSelect = 'auto';
        document.body.style.cursor = 'auto';

        if (frameRef.current) {
            frameRef.current.style.willChange = 'auto';
            frameRef.current.style.zIndex = ''; 

            // Read final DOM state
            const finalX = parseFloat(frameRef.current.style.left);
            const finalY = parseFloat(frameRef.current.style.top);
            const finalW = parseFloat(frameRef.current.style.width);
            const finalH = parseFloat(frameRef.current.style.height);

            // Update React State (Single Render)
            setPos({ x: finalX, y: finalY });
            setSize({ w: finalW, h: finalH });

            onUpdate?.({ x: finalX, y: finalY, w: finalW, h: finalH, type: interaction.current.type });
        }
    }, [onUpdate]);

    useEffect(() => {
        if (frameRef.current && !interaction.current.active) {
            frameRef.current.style.left = `${pos.x}px`;
            frameRef.current.style.top = `${pos.y}px`;
            frameRef.current.style.width = `${size.w}px`;
            frameRef.current.style.height = `${size.h}px`;
        }
    }, [pos, size]);

    return (
        <div 
            ref={frameRef}
            className="absolute z-50 flex flex-col overflow-visible shadow-2xl"
            style={{ 
                left: pos.x, 
                top: pos.y, 
                width: size.w, 
                height: size.h
            }}
            onMouseDown={onMouseDown}
        >
            {/* 
                CRITICAL FIX: 
                1. Removed the "Header Zone" duplicate render.
                2. Removed internal background/border styles (TasksApp handles its own bg/border).
                3. We render children EXACTLY ONCE.
            */}
            <div className="w-full h-full relative">
                {React.isValidElement(children) 
                    ? React.cloneElement(children, { windowAPI }) 
                    : children
                }
            </div>

            {/* --- RESIZE HANDLES (1/3 Rule) --- */}
            
            {/* Right Edge (Middle 1/3) */}
            <div className="rs-e absolute right-[-6px] top-[33.3%] h-[33.3%] w-[12px] cursor-ew-resize z-[110] group flex justify-center" title="Resize Width">
                <div className="rs-e w-1 h-full bg-transparent group-hover:bg-blue-500/50 rounded-full transition-colors" />
            </div>
            
            {/* Bottom Edge (Middle 1/3) */}
            <div className="rs-s absolute bottom-[-6px] left-[33.3%] w-[33.3%] h-[12px] cursor-ns-resize z-[110] group flex flex-col justify-center" title="Resize Height">
                <div className="rs-s h-1 w-full bg-transparent group-hover:bg-blue-500/50 rounded-full transition-colors" />
            </div>
            
            {/* Bottom Right Corner */}
            <div className="rs-se absolute bottom-[-6px] right-[-6px] w-8 h-8 cursor-nwse-resize z-[120] flex items-end justify-end p-2 group">
                <div className="rs-se w-3 h-3 border-r-2 border-b-2 border-gray-600 group-hover:border-blue-500 transition-colors" />
            </div>
        </div>
    );
};

export default HDWindowFrame;