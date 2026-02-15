import React, { useRef, useState, useEffect, useLayoutEffect } from "react";
import Draggable from "react-draggable";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import TagManager from "./TagManager";

const NOTE_COLORS = [
    { hex: '#ffffff', name: 'White', border: '#cbd5e1', header: '#f1f5f9' },
    { hex: '#fff59d', name: 'Yellow', border: '#fbc02d', header: '#fff176' },
    { hex: '#b2dfdb', name: 'Teal', border: '#00897b', header: '#80cbc4' },
    { hex: '#f8bbd0', name: 'Pink', border: '#ec407a', header: '#f48fb1' },
    { hex: '#c5e1a5', name: 'Green', border: '#7cb342', header: '#aed581' },
    { hex: '#ffcc80', name: 'Orange', border: '#fb8c00', header: '#ffb74d' },
    { hex: '#d1c4e9', name: 'Purple', border: '#7e57c2', header: '#b39ddb' },
    { hex: '#303030', name: 'Dark', border: '#000000', header: '#424242' } ,
    { hex: '#242424', name: 'Darker', border: '#000000', header: '#303030' },
    {hex: '#f83bff', name: 'Hot Pink', border: '#c000c0', header: '#f06292' },
];

// HELPER: Wiki-Style Links
const renderViewMode = (content) => {
    const safeContent = String(content || "");
    const internalLinkRegex = /\[\[(note|frame):(\d+)\]\]/g;
    let html = safeContent.replace(/\n/g, '<br>');
    html = html.replace(internalLinkRegex, (match, type, id) => {
        return `<span class="note-link inline-flex items-center gap-1 bg-blue-600/10 text-blue-700 px-1.5 py-0.5 rounded cursor-pointer select-none border border-blue-600/20 text-xs font-bold mx-0.5 hover:bg-blue-600/20" data-type="${type}" data-id="${id}">🔗 ${type.toUpperCase()}:${id}</span>`;
    });
    return html;
};

const Note = ({ note, onNoteUpdate, onNoteDelete, onTagAdd, onTagRemove, onDataChange, onNavigate, scale, isDimmed }) => {
    const nodeRef = useRef(null); // The Highest Div Ref
    const editRef = useRef(null);
    
    // STATES
    const [isEditing, setIsEditing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [localContent, setLocalContent] = useState(note.content);
    
    // VISUAL SIZING (1:1 with DB until resize starts)
    const [localDims, setLocalDims] = useState({ w: note.width, h: note.height });
    
    const [showColorMenu, setShowColorMenu] = useState(false);
    const [showCopyFeedback, setShowCopyFeedback] = useState(false);

    // SYNC: Keep local state aligned with DB when not interacting
    useEffect(() => {
        if (!isEditing) setLocalContent(note.content);
        if (!isDragging) setLocalDims({ w: note.width, h: note.height });
    }, [note.content, note.width, note.height, isEditing, isDragging]);

    // UX: Focus text area on edit
    useLayoutEffect(() => {
        if (isEditing && editRef.current) {
            editRef.current.focus();
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(editRef.current);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }, [isEditing]);

    const colorObj = NOTE_COLORS.find(c => c.hex === note.color_hex) || NOTE_COLORS[0];
    const isDark = note.color_hex === '#303030' || note.color_hex === '#242424';
    const textColor = isDark ? 'text-gray-100' : 'text-gray-900';

    // --- GHOST PROXY MOVEMENT ---
    const handleDragStart = () => {
        setIsDragging(true);
    };

    const handleDragStop = (e, data) => {
        setIsDragging(false);
        // Teleport the real data to the ghost's final location
        if (Math.abs(data.x - note.pos_x) > 1 || Math.abs(data.y - note.pos_y) > 1) {
            onNoteUpdate(note.id, { pos_x: data.x, pos_y: data.y });
        }
    };

    // --- INVERTED RESIZE (Root Instant, Content Smooth) ---
    const handleResize = (e, data) => {
        // Apply size to the Root Div state immediately
        setLocalDims({ w: data.size.width, h: data.size.height });
    };

    const handleResizeStop = (e, data) => {
        onNoteUpdate(note.id, { width: data.size.width, height: data.size.height });
    };

    // --- INTERACTION HANDLERS ---
    const handleViewClick = (e) => {
        if (e.target.closest('.note-link')) {
            e.stopPropagation(); e.preventDefault();
            const link = e.target.closest('.note-link');
            if (onNavigate) onNavigate(link.dataset.type, link.dataset.id);
            return;
        }
        e.stopPropagation(); // Stop drag from starting
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (editRef.current && editRef.current.innerText !== note.content) {
            onNoteUpdate(note.id, { content: editRef.current.innerText });
        }
    };

    // --- STYLES ---
    const ghostClass = isDragging 
        ? "opacity-60 grayscale cursor-grabbing shadow-2xl z-50 transition-none" 
        : "opacity-100 shadow-lg hover:shadow-xl z-20 transition-colors transition-opacity duration-200"; 
    
    // The "Static Proxy" stays behind to anchor the user's mental model
    const staticProxyStyle = {
        left: note.pos_x,
        top: note.pos_y,
        width: note.width,
        height: note.height,
        backgroundColor: colorObj.hex,
        borderColor: colorObj.border
    };

    return (
        <>
            {/* 1. STATIC PROXY (Visual Anchor) */}
            {isDragging && (
                <div 
                    className="absolute rounded-lg border-2 border-dashed opacity-30 z-10 pointer-events-none"
                    style={staticProxyStyle}
                />
            )}

            {/* 2. THE GHOST / ROOT NOTE */}
            <Draggable 
                nodeRef={nodeRef} 
                handle=".drag-handle" 
                // We use the DB position as anchor. Draggable manages the delta transform.
                position={{ x: note.pos_x, y: note.pos_y }} 
                scale={scale} 
                onStart={handleDragStart}
                onStop={handleDragStop}
                disabled={isEditing}
            >
                <div 
                    ref={nodeRef} 
                    id={`note-${note.id}`}
                    // HIGHEST DIV: All primary styles applied here
                    className={`absolute flex flex-col rounded-lg overflow-hidden ${ghostClass} ${isDimmed ? "opacity-30 pointer-events-none" : ""}`}
                    style={{ 
                        width: localDims.w, 
                        height: localDims.h,
                        backgroundColor: colorObj.hex,
                        border: `1px solid ${colorObj.border}`,
                        // Optimization: Promote to layer
                        transform: 'translateZ(0)', 
                        backfaceVisibility: 'hidden',
                        willChange: isDragging ? 'transform' : 'auto'
                    }}
                >
                    {/* RESIZABLE LOGIC: Wrapper that fills the Root Div */}
                    <ResizableBox 
                        width={localDims.w} 
                        height={localDims.h} 
                        transformScale={scale}
                        minConstraints={[200, 150]} 
                        onResize={handleResize} 
                        onResizeStop={handleResizeStop} 
                        // Custom Handle (Bottom Right)
                        handle={<span className={`react-resizable-handle react-resizable-handle-se !w-4 !h-4 !bottom-1 !right-1 opacity-0 group-hover:opacity-100 ${isDark ? 'brightness-150' : 'brightness-75'}`} />}
                        className="group w-full h-full flex flex-col"
                    >
                        {/* HEADER */}
                        <div 
                            className="drag-handle h-9 min-h-[36px] w-full cursor-grab active:cursor-grabbing flex items-center justify-between px-2 select-none border-b transition-colors duration-200"
                            style={{ backgroundColor: colorObj.header, borderColor: colorObj.border }}
                        >
                            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/5 ${isDark ? 'text-white/60' : 'text-black/50'}`}>
                                #{note.id}
                            </span>

                            <div className="flex items-center gap-1.5" onMouseDown={(e) => e.stopPropagation()}>
                                {/* Color Picker */}
                                <div className="relative flex items-center">
                                    <button 
                                        onClick={() => setShowColorMenu(!showColorMenu)}
                                        className="w-4 h-4 rounded-full border border-black/10 hover:scale-110 transition-transform shadow-sm"
                                        style={{ backgroundColor: colorObj.hex }}
                                    />
                                    {showColorMenu && (
                                        <div className="absolute top-6 right-0 bg-white border border-gray-200 shadow-2xl rounded-lg p-2 grid grid-cols-4 gap-2 w-36 z-[9999] animate-in fade-in zoom-in-95 duration-100">
                                            {NOTE_COLORS.map(c => (
                                                <button 
                                                    key={c.hex} 
                                                    className="w-6 h-6 rounded-full border border-gray-300 hover:scale-110 shadow-sm transition-transform"
                                                    style={{ backgroundColor: c.hex }}
                                                    onClick={() => { onNoteUpdate(note.id, { color_hex: c.hex }); setShowColorMenu(false); }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className={`h-4 w-px ${isDark ? 'bg-white/20' : 'bg-black/10'}`} />
                                <button onClick={() => { navigator.clipboard.writeText(`[[note:${note.id}]]`); setShowCopyFeedback(true); setTimeout(() => setShowCopyFeedback(false), 2000); }} 
                                    className={`text-xs font-bold hover:scale-110 transition-transform ${isDark ? 'text-white/60 hover:text-white' : 'text-black/40 hover:text-black'}`}
                                >
                                    {showCopyFeedback ? '✓' : '🔗'}
                                </button>
                                <button onClick={() => onNoteDelete(note.id)} 
                                    className={`text-xs font-bold hover:scale-110 transition-transform hover:text-red-500 ${isDark ? 'text-white/60' : 'text-black/40'}`}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* CONTENT: Smooth Flow Effect */}
                        <div className="flex-grow w-full relative overflow-hidden bg-transparent transition-colors duration-200">
                            {!isEditing && (
                                <div 
                                    className={`w-full h-full p-4 overflow-y-auto whitespace-pre-wrap font-sans duration-200 leading-relaxed ${textColor}`}
                                    onClick={handleViewClick}
                                    dangerouslySetInnerHTML={{ __html: renderViewMode(localContent) }}
                                />
                            )}
                            {isEditing && (
                                <div 
                                    ref={editRef}
                                    contentEditable
                                    suppressContentEditableWarning
                                    className={`w-full h-full p-4 overflow-y-auto whitespace-pre-wrap font-sans transition-colors duration-200 leading-relaxed outline-none focus:ring-2 focus:ring-blue-500/20 ${textColor}`}
                                    onBlur={handleBlur}
                                >
                                    {localContent}
                                </div>
                            )}
                        </div>

                        {/* FOOTER */}
                        <div className={`px-2 py-1.5 transition-colors duration-200 border-t bg-black/5 ${isDark ? 'border-white/10' : 'border-black/5'}`}>
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
        </>
    );
};

export default Note;