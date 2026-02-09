import React, { useRef } from "react";

// TagPill expects `tag` to be an object: { name, color_hex }
const TagPill = ({ tag, onRemove, onColorChange }) => (
    <div onClick={() => onColorChange(tag)} className="flex items-center text-white text-xs font-semibold px-2 py-1 rounded-full cursor-pointer" style={{ backgroundColor: tag.color_hex }} title="Double-click to change color">
        <span>{tag.name}</span>
        <button
            onClick={(e) => {
                e.stopPropagation();
                onRemove(tag.name);
            }}
            className="ml-2 text-blue-200 hover:text-white"
        >
            ✕
        </button>
    </div>
);

// MODIFIED: Now accepts onDataChange to trigger a refetch
const TagManager = ({ tags, onAddTag, onRemoveTag, onDataChange }) => {
    const colorInputRef = useRef(null);
    const tagToChangeRef = useRef(null);

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && e.currentTarget.value.trim() !== "") {
            e.preventDefault();
            onAddTag(e.currentTarget.value.trim());
            e.currentTarget.value = "";
        }
    };

    const handleColorChange = (tag) => {
        tagToChangeRef.current = tag;
        colorInputRef.current.click(); // Trigger the hidden color input
    };

    const onColorSelected = async (e) => {
        const newColor = e.target.value;
        const tagName = tagToChangeRef.current.name;
        if (!tagName || !newColor) return;

        try {
            await fetch(`http://localhost:4000/api/tags/${tagName}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ color_hex: newColor }),
            });
            onDataChange(); // Call the passed-in function to refetch all data
        } catch (err) {
            console.error("Failed to update tag color", err);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-2 p-2 border-t border-black border-opacity-10">
            <input type="color" ref={colorInputRef} onChange={onColorSelected} className="w-0 h-0 opacity-0 absolute" />

            {/* This component correctly expects `tags` to be an array of objects */}
            {(tags || []).map((tag) => (
                <TagPill key={tag.name} tag={tag} onRemove={onRemoveTag} onColorChange={handleColorChange} />
            ))}
            <input type="text" onKeyDown={handleKeyDown} placeholder="+ tag" className="bg-transparent text-sm focus:outline-none w-16" onClick={(e) => e.stopPropagation()} />
        </div>
    );
};

export default TagManager;
