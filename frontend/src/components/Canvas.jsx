import React, { useState, useEffect, useRef } from "react";
import Note from "./Note";
import Frame from "./Frame";
import TaskWidget from "./TaskWidget";

const Canvas = ({ searchQuery = "", activeFilters = [], onTagClick, showTasks, bgColor = "#242424" }) => {
    const [data, setData] = useState({ notes: [], frames: [], tasks: [] });

    // View State: Separate Ref for physics (instant) and State for rendering (reactive)
    const viewRef = useRef({ x: 0, y: 0, scale: 1 });
    const [viewState, setViewState] = useState({ x: 0, y: 0, scale: 1 });

    const [isPanning, setIsPanning] = useState(false);
    const [isTeleporting, setIsTeleporting] = useState(false);

    const containerRef = useRef(null);

    // --- SYNC REFS & STATE ---
    const setView = (newView) => {
        viewRef.current = { ...viewRef.current, ...newView };
        setViewState(viewRef.current);
    };
    const fetchData = async () => {
        try {
            const token = await window.nativeAPI.getSecretToken();
            // Fetch latest data
            const res = await fetch("http://localhost:4000/api/all", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();

            // Update state
            setData(json);
            // NOTE: Do NOT dispatch 'cognicanvas:data-updated' here,
            // or you will create an infinite loop.
        } catch (e) {
            console.error(e);
        }
    };

    // REPLACED: Added listener for global sync
  useEffect(() => {
    // 1. Initial Load
    fetchData(); 

    // 2. Listen for updates from TasksApp or Widgets
    const handleRemoteUpdate = () => fetchData();
    window.addEventListener('cognicanvas:data-updated', handleRemoteUpdate);

    // 3. Cleanup
    return () => window.removeEventListener('cognicanvas:data-updated', handleRemoteUpdate);
  }, []);

    // --- LOGIC: Filter Matching ---
    const getFilterMatch = (item) => {
        const contentStr = (item.content || item.title || "").toLowerCase();
        const normSearch = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery || contentStr.includes(normSearch);
        const matchesTags = activeFilters.length === 0 || (item.tags && item.tags.some((tag) => activeFilters.includes(tag.name)));
        return matchesSearch && matchesTags;
    };

    // --- NAVIGATION (Smooth Teleport) ---
    const teleportTo = (x, y) => {
        const container = containerRef.current;
        if (!container) return;

        setIsTeleporting(true); // Enable CSS transition

        const { clientWidth, clientHeight } = container;
        const newScale = 1; // Reset zoom to 1:1 for clarity

        const newX = clientWidth / 2 - x * newScale;
        const newY = clientHeight / 2 - y * newScale;

        setView({ x: newX, y: newY, scale: newScale });

        // Disable transition after animation to restore snappy panning
        setTimeout(() => setIsTeleporting(false), 350);
    };

    const focusOnItem = (type, id) => {
        const itemId = parseInt(id);
        let target = null;
        if (type === "note") target = data.notes.find((n) => n.id === itemId);
        else if (type === "frame") target = data.frames.find((f) => f.id === itemId);

        if (target) {
            const cx = target.pos_x + target.width / 2;
            const cy = target.pos_y + target.height / 2;
            teleportTo(cx, cy);
        }
    };

    // --- INTERACTIONS ---

    // 1. Native Wheel Zoom (Passive)
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheelNative = (e) => {
            e.preventDefault();
            const current = viewRef.current;
            const rect = container.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const worldX = (mouseX - current.x) / current.scale;
            const worldY = (mouseY - current.y) / current.scale;

            const delta = -e.deltaY * 0.001;
            const newScale = Math.min(Math.max(current.scale + delta, 0.05), 4);

            const newX = mouseX - worldX * newScale;
            const newY = mouseY - worldY * newScale;

            setView({ x: newX, y: newY, scale: newScale });
        };

        container.addEventListener("wheel", handleWheelNative, { passive: false });
        return () => container.removeEventListener("wheel", handleWheelNative);
    }, []);

    // 2. Mouse Down (Strict Pan Guard)
    const handleMouseDown = (e) => {
        // INTERACTION GUARD:
        // Ignore pan if clicking specific interactive elements or draggables
        if (e.target.closest(".react-draggable") || e.target.closest("button") || e.target.closest("input") || e.target.closest(".pointer-events-auto")) {
            // Catch explicitly interactive children
            return;
        }

        // Logic: Middle Mouse (1) OR Left Click (0) + Alt
        const isMiddleMouse = e.button === 1 || e.buttons === 4;
        const isAltPan = e.button === 0 && e.altKey;

        if (isMiddleMouse || isAltPan) {
            e.preventDefault();
            setIsPanning(true);
        }
    };

    const handleMouseMove = (e) => {
        if (!isPanning) return;
        setView({ x: viewRef.current.x + e.movementX, y: viewRef.current.y + e.movementY });
    };

    const handleMouseUp = () => setIsPanning(false);

    // --- CRUD ACTIONS ---
    const handleDoubleClick = async (e) => {
        if (e.target !== containerRef.current && e.target.id !== "transform-layer") return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - viewRef.current.x) / viewRef.current.scale;
        const y = (e.clientY - rect.top - viewRef.current.y) / viewRef.current.scale;
        const token = await window.nativeAPI.getSecretToken();
        await fetch("http://localhost:4000/api/notes", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ content: "New Note", pos_x: x - 100, pos_y: y - 100, width: 200, height: 200, color_hex: "#ffffff" }) });
        fetchData();
    };

    const handleNoteUpdateDrag = async (id, changes) => {
        let updates = { ...changes };
        if (changes.pos_x !== undefined) {
            const note = data.notes.find((n) => n.id === id);
            if (note) {
                const cx = changes.pos_x + note.width / 2;
                const cy = changes.pos_y + note.height / 2;
                const parentFrame = data.frames.find((f) => !f.is_collapsed && cx >= f.pos_x && cx <= f.pos_x + f.width && cy >= f.pos_y && cy <= f.pos_y + f.height);
                updates.frame_id = parentFrame ? parentFrame.id : null;
            }
        }
        setData((prev) => ({ ...prev, notes: prev.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)) }));
        const token = await window.nativeAPI.getSecretToken();
        await fetch(`http://localhost:4000/api/notes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(updates) });
    };

    const handleFrameDrag = (frameId, dx, dy) => {
        setData((prev) => ({
            ...prev,
            frames: prev.frames.map((f) => (f.id === frameId ? { ...f, pos_x: f.pos_x + dx, pos_y: f.pos_y + dy } : f)),
            notes: prev.notes.map((n) => (n.frame_id === frameId ? { ...n, pos_x: n.pos_x + dx, pos_y: n.pos_y + dy } : n)),
        }));
    };

    const handleFrameStop = async (id, finalPos) => {
        const token = await window.nativeAPI.getSecretToken();
        await fetch(`http://localhost:4000/api/frames/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(finalPos) });
        const children = data.notes.filter((n) => n.frame_id === id);
        for (const child of children) {
            await fetch(`http://localhost:4000/api/notes/${child.id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ pos_x: child.pos_x, pos_y: child.pos_y }) });
        }
    };

    const handleUpdateFrame = async (id, changes) => {
        setData((prev) => ({ ...prev, frames: prev.frames.map((f) => (f.id === id ? { ...f, ...changes } : f)) }));
        const token = await window.nativeAPI.getSecretToken();
        await fetch(`http://localhost:4000/api/frames/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(changes) });
    };

    const handleTagAction = async (action, type, id, tagName) => {
        const token = await window.nativeAPI.getSecretToken();
        const url = action === "add" ? `http://localhost:4000/api/tags/${type}/${id}` : `http://localhost:4000/api/${type}/${id}/tags/${tagName}`;
        await fetch(url, { method: action === "add" ? "POST" : "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: action === "add" ? JSON.stringify({ name: tagName }) : undefined });
        fetchData();
    };

    // --- RENDER PREPARATION ---
    const notesToRender = data.notes
        .map((note) => {
            if (note.frame_id) {
                const parent = data.frames.find((f) => f.id === note.frame_id);
                if (parent && parent.is_collapsed) return null;
            }
            const isMatch = getFilterMatch(note);
            const isDimmed = (searchQuery || activeFilters.length > 0) && !isMatch;
            return (
                <Note
                    key={note.id}
                    note={note}
                    scale={viewState.scale}
                    isDimmed={isDimmed}
                    onNoteUpdate={handleNoteUpdateDrag}
                    onNoteDelete={async (id) => {
                        await fetch(`http://localhost:4000/api/notes/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${await window.nativeAPI.getSecretToken()}` } });
                        fetchData();
                    }}
                    onTagAdd={(type, id, name) => handleTagAction("add", type, id, name)}
                    onTagRemove={(type, id, name) => handleTagAction("remove", type, id, name)}
                    onDataChange={fetchData}
                    onNavigate={focusOnItem}
                />
            );
        })
        .filter(Boolean);

    const tasksToRender = data.tasks.map(task => {
      // Logic: Show if it matches search OR if it is currently running
      // This ensures active tasks don't disappear when you clear filters
      const isMatch = getFilterMatch(task);
      const shouldShow = isMatch || task.is_running;

      if (!shouldShow) return null;

      return (
         <div key={task.id} className="pointer-events-auto relative inline-block">
                <TaskWidget
                    task={task}
                    // When the widget stops/starts, it notifies the system
                    onUpdate={() => {
                        window.dispatchEvent(new CustomEvent("cognicanvas:data-updated"));
                    }}
                />
         </div>
      );
  }).filter(Boolean);

    return (
        <div
            ref={containerRef}
            onDoubleClick={handleDoubleClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full h-full overflow-hidden relative"
            style={{
                backgroundColor: bgColor,
                cursor: isPanning ? "grabbing" : "default",
            }}
        >
            {/* 1. WORLD SPACE (Transformed) */}
            <div
                id="transform-layer"
                style={{
                    transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})`,
                    transformOrigin: "0 0",
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    // Smoothly animate ONLY when teleporting to avoid physics lag
                    transition: isTeleporting ? "transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)" : "none",
                    pointerEvents: "none", // Allow click-through to background
                }}
            >
                {/* Grid */}
                <div className="absolute opacity-10 top-[-200000px] left-[-200000px] w-[400000px] h-[400000px] pointer-events-none" style={{ backgroundImage: "radial-gradient(#888 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

                {/* WORLD ITEMS - Re-enable events for interactivity */}
                <div className="pointer-events-auto">
                    {data.frames.map((frame) => (
                        <Frame
                            key={frame.id}
                            frame={frame}
                            scale={viewState.scale}
                            onUpdate={handleUpdateFrame}
                            onDelete={async (id) => {
                                await fetch(`http://localhost:4000/api/frames/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${await window.nativeAPI.getSecretToken()}` } });
                                fetchData();
                            }}
                            onDrag={handleFrameDrag}
                            onDragStop={handleFrameStop}
                        />
                    ))}
                    {notesToRender}
                </div>
            </div>

            {/* 2. HUD SPACE (Overlay) */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Container is pointer-events-none, ensuring clicks pass through to Canvas */}
                <div className="w-full h-full relative">{showTasks && tasksToRender}</div>
            </div>

            {/* DEBUG INFO */}
            <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-mono select-none pointer-events-none">
                {Math.round(viewState.scale * 100)}% | {Math.round(viewState.x)},{Math.round(viewState.y)}
            </div>
        </div>
    );
};

export default Canvas;
