import React, { useRef, useEffect, useState } from "react";
import Draggable from "react-draggable";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import TagManager from "./TagManager";

// --- HELPERS ---
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

    // --- DRAG HANDLERS ---
    const handleDragStart = () => setIsDragging(true);
    const handleDragStop = (e, data) => {
        setIsDragging(false);
        // Only trigger update if moved significantly
        if (Math.abs(data.x - note.pos_x) > 1 || Math.abs(data.y - note.pos_y) > 1) {
            onNoteUpdate(note.id, { pos_x: data.x, pos_y: data.y });
        }
    };

    const handleResizeStop = (e, data) => {
        onNoteUpdate(note.id, { width: data.size.width, height: data.size.height });
    };

    const handleFocus = () => { if (contentRef.current) contentRef.current.innerText = contentRef.current.innerHTML; };
    const handleBlur = () => {
        if (contentRef.current) {
            const raw = contentRef.current.innerText;
            contentRef.current.innerHTML = raw;
            if (contentRef.current.innerHTML !== note.content) onNoteUpdate(note.id, { content: contentRef.current.innerHTML });
        }
    };

    // FIXED: Styles are split. 
    // Layout styles (position) have NO transition. 
    // Visual styles (opacity/filter) HAVE transition.
    const layoutStyle = { width: note.width, height: note.height };
    const visualClass = isDimmed 
        ? "opacity-30 grayscale pointer-events-none transition-opacity duration-300" 
        : "opacity-100 transition-opacity duration-300";

    return (
        <Draggable
            nodeRef={nodeRef}
            handle=".drag-handle"
            onStart={handleDragStart}
            onStop={handleDragStop}
            position={{ x: note.pos_x, y: note.pos_y }}
            scale={scale}
            disabled={isDimmed} // Disable drag if filtered out
        >
            <div 
                id={`note-${note.id}`} 
                ref={nodeRef} 
                className={`absolute z-20 shadow-xl ${visualClass}`} // Applied here
                style={layoutStyle}
            >
                <ResizableBox 
                    height={note.height} 
                    width={note.width} 
                    onResizeStop={handleResizeStop} 
                    minConstraints={[180, 150]}
                    handle={<span className="react-resizable-handle react-resizable-handle-se" />}
                >
                    <div className="w-full h-full rounded-lg flex flex-col overflow-hidden ring-1 ring-black ring-opacity-10" style={{ backgroundColor: note.color_hex || '#fff000' }}>
                        {/* Drag Handle */}
                        <div className="drag-handle h-7 w-full cursor-move bg-black bg-opacity-5 hover:bg-opacity-10 flex items-center justify-end p-1 transition-colors">
                            <button onClick={(e) => { e.stopPropagation(); onNoteDelete(note.id); }} className="w-5 h-5 flex items-center justify-center text-black opacity-30 hover:opacity-100 hover:text-red-600 font-bold">×</button>
                        </div>
                        {/* Content */}
                        <div ref={contentRef} contentEditable suppressContentEditableWarning className="flex-grow w-full text-lg text-gray-900 p-4 focus:outline-none font-sans leading-relaxed" onFocus={handleFocus} onBlur={handleBlur} dangerouslySetInnerHTML={{ __html: parseAndRenderLinks(note.content) }} />
                        {/* Tags */}
                        <TagManager tags={note.tags || []} onAddTag={(t) => onTagAdd("notes", note.id, t)} onRemoveTag={(t) => onTagRemove("notes", note.id, t)} onDataChange={onDataChange} />
                    </div>
                </ResizableBox>
            </div>
        </Draggable>
    );
};
export default Note;