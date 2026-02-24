import React from 'react';
export const UaeLauncher = ({ apps, onLaunch, windowAPI }) => {
    return (
        <div className="h-full w-full bg-black flex flex-col items-center justify-center relative overflow-hidden select-none">
            {/* Background Ambient Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-900/20 blur-[100px] rounded-full pointer-events-none"></div>

            {/* THE STANDARD DRAGGABLE PILL */}
            <div className="absolute -top-2 left-0 right-0 h-14 z-50 flex justify-center items-start pointer-events-none">
                <div className="group pointer-events-auto mt-2 relative">
                    {/* Default State */}
                    <div className="bg-[#1a1a1a] border border-gray-600 rounded-full px-4 py-1.5 shadow-lg flex items-center gap-2 transition-all duration-300 group-hover:opacity-0 absolute top-0 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                        <span className="text-[10px] font-bold text-gray-300 tracking-widest uppercase">Workspace Hub</span>
                    </div>

                    {/* Expanded State */}
                    <div className="bg-[#111] border border-gray-500 rounded-xl p-1.5 shadow-2xl flex items-center gap-3 opacity-0 translate-y-2 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-200 ease-out origin-top whitespace-nowrap">
                        <div className={`${windowAPI?.dragHandleClass || "custom-window-drag"} cursor-move px-2 py-1 hover:bg-gray-800 rounded flex items-center gap-2 border-r border-gray-700 mr-1`}>
                            <span className="text-xs font-bold text-white">⋮⋮</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Grip</span>
                        </div>
                        <button onClick={() => windowAPI?.close?.()} className="w-5 h-5 flex items-center justify-center rounded-full bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white transition-colors ml-2">
                            ×
                        </button>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500 tracking-tighter mb-12 z-10 mt-10">
                Workspace OS
            </h1>

            {/* App Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 z-10">
                {apps.map(app => (
                    <div key={app.id} onClick={() => onLaunch(app.id)} className="group flex flex-col items-center gap-3 cursor-pointer">
                        <div className="w-20 h-20 rounded-2xl bg-[#111] border border-gray-800 flex items-center justify-center shadow-2xl group-hover:scale-105 transition-all duration-300 relative overflow-hidden">
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300" style={{ backgroundColor: app.color }}></div>
                            <span className="text-3xl filter drop-shadow-lg group-hover:scale-110 transition-transform">{app.icon}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors tracking-wide">{app.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};