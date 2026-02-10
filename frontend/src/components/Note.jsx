import React, { useRef, useEffect, useState } from "react";
import Draggable from "react-draggable";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import TagManager from "./TagManager";

const NOTE_COLORS = [
    { hex: '#fff000', name: 'Yellow' },
    { hex: '#a7ffeb', name: 'Teal' },
    { hex: '#f8bbd0', name: 'Pink' },
    { hex: '#ccff90', name: 'Green' },
    { hex: '#ffe0b2', name: 'Orange' },
    { hex: '#d1c4e9', name: 'Purple' },
    { hex: '#ffffff', name: 'White' },
    { hex: '#242424', name: 'Dark', text: 'white' } // Special case for dark mode note
];

const parseAndRenderLinks = (htmlContent) => {
    const content = String(htmlContent || "");
    const internalLinkRegex = /\[\[(note|frame):(\d+)\]\]/g;
    return content.replace(internalLinkRegex, (match, type, id) => {
        const elementId = `${type}-${id}`;
        return `<a href="#" data-internal-link="${elementId}" class="internal-link bg-blue-100 text-blue-800 px-1 rounded hover:bg-blue-200" contenteditable="false">🔗 ${type} ${id}</a>`;
    });
};

const Note = ({ note, onNoteUpdate, onNoteDelete, onTagAdd, onTagRemove, onDataChange, scale, isDimmed }) => {
    const nodeRef = useRef(null);
    const contentRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    
    // CONTEXT MENU STATE
    const [contextMenu, setContextMenu] = useState(null); // { x, y }

    // --- HANDLERS ---
    const handleDragStart = () => { setIsDragging(true); setContextMenu(null); }; // Close menu on drag
    const handleDragStop = (e, data) => {
        setIsDragging(false);
        if (Math.abs(data.x - note.pos_x) > 1 || Math.abs(data.y - note.pos_y) > 1) {
            onNoteUpdate(note.id, { pos_x: data.x, pos_y: data.y });
        }
    };

    const handleResizeStop = (e, data) => onNoteUpdate(note.id, { width: data.size.width, height: data.size.height });

    const handleFocus = () => { if (contentRef.current) contentRef.current.innerText = contentRef.current.innerHTML; };
    const handleBlur = () => {
        if (contentRef.current) {
            const raw = contentRef.current.innerText;
            contentRef.current.innerHTML = raw;
            if (contentRef.current.innerHTML !== note.content) onNoteUpdate(note.id, { content: contentRef.current.innerHTML });
        }
    };

    // --- RIGHT CLICK HANDLER ---
    const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Show menu at mouse position (relative to screen to avoid clipping)
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    // Close context menu on any click outside
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const changeColor = (hex) => {
        onNoteUpdate(note.id, { color_hex: hex });
        setContextMenu(null);
    };

    // Calculate Text Color (Black for light notes, White for dark notes)
    const isDark = note.color_hex === '#242424';
    const textColor = isDark ? 'text-white' : 'text-gray-900';

    const visualClass = isDimmed 
        ? "opacity-30 grayscale pointer-events-none transition-opacity duration-300" 
        : "opacity-100 transition-opacity duration-300";

    return (
        <>
            <Draggable
                nodeRef={nodeRef}
                handle=".drag-handle"
                onStart={handleDragStart}
                onStop={handleDragStop}
                position={{ x: note.pos_x, y: note.pos_y }}
                scale={scale}
                disabled={isDimmed}
            >
                <div 
                    id={`note-${note.id}`} 
                    ref={nodeRef} 
                    className={`absolute z-20 shadow-xl ${visualClass}`} 
                    style={{ width: note.width, height: note.height }}
                    onContextMenu={handleContextMenu} // Attach Event
                >
                    <ResizableBox 
                        height={note.height} 
                        width={note.width} 
                        onResizeStop={handleResizeStop} 
                        minConstraints={[180, 150]}
                        handle={<span className="react-resizable-handle react-resizable-handle-se" />}
                    >
                        <div 
                            className="w-full h-full rounded-lg flex flex-col overflow-hidden ring-1 ring-black ring-opacity-10 transition-colors duration-200" 
                            style={{ backgroundColor: note.color_hex || '#fff000' }}
                        >
                            {/* Drag Handle */}
                            <div className="drag-handle h-7 w-full cursor-move bg-black bg-opacity-5 hover:bg-opacity-10 flex items-center justify-end p-1 transition-colors">
                                <button onClick={(e) => { e.stopPropagation(); onNoteDelete(note.id); }} className="w-5 h-5 flex items-center justify-center text-black opacity-30 hover:opacity-100 hover:text-red-600 font-bold">×</button>
                            </div>

                            {/* Content */}
                            <div 
                                ref={contentRef} 
                                contentEditable 
                                suppressContentEditableWarning 
                                className={`flex-grow w-full text-lg p-4 focus:outline-none font-sans leading-relaxed ${textColor}`}
                                onFocus={handleFocus} 
                                onBlur={handleBlur} 
                                dangerouslySetInnerHTML={{ __html: parseAndRenderLinks(note.content) }} 
                            />

                            {/* Tag Manager */}
                            <TagManager tags={note.tags || []} onAddTag={(t) => onTagAdd("notes", note.id, t)} onRemoveTag={(t) => onTagRemove("notes", note.id, t)} onDataChange={onDataChange} />
                        </div>
                    </ResizableBox>
                </div>
            </Draggable>

            {/* CONTEXT MENU PORTAL (Fixed Position) */}
            {contextMenu && (
                <div 
                    className="fixed z-[9999] bg-white rounded shadow-xl border border-gray-200 p-2 grid grid-cols-4 gap-2 w-32 animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                >
                    {NOTE_COLORS.map(c => (
                        <button
                            key={c.hex}
                            onClick={() => changeColor(c.hex)}
                            className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 transition-transform shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                        />
                    ))}
                </div>
            )}
        </>
    );
};
export default Note;