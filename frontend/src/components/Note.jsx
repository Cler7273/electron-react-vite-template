import React, { useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";
import TagManager from "./TagManager";

const NOTE_COLORS = [
    { hex: '#ffffff', name: 'White', border: '#cbd5e1', header: '#f1f5f9' },
    { hex: '#fff59d', name: 'Yellow', border: '#fbc02d', header: '#fff176' },
    { hex: '#b2dfdb', name: 'Teal', border: '#00897b', header: '#80cbc4' },
    { hex: '#f8bbd0', name: 'Pink', border: '#ec407a', header: '#f48fb1' },
    { hex: '#c5e1a5', name: 'Green', border: '#7cb342', header: '#aed581' },
    { hex: '#ffcc80', name: 'Orange', border: '#fb8c00', header: '#ffb74d' },
    { hex: '#d1c4e9', name: 'Purple', border: '#7e57c2', header: '#b39ddb' },
    { hex: '#303030', name: 'Dark', border: '#000000', header: '#424242' },
    { hex: '#242424', name: 'Darker', border: '#000000', header: '#303030' },
    { hex: '#f83bff', name: 'Hot Pink', border: '#c000c0', header: '#f06292' },
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

const Note = ({ note, onNoteUpdate, onNoteDelete, onTagAdd, onTagRemove, onDataChange, onNavigate, scale = 1, isDimmed }) => {
    // REFS
    const noteRef = useRef(null); 
    const editRef = useRef(null);
    
    // STATES
    const [isEditing, setIsEditing] = useState(false);
    const [isDragging, setIsDragging] = useState(false); // Restored State
    const [localContent, setLocalContent] = useState(note.content);
    const [showColorMenu, setShowColorMenu] = useState(false);
    const [showCopyFeedback, setShowCopyFeedback] = useState(false);

    // Initial Positions (Synced with DB)
    const [pos, setPos] = useState({ x: note.pos_x, y: note.pos_y });
    const [size, setSize] = useState({ w: note.width, h: note.height });

    // INTERACTION STATE (Mutable, no re-renders for physics)
    const interaction = useRef({
        active: false,
        type: null, 
        startMouse: { x: 0, y: 0 },
        startRect: { x: 0, y: 0, w: 0, h: 0 }
    });

    // Sync state with props when not interacting
    useEffect(() => {
        if (!interaction.current.active) {
            setPos({ x: note.pos_x, y: note.pos_y });
            setSize({ w: note.width, h: note.height });
        }
    }, [note.pos_x, note.pos_y, note.width, note.height]);

    useEffect(() => {
        if (!isEditing) setLocalContent(note.content);
    }, [note.content, isEditing]);

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

    // --- MANUAL PHYSICS SYSTEM ---

    const onMouseDown = (e) => {
        if (isEditing) return; 

        const target = e.target;
        let type = null;

        if (target.classList.contains('resize-handle')) type = 'resize';
        else if (target.closest('.drag-handle')) type = 'move';

        if (!type || target.tagName === 'BUTTON') return;

        e.preventDefault();
        e.stopPropagation();

        if (type === 'move') setIsDragging(true); // Trigger Ghost Render

        interaction.current = {
            active: true,
            type: type,
            startMouse: { x: e.clientX, y: e.clientY },
            startRect: { x: pos.x, y: pos.y, w: size.w, h: size.h }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        // Optimization: Lift to top
        if (noteRef.current) {
            noteRef.current.style.zIndex = "9999";
            noteRef.current.style.transition = "none"; 
        }
    };

    const onMouseMove = useCallback((e) => {
        if (!interaction.current.active || !noteRef.current) return;

        requestAnimationFrame(() => {
            if (!interaction.current.active) return;
            
            const { type, startMouse, startRect } = interaction.current;
            const dx = (e.clientX - startMouse.x) / scale;
            const dy = (e.clientY - startMouse.y) / scale;
            const el = noteRef.current;

            if (type === 'move') {
                const newX = startRect.x + dx;
                const newY = startRect.y + dy;
                el.style.left = `${newX}px`;
                el.style.top = `${newY}px`;
            } else if (type === 'resize') {
                const newW = Math.max(200, startRect.w + dx);
                const newH = Math.max(150, startRect.h + dy);
                el.style.width = `${newW}px`;
                el.style.height = `${newH}px`;
            }
        });
    }, [scale]);

    const onMouseUp = useCallback(() => {
        if (!interaction.current.active) return;
        
        setIsDragging(false); // Remove Ghost
        interaction.current.active = false;
        
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        if (noteRef.current) {
            // Read final DOM state
            const finalX = parseFloat(noteRef.current.style.left);
            const finalY = parseFloat(noteRef.current.style.top);
            const finalW = parseFloat(noteRef.current.style.width);
            const finalH = parseFloat(noteRef.current.style.height);

            noteRef.current.style.zIndex = "";
            noteRef.current.style.transition = "";

            // Update React State
            setPos({ x: finalX, y: finalY });
            setSize({ w: finalW, h: finalH });

            // Update DB
            onNoteUpdate(note.id, { 
                pos_x: finalX, 
                pos_y: finalY, 
                width: finalW, 
                height: finalH 
            });
        }
    }, [note.id, onNoteUpdate]);


    // --- RENDERING ---
    const colorObj = NOTE_COLORS.find(c => c.hex === note.color_hex) || NOTE_COLORS[0];
    const isDark = note.color_hex === '#303030' || note.color_hex === '#242424';
    const textColor = isDark ? 'text-gray-100' : 'text-gray-900';

    const handleViewClick = (e) => {
        if (e.target.closest('.note-link')) {
            e.stopPropagation(); e.preventDefault();
            const link = e.target.closest('.note-link');
            if (onNavigate) onNavigate(link.dataset.type, link.dataset.id);
            return;
        }
        e.stopPropagation(); 
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (editRef.current && editRef.current.innerText !== note.content) {
            onNoteUpdate(note.id, { content: editRef.current.innerText });
        }
    };

    return (
        <>
            {/* 1. GHOST PROXY (The visual anchor that stays behind) */}
            {isDragging && (
                <div 
                    className="absolute rounded-lg border-2 border-dashed opacity-30 z-10 pointer-events-none transition-none"
                    style={{
                        left: pos.x,
                        top: pos.y,
                        width: size.w,
                        height: size.h,
                        backgroundColor: colorObj.hex,
                        borderColor: colorObj.border
                    }}
                />
            )}

            {/* 2. REAL NOTE (The Moving Element) */}
            <div 
                ref={noteRef}
                className={`absolute flex flex-col rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow 
                    ${isDimmed ? "opacity-30 pointer-events-none" : ""} 
                    ${isDragging ? "opacity-60 grayscale cursor-grabbing" : ""}`}
                style={{ 
                    left: pos.x, 
                    top: pos.y, 
                    width: size.w, 
                    height: size.h,
                    backgroundColor: colorObj.hex,
                    border: `1px solid ${colorObj.border}`,
                }}
                onMouseDown={onMouseDown}
            >
                {/* HEADER (Drag Handle) */}
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
                                <div className="absolute top-6 right-0 bg-white border border-gray-200 shadow-2xl rounded-lg p-2 grid grid-cols-4 gap-2 w-36 z-[9999]">
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

                {/* CONTENT */}
                <div className="flex-grow w-full relative overflow-hidden bg-transparent">
                    {!isEditing && (
                        <div 
                            className={`w-full h-full p-4 overflow-y-auto whitespace-pre-wrap font-sans duration-200 leading-relaxed cursor-text ${textColor}`}
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

                {/* MANUAL RESIZE HANDLE */}
                <div 
                    className={`resize-handle absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize z-20 flex items-end justify-end p-1 group opacity-0 group-hover:opacity-100 hover:opacity-100`}
                >
                     <div className={`pointer-events-none w-2 h-2 border-r-2 border-b-2 ${isDark ? 'border-white/40' : 'border-black/30'}`} />
                </div>
            </div>
        </>
    );
};

export default Note;