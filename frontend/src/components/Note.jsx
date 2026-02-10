import React, { useRef, useEffect, useState } from "react";
import Draggable from "react-draggable";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import TagManager from "./TagManager";

// --- HELPERS ---
const parseAndRenderLinks = (htmlContent) => {
    const content = String(htmlContent || "");
    // Replaces [[note:123]] with clickable links
    const internalLinkRegex = /\[\[(note|frame):(\d+)\]\]/g;
    return content.replace(internalLinkRegex, (match, type, id) => {
        const elementId = `${type}-${id}`;
        return `<a href="#" data-internal-link="${elementId}" class="internal-link bg-blue-100 text-blue-800 px-1 rounded hover:bg-blue-200" contenteditable="false">🔗 ${type} ${id}</a>`;
    });
};

const Note = ({ note, isDimmed, onNoteUpdate, onNoteDelete, onTagAdd, onTagRemove, onDataChange, scale }) => {
    const nodeRef = useRef(null);
    const contentRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    // DYNAMIC STYLE: Add opacity-30 and grayscale if dimmed
    // We also disable pointer-events so you can't click/edit dimmed notes (optional, remove if unwanted)
    const dimmingClass = isDimmed 
        ? "opacity-30 grayscale pointer-events-none transition-all duration-500 ease-in-out" 
        : "opacity-100 transition-all duration-300 ease-in-out";
    // --- DRAG HANDLERS ---
    const handleDragStart = () => setIsDragging(true);
    const handleDragStop = (e, data) => {
        setIsDragging(false);
        if (Math.abs(data.x - note.pos_x) > 1 || Math.abs(data.y - note.pos_y) > 1) {
            onNoteUpdate(note.id, { pos_x: data.x, pos_y: data.y });
        }
    };

    // --- RESIZE HANDLER ---
    const handleResizeStop = (e, data) => {
        onNoteUpdate(note.id, { width: data.size.width, height: data.size.height });
    };

    // --- CONTENT EDITING HANDLERS ---
    const handleFocus = () => {
        // Switch to Raw Text on Focus
        const div = contentRef.current;
        if (div) div.innerText = div.innerHTML;
    };

    const handleBlur = () => {
        // Switch to Rendered HTML on Blur
        const div = contentRef.current;
        if (div) {
            const rawText = div.innerText;
            // Basic sanitization or processing could happen here
            div.innerHTML = rawText; 
            if (div.innerHTML !== note.content) {
                onNoteUpdate(note.id, { content: div.innerHTML });
            }
        }
    };

    // --- LINK CLICK HANDLER ---
    useEffect(() => {
        const div = contentRef.current;
        if (!div) return;

        const handleLinkClick = async (e) => {
            const target = e.target.closest("a");
            // Don't trigger if editing or no link clicked
            if (!target || document.activeElement === div) return;
            
            e.preventDefault();
            const internalLink = target.getAttribute("data-internal-link");
            const externalLink = target.getAttribute("href");

            if (internalLink) {
                console.log("Navigating internally to:", internalLink);
                // Implementation for internal nav (pan to node) goes here
            } else if (externalLink) {
                // FIXED: Use the new Backend API to open links
                const token = await window.nativeAPI.getSecretToken();
                fetch('http://localhost:4000/api/system/open', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ target: externalLink })
                });
            }
        };
        div.addEventListener("click", handleLinkClick);
        return () => div.removeEventListener("click", handleLinkClick);
    }, []);

    // Style classes
    const noteClasses = `absolute z-20 shadow-xl transition-opacity duration-150 ${isDragging ? 'opacity-80' : 'opacity-100'}`;

    return (
        <Draggable
            nodeRef={nodeRef}
            handle=".drag-handle"
            onStart={handleDragStart}
            onStop={handleDragStop}
            position={{ x: note.pos_x, y: note.pos_y }}
            scale={scale}
            disabled={isDimmed} // Disable dragging if dimmed
        >
            <div 
                id={`note-${note.id}`} 
                ref={nodeRef} 
                className={`absolute z-20 shadow-xl ${dimmingClass}`} // Apply class here
                style={{ width: note.width, height: note.height }}
            >
                <ResizableBox 
                    height={note.height} 
                    width={note.width} 
                    onResizeStop={handleResizeStop} 
                    minConstraints={[180, 150]}
                    handle={<span className="react-resizable-handle react-resizable-handle-se" />}
                >
                    <div 
                        className="w-full h-full rounded-lg flex flex-col overflow-hidden ring-1 ring-black ring-opacity-10" 
                        style={{ backgroundColor: note.color_hex || '#fff000' }}
                    >
                        {/* Header / Drag Handle */}
                        <div className="drag-handle h-7 w-full cursor-move bg-black bg-opacity-5 hover:bg-opacity-10 flex items-center justify-end p-1 transition-colors">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onNoteDelete(note.id); }} 
                                className="w-5 h-5 rounded-full hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors text-black opacity-30 hover:opacity-100"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div 
                            ref={contentRef} 
                            contentEditable 
                            suppressContentEditableWarning 
                            className="flex-grow w-full text-lg text-gray-900 p-4 focus:outline-none whitespace-pre-wrap font-sans leading-relaxed" 
                            onFocus={handleFocus} 
                            onBlur={handleBlur} 
                            dangerouslySetInnerHTML={{ __html: parseAndRenderLinks(note.content) }} 
                            data-placeholder="Type here..." 
                        />

                        {/* Tag Manager */}
                        <TagManager 
                            tags={note.tags || []} 
                            onAddTag={(tagName) => onTagAdd("notes", note.id, tagName)} 
                            onRemoveTag={(tagName) => onTagRemove("notes", note.id, tagName)} 
                            onDataChange={onDataChange} 
                        />
                    </div>
                </ResizableBox>
            </div>
        </Draggable>
    );
};
export default Note;