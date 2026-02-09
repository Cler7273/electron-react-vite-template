import React, { useRef, useEffect, useState } from "react";
import Draggable from "react-draggable";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import TagManager from "./TagManager";

// This helper function remains the same.
const parseAndRenderLinks = (htmlContent) => {
    const content = String(htmlContent || "");
    const internalLinkRegex = /\[\[(note|frame):(\d+)\]\]/g;
    return content.replace(internalLinkRegex, (match, type, id) => {
        const elementId = `${type}-${id}`;
        // Add contenteditable="false" so users can't edit inside the link itself
        return `<a href="#" data-internal-link="${elementId}" class="internal-link bg-blue-100 text-blue-800 px-1 rounded hover:bg-blue-200" contenteditable="false">🔗 ${type} ${id}</a>`;
    });
};

const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const Note = ({ note, onNoteUpdate, onNoteDelete, onTagAdd, onTagRemove, isParentDragging, isDeleting, isDimmed, isSearchResult, onDataChange, onNavigateTo, scale }) => {
    const nodeRef = useRef(null);
    const contentRef = useRef(null);

    // NEW: Local state to track when this specific note is being dragged
    const [isBeingDragged, setIsBeingDragged] = useState(false);

    // --- DRAG HANDLERS ---
    const handleDragStart = () => {
        setIsBeingDragged(true);
    };

    const handleDragStop = (e, data) => {
        setIsBeingDragged(false); // Reset drag state on stop
        onNoteUpdate(note.id, { pos_x: data.x, pos_y: data.y });
    };

    // --- OTHER HANDLERS ---
    const handleResizeStop = (e, data) => onNoteUpdate(note.id, { width: data.size.width, height: data.size.height });
    const handleDeleteClick = (e) => {
        e.stopPropagation();
        onNoteDelete(note.id);
    };

    const handleFocus = () => {
        const div = contentRef.current;
        if (div) {
            div.innerText = div.innerHTML;
        }
    };

    const handleBlur = () => {
        const div = contentRef.current;
        if (div) {
            const rawText = div.innerText;
            div.innerHTML = rawText;
            const newContent = div.innerHTML;
            if (newContent !== note.content) {
                onNoteUpdate(note.id, { content: newContent });
            }
        }
    };

    useEffect(() => {
        const div = contentRef.current;
        if (!div) return;
        const handleLinkClick = (e) => {
            const target = e.target.closest("a");
            if (!target || document.activeElement === div) return;
            e.preventDefault();
            const internalLink = target.getAttribute("data-internal-link");
            const externalLink = target.getAttribute("href");
            if (internalLink) {
                onNavigateTo(internalLink);
            } else if (externalLink && externalLink.startsWith("http")) {
                window.electron.openExternalLink(externalLink);
            }
        };
        div.addEventListener("click", handleLinkClick);
        return () => div.removeEventListener("click", handleLinkClick);
    }, [onNavigateTo]);

    // --- DYNAMIC STYLING ---
    const searchResultClass = isSearchResult ? "shadow-lg shadow-yellow-400 ring-2 ring-yellow-400" : "shadow-xl";

    // NEW: Updated logic for opacity classes
    let opacityClass = "opacity-100";
    if (isDimmed || isDeleting) {
        opacityClass = "opacity-20 pointer-events-none";
    } else if (isParentDragging || isBeingDragged) {
        opacityClass = "opacity-50";
    }
    const noteClasses = `absolute z-20 transition-opacity duration-150 ${opacityClass}`;

    return (
        <Draggable
            nodeRef={nodeRef}
            handle=".drag-handle"
            onStart={handleDragStart} // Add the onStart handler
            onStop={handleDragStop} // This now uses the modified handler
            position={{ x: note.pos_x, y: note.pos_y }}
            disabled={Boolean(isDeleting || isDimmed)}
            scale={scale}
        >
            <div id={`note-${note.id}`} ref={nodeRef} className={noteClasses} style={{ width: note.width, height: note.height }}>
                <ResizableBox height={note.height} width={note.width} onResizeStop={handleResizeStop} minConstraints={[150, 150]}>
                    <div className={`w-full h-full rounded-lg flex flex-col ${searchResultClass}`} style={{ backgroundColor: note.color_hex }}>
                        <div className="drag-handle h-7 w-full cursor-move rounded-t-lg bg-black bg-opacity-10 hover:bg-opacity-20 flex items-center justify-end p-1">
                            <button onClick={handleDeleteClick} className="w-5 h-5 rounded-full hover:bg-red-500 hover:text-white flex items-center justify-center">
                                <DeleteIcon />
                            </button>
                        </div>

                        <div ref={contentRef} contentEditable suppressContentEditableWarning className="flex-grow w-full text-lg text-black p-4 focus:outline-none whitespace-pre-wrap" onFocus={handleFocus} onBlur={handleBlur} dangerouslySetInnerHTML={{ __html: parseAndRenderLinks(note.content) }} data-placeholder="Click to edit raw HTML..." />

                        <TagManager tags={note.tags || []} onAddTag={(tagName) => onTagAdd("notes", note.id, tagName)} onRemoveTag={(tagName) => onTagRemove("notes", note.id, tagName)} onDataChange={onDataChange} />
                    </div>
                </ResizableBox>
            </div>
        </Draggable>
    );
};
export default Note;
