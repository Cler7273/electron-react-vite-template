import React, { useRef } from "react";

// Helper Component for individual Tag Pills
const TagPill = ({ tag, onRemove, onColorChange }) => (
    <div 
        onClick={() => onColorChange(tag)} 
        className="flex items-center text-white text-xs font-semibold px-2 py-1 rounded-full cursor-pointer transition-transform hover:scale-105 select-none" 
        style={{ backgroundColor: tag.color_hex || '#3b82f6' }} 
        title="Double-click to change color"
    >
        <span>{tag.name}</span>
        <button
            onClick={(e) => {
                e.stopPropagation();
                onRemove(tag.name);
            }}
            className="ml-2 text-white opacity-50 hover:opacity-100 font-bold"
        >
            ×
        </button>
    </div>
);

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
        if (colorInputRef.current) colorInputRef.current.click();
    };

    const onColorSelected = async (e) => {
        const newColor = e.target.value;
        const tag = tagToChangeRef.current;
        if (!tag || !newColor) return;

        try {
            const token = await window.nativeAPI.getSecretToken();
            await fetch(`http://localhost:4000/api/tags/${tag.name}`, {
                method: "PUT",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}` 
                },
                body: JSON.stringify({ color_hex: newColor }),
            });
            onDataChange(); // Refresh canvas data
        } catch (err) {
            console.error("Failed to update tag color", err);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-2 p-2 border-t border-black border-opacity-10 bg-white bg-opacity-20 mt-auto">
            {/* Hidden Color Input for Picker */}
            <input 
                type="color" 
                ref={colorInputRef} 
                onChange={onColorSelected} 
                className="w-0 h-0 opacity-0 absolute pointer-events-none" 
            />

            {(tags || []).map((tag) => (
                <TagPill 
                    key={tag.name} 
                    tag={tag} 
                    onRemove={onRemoveTag} 
                    onColorChange={handleColorChange} 
                />
            ))}
            
            <input 
                type="text" 
                onKeyDown={handleKeyDown} 
                placeholder="+ tag" 
                className="bg-transparent text-xs text-gray-600 placeholder-gray-400 focus:outline-none w-16 hover:w-24 transition-all" 
                onClick={(e) => e.stopPropagation()} 
            />
        </div>
    );
};

export default TagManager;