import React, { useRef, useState } from "react";
import Draggable from "react-draggable";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import TagManager from "./TagManager";

const NOTE_COLORS = [
    { hex: '#fff000', name: 'Yellow' },
    { hex: '#a7ffeb', name: 'Teal' },
    { hex: '#f8bbd0', name: 'Pink' },
    { hex: '#f8bbd0', name: 'Pink' },
    { hex: '#ccff90', name: 'Green' },
    { hex: '#ffffff', name: 'White' },
    { hex: '#242424', name: 'Dark' } 
];

const parseAndRenderLinks = (htmlContent) => {
    const content = String(htmlContent || "");
    const internalLinkRegex = /\[\[(note|frame):(\d+)\]\]/g;
    return content.replace(internalLinkRegex, (match, type, id) => {
        return `<span class="note-link text-blue-600 font-bold underline decoration-blue-300 hover:text-blue-800 cursor-pointer" data-type="${type}" data-id="${id}" contenteditable="false">🔗${id}</span>`;
    });
};

const serializeContent = (htmlContent) => {
    const linkRegex = /<span [^>]*class="[^"]*note-link[^"]*"[^>]*data-type="(\w+)"[^>]*data-id="(\d+)"[^>]*>.*?<\/span>/g;
    return htmlContent.replace(linkRegex, '[[$1:$2]]');
};

const Note = ({ note, onNoteUpdate, onNoteDelete, onTagAdd, onTagRemove, onDataChange, onNavigate, scale, isDimmed }) => {
    const nodeRef = useRef(null);
    const contentRef = useRef(null);
    const [showSettings, setShowSettings] = useState(false);

    // --- RECOVERY: Stability & Interactivity (D. LAGENDRE) ---
    const handleIntercept = (e) => {
        if (e.target.classList.contains('note-link')) {
            e.stopPropagation();
            e.preventDefault();
            if (e.type === 'click') {
                const { type, id } = e.target.dataset;
                if (onNavigate) onNavigate(type, id);
            }
        }
    };

    const handleBlur = () => {
        if (contentRef.current) {
            const cleanContent = serializeContent(contentRef.current.innerHTML);
            if (cleanContent !== note.content) {
                onNoteUpdate(note.id, { content: cleanContent });
            }
        }
    };

    // --- RECOVERY: Visual Clarity (A. CLAIR) ---
    const isDark = note.color_hex === '#242424';
    const visualClass = isDimmed ? "opacity-40 grayscale" : "opacity-100";

    return (
        <Draggable 
            nodeRef={nodeRef} 
            handle=".note-header" // Explicit handle to free up the content area
            onStop={(e, data) => onNoteUpdate(note.id, { pos_x: data.x, pos_y: data.y })} 
            position={{ x: note.pos_x, y: note.pos_y }} 
            scale={scale} 
            disabled={isDimmed}
        >
            <div 
                ref={nodeRef} 
                id={`note-${note.id}`} 
                className={`absolute z-20 transition-opacity duration-200 ${visualClass}`}
                style={{ 
                    width: note.width, 
                    height: note.height,
                    // FIX: Removed will-change to prevent pixelation. 
                    // Added antialiasing for crisp text at all scales.
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale'
                }} 
            >
                <ResizableBox 
                    height={note.height} width={note.width} 
                    onResizeStop={(e, data) => onNoteUpdate(note.id, { width: data.size.width, height: data.size.height })} 
                    minConstraints={[180, 120]} 
                    handle={<span className="react-resizable-handle react-resizable-handle-se" />}
                >
                    <div className="w-full h-full bg-white border border-gray-200 rounded-md shadow-sm flex flex-col overflow-hidden relative">
                        
                        {/* COLOR ACCENT BAR (A. CLAIR: Minimalist UI) */}
                        <div style={{ backgroundColor: note.color_hex || '#fff000', height: '4px' }} />

                        {/* DRAG HEADER */}
                        <div className="note-header h-8 w-full cursor-grab active:cursor-grabbing bg-gray-50/50 flex items-center justify-between px-2 border-b border-gray-100 select-none">
                            <span className="text-[10px] font-mono text-gray-400 font-bold">#{note.id}</span>
                            
                            <div className="flex items-center gap-1">
                                {/* Settings Toggle (Protects UI from clutter) */}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
                                    className="p-1 hover:bg-gray-200 rounded text-gray-400"
                                    onMouseDown={e => e.stopPropagation()}
                                >
                                    ⚙️
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onNoteDelete(note.id); }}
                                    className="p-1 hover:bg-red-100 hover:text-red-600 rounded text-gray-400"
                                    onMouseDown={e => e.stopPropagation()}
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        {/* SETTINGS OVERLAY (Contextual UI) */}
                        {showSettings && (
                            <div className="absolute top-8 right-2 z-30 bg-white border shadow-lg rounded p-2 flex gap-1 animate-in fade-in slide-in-from-top-1">
                                {NOTE_COLORS.map(c => (
                                    <button 
                                        key={c.hex}
                                        onClick={() => { onNoteUpdate(note.id, { color_hex: c.hex }); setShowSettings(false); }}
                                        className="w-4 h-4 rounded-full border border-gray-200 hover:scale-110 transition-transform"
                                        style={{ backgroundColor: c.hex }}
                                    />
                                ))}
                            </div>
                        )}

                        {/* CONTENT AREA (D. LAGENDRE: Restored Pointer Events) */}
                        <div 
                            ref={contentRef} 
                            contentEditable 
                            suppressContentEditableWarning 
                            className="flex-grow w-full text-base p-3 focus:outline-none font-sans leading-snug overflow-y-auto cursor-text text-gray-800"
                            style={{ pointerEvents: 'auto' }}
                            onBlur={handleBlur}
                            onMouseDown={handleIntercept} 
                            onClick={handleIntercept}     
                            dangerouslySetInnerHTML={{ __html: parseAndRenderLinks(note.content) }} 
                        />

                        <div className="p-1 border-t border-gray-50">
                            <TagManager 
                                tags={note.tags || []} 
                                onAddTag={(t) => onTagAdd("notes", note.id, t)} 
                                onRemoveTag={(t) => onTagRemove("notes", note.id, t)} 
                                onDataChange={onDataChange} 
                            />
                        </div>
                    </div>
                </ResizableBox>
            </div>
        </Draggable>
    );
};

export default Note;