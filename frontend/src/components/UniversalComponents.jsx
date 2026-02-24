import React from 'react';

// A standardized Input field that fits the UAE dark theme perfectly
export const UaeInput = ({ value, onChange, onSubmit, placeholder, icon = "+" }) => {
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && value.trim()) {
            onSubmit(value);
        }
    };

    return (
        <div className="group relative bg-[#111] border border-gray-700 rounded-lg focus-within:bg-[#1a1a1a] focus-within:border-indigo-500/50 transition-all shadow-lg mb-4">
            <div className="flex items-center gap-3 p-3">
                <div className="w-6 h-6 flex items-center justify-center border-2 border-gray-600 rounded-full group-hover:border-indigo-500 transition-colors text-indigo-500 font-bold text-sm">
                    {icon}
                </div>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="bg-transparent border-none outline-none text-sm text-gray-200 placeholder-gray-500 flex-1 font-medium h-6"
                />
            </div>
            <div className="h-0.5 w-0 bg-indigo-500 mx-auto group-focus-within:w-full transition-all duration-300 rounded-b-lg"></div>
        </div>
    );
};

// A standardized List Item block
export const UaeListItem = ({ title, subtitle, onClick, actions, isActive }) => (
    <div
        onClick={onClick}
        className={`group flex items-center justify-between p-3 border rounded-lg transition-all shadow-sm cursor-pointer mb-2
            ${isActive ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-[#111] border-gray-800 hover:border-gray-600 hover:bg-[#161616]'}`}
    >
        <div className="flex flex-col">
            <span className="text-sm text-gray-200 font-medium">{title}</span>
            {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
        </div>
        {/* Actions slot (e.g., delete button). Make sure to use e.stopPropagation() on buttons passed here! */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {actions}
        </div>
    </div>
);

// The Universal App Shell
export const UniversalAppShell = ({
    appName, themeColor = "#4f46e5", windowAPI, sidebarContent, headerActions, children, onHome
}) => {
    const [isSidebarOpen, setSidebarOpen] = React.useState(true);

    return (
        <div className="h-full w-full flex flex-col pt-10 overflow-hidden relative select-none font-sans text-gray-100">

            {/* Draggable Header Pill */}
            <div className="absolute -top-2 left-0 right-0 h-14 z-50 flex justify-center items-start pointer-events-none">
                <div className="group pointer-events-auto mt-2 relative">

                    {/* 1. Default State (Simple Pill) */}
                    <div className="bg-[#1a1a1a] border border-gray-600 rounded-full px-4 py-1.5 shadow-lg flex items-center gap-2 transition-all duration-300 group-hover:opacity-0 absolute top-0 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: themeColor }}></span>
                        <span className="text-[10px] font-bold text-gray-300 tracking-widest uppercase">{appName}</span>
                    </div>

                    {/* 2. Expanded State (Hover) */}
                    <div className="bg-[#111] border border-gray-500 rounded-xl p-1.5 shadow-2xl flex items-center gap-3 opacity-0 translate-y-2 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-200 ease-out origin-top whitespace-nowrap">

                        {/* FIXED: Dynamic Drag Handle connected to HDWindowFrame */}
                        <div className={`${windowAPI?.dragHandleClass || "custom-window-drag"} cursor-move px-2 py-1 hover:bg-gray-800 rounded flex items-center gap-2 border-r border-gray-700 mr-1`}>
                            <span className="text-xs font-bold text-white">⋮⋮</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Grip</span>
                        </div>

                        {/* Navigation / Actions */}
                        <div className="flex bg-black rounded p-0.5 border border-gray-800">
                            {sidebarContent && (
                                <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="px-3 py-1 text-[9px] font-bold uppercase rounded text-gray-500 hover:text-white transition-colors">
                                    Menu
                                </button>
                            )}
                            {onHome && (
                                <button onClick={onHome} className="px-3 py-1 text-[9px] font-bold uppercase rounded text-gray-500 hover:text-white transition-colors border-l border-gray-800">
                                    Home
                                </button>
                            )}
                        </div>

                        {/* FIXED: Close Button calling the API */}
                        <button onClick={() => windowAPI?.close?.()} className="w-5 h-5 flex items-center justify-center rounded-full bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white transition-colors ml-2">
                            ×
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Application Container */}
            <div className="flex-1 flex overflow-hidden bg-[#050505] rounded-xl border border-gray-800/50 shadow-2xl mx-1 mb-1 relative isolate">

                {/* Sidebar Slot */}
                {isSidebarOpen && sidebarContent && (
                    <div className="w-64 bg-[#0a0a0a] border-r border-gray-800 flex flex-col h-full animate-in slide-in-from-left-5 duration-300">
                        {sidebarContent}
                    </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col h-full bg-[#050505] relative w-full min-w-0">

                    {/* Top Toolbar Slot */}
                    <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-[#0a0a0a] shrink-0 z-20">
                        <div className="flex items-center gap-3">
                            {/* If sidebar is closed, show a tiny hamburger menu to reopen it */}
                            {!isSidebarOpen && sidebarContent && (
                                <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white mr-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                </button>
                            )}
                            <h1 className="text-xl font-bold text-gray-200 truncate">{appName}</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            {headerActions}
                        </div>
                    </div>

                    {/* Content Slot */}
                    <div className="flex-1 overflow-y-auto custom-scroll p-6">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};