import React, { useState } from 'react';

// A standardized layout for ANY new application
export const UniversalAppShell = ({ 
    appName, 
    themeColor = "#4f46e5", 
    windowAPI, 
    sidebarContent, 
    headerActions, 
    children 
}) => {
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="h-full w-full flex flex-col pt-10 overflow-hidden relative select-none font-sans text-gray-100 bg-black">
            
            {/* Draggable Header Pill */}
            <div className="absolute -top-2 left-0 right-0 h-14 z-50 flex justify-center items-start pointer-events-none">
                <div className="group pointer-events-auto mt-2 relative">
                    <div className="bg-[#1a1a1a] border border-gray-600 rounded-full px-4 py-1.5 shadow-lg flex items-center gap-2 transition-all duration-300 group-hover:opacity-0 absolute top-0 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: themeColor }}></span>
                        <span className="text-[10px] font-bold text-gray-300 tracking-widest uppercase">{appName}</span>
                    </div>
                    
                    <div className="bg-[#111] border border-gray-500 rounded-xl p-1.5 shadow-2xl flex items-center gap-3 opacity-0 translate-y-2 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-200 ease-out origin-top">
                        <div className="custom-window-drag cursor-move px-2 py-1 hover:bg-gray-800 rounded flex items-center gap-2 border-r border-gray-700 mr-1">
                            <span className="text-xs font-bold text-white">⋮⋮</span>
                        </div>
                        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="px-3 py-1 text-[9px] font-bold uppercase rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                            Menu
                        </button>
                        <button onClick={() => windowAPI?.close?.()} className="w-5 h-5 flex items-center justify-center rounded-full bg-red-900/50 hover:bg-red-600 text-red-200 transition-colors ml-2">×</button>
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