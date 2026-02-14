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
    { hex: '#242424', name: 'Dark', text: 'white' } 
];

// RENDERER: Wiki Syntax -> HTML Spans (Directive 2)
const parseAndRenderLinks = (htmlContent) => {
    const content = String(htmlContent || "");
    const internalLinkRegex = /\[\[(note|frame):(\d+)\]\]/g;
    return content.replace(internalLinkRegex, (match, type, id) => {
        // We use a specific class 'note-link' for the Event Shielding directive
        return `<span class="note-link bg-blue-100 text-blue-800 px-1 rounded hover:bg-blue-200 cursor-pointer select-none border border-blue-300 mx-1" data-type="${type}" data-id="${id}" contenteditable="false">🔗 ${type}:${id}</span>`;
    });
};

// SERIALIZER: HTML Spans -> Wiki Syntax
const serializeContent = (htmlContent) => {
    const linkRegex = /<span [^>]*class="[^"]*note-link[^"]*"[^>]*data-type="(\w+)"[^>]*data-id="(\d+)"[^>]*>.*?<\/span>/g;
    return htmlContent.replace(linkRegex, '[[$1:$2]]');
};

const Note = ({ note, onNoteUpdate, onNoteDelete, onTagAdd, onTagRemove, onDataChange, onNavigate, scale, isDimmed }) => {
    const nodeRef = useRef(null);
    const contentRef = useRef(null);
    const [showCopyFeedback, setShowCopyFeedback] = useState(false);

    // --- ACTIONS ---
    const handleDragStop = (e, data) => {
        // Prevent updates on tiny accidental shifts
        if (Math.abs(data.x - note.pos_x) > 1 || Math.abs(data.y - note.pos_y) > 1) {
            onNoteUpdate(note.id, { pos_x: data.x, pos_y: data.y });
        }
    };

    const handleResizeStop = (e, data) => {
        onNoteUpdate(note.id, { width: data.size.width, height: data.size.height });
    };

    const handleBlur = () => {
        if (contentRef.current) {
            const rawHTML = contentRef.current.innerHTML;
            const cleanContent = serializeContent(rawHTML);
            if (cleanContent !== note.content) {
                onNoteUpdate(note.id, { content: cleanContent });
            }
        }
    };

    // --- DIRECTIVE 3: Event Shielding ---
    const handleContentClick = (e) => {
        // Check if the clicked element is our custom note-link
        if (e.target.classList.contains('note-link')) {
            e.preventDefault();
            e.stopPropagation(); // CRITICAL: Stop React-Draggable from seeing this click
            
            const { type, id } = e.target.dataset;
            if (onNavigate && type && id) {
                onNavigate(type, id);
            }
        }
    };

    const handleCopyLink = (e) => {
        e.stopPropagation(); 
        const code = `[[note:${note.id}]]`;
        navigator.clipboard.writeText(code);
        setShowCopyFeedback(true);
        setTimeout(() => setShowCopyFeedback(false), 2000);
    };

    // --- DIRECTIVE 4: Color Persistence ---
    const handleColorChange = (hex) => {
        onNoteUpdate(note.id, { color_hex: hex });
    };

    const isDark = note.color_hex === '#242424';
    const textColor = isDark ? 'text-white' : 'text-gray-900';
    const visualClass = isDimmed ? "opacity-30 grayscale pointer-events-none transition-opacity duration-300" : "opacity-100 transition-opacity duration-300";

    return (
        <Draggable 
            nodeRef={nodeRef} 
            handle=".drag-handle" 
            onStop={handleDragStop} 
            position={{ x: note.pos_x, y: note.pos_y }} 
            scale={scale} 
            disabled={isDimmed}
        >
            <div 
                id={`note-${note.id}`} ref={nodeRef} 
                className={`absolute z-20 shadow-xl ${visualClass}`} 
                style={{ width: note.width, height: note.height }} 
            >
                <ResizableBox 
                    height={note.height} 
                    width={note.width} 
                    onResizeStop={handleResizeStop} 
                    minConstraints={[200, 150]} 
                    handle={<span className="react-resizable-handle react-resizable-handle-se" />}
                >
                    <div className="w-full h-full rounded-lg flex flex-col overflow-hidden ring-1 ring-black ring-opacity-10 transition-colors duration-200" style={{ backgroundColor: note.color_hex || '#fff000' }}>
                        
                        {/* HEADER / TOOLBAR */}
                        <div className="drag-handle h-8 w-full cursor-move bg-black/5 hover:bg-black/10 flex items-center justify-between px-2 transition-colors select-none">
                            <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-white/50' : 'text-black/50'}`}>
                                #{note.id}
                            </span>

                            {/* DIRECTIVE 4: Color Strip UI */}
                            <div className="flex items-center gap-1 mx-2" onMouseDown={(e) => e.stopPropagation()}>
                                {NOTE_COLORS.map(c => (
                                    <button 
                                        key={c.hex}
                                        onClick={(e) => { e.stopPropagation(); handleColorChange(c.hex); }}
                                        className={`w-3 h-3 rounded-full border border-black/10 hover:scale-125 transition-transform ${note.color_hex === c.hex ? 'ring-2 ring-blue-500' : ''}`}
                                        style={{ backgroundColor: c.hex }}
                                        title={c.name}
                                    />
                                ))}
                            </div>

                            {/* CONTROLS */}
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handleCopyLink} 
                                    className={`relative w-5 h-5 flex items-center justify-center font-bold ${isDark ? 'text-white/50 hover:text-blue-400' : 'text-black/30 hover:text-blue-600'}`} 
                                    title="Copy Link Code"
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    🔗
                                    {showCopyFeedback && <span className="absolute -top-8 -right-2 bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-50 pointer-events-none">Copied!</span>}
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onNoteDelete(note.id); }} 
                                    className={`w-5 h-5 flex items-center justify-center font-bold ${isDark ? 'text-white/50 hover:text-red-400' : 'text-black/30 hover:text-red-600'}`}
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        {/* CONTENT AREA */}
                        <div 
                            ref={contentRef} 
                            contentEditable 
                            suppressContentEditableWarning 
                            className={`flex-grow w-full text-lg p-4 focus:outline-none font-sans leading-relaxed ${textColor} overflow-auto no-drag-cursor`}
                            style={{ cursor: 'text' }}
                            onBlur={handleBlur} 
                            onClick={handleContentClick} // Event Shielding Here
                            dangerouslySetInnerHTML={{ __html: parseAndRenderLinks(note.content) }} 
                        />

                        <TagManager 
                            tags={note.tags || []} 
                            onAddTag={(t) => onTagAdd("notes", note.id, t)} 
                            onRemoveTag={(t) => onTagRemove("notes", note.id, t)} 
                            onDataChange={onDataChange} 
                        />
                    </div>
                </ResizableBox>
            </div>
        </Draggable>
    );
};

export default Note;