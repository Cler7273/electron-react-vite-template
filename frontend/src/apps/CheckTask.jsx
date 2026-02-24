import React, { useState, useEffect, useRef } from "react";
import "react-resizable/css/styles.css"; 

// --- MOCK API (Placeholders) ---
const API = {
    fetchLists: async () => [
        { id: "default", title: "Mes tâches", type: "system" },
        { id: "starred", title: "Suivies", type: "system" },
        { id: "l1", title: "Projet Alpha", type: "user" },
        { id: "l2", title: "Dev Log", type: "user" }
    ],
    fetchTasks: async (listId) => [], // Simulating empty state for the screenshot look
    createTask: async (text) => console.log("Creating:", text),
};

// --- ICONS (SVG Helpers) ---
const Icons = {
    Menu: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>,
    Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
    CheckCircle: () => <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>,
    Star: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
    List: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
    Dots: () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
};

const CheckTask = ({ windowAPI }) => {
    // --- STATE ---
    const [lists, setLists] = useState([]);
    const [activeListId, setActiveListId] = useState("default");
    const [tasks, setTasks] = useState([]); // Will be empty to show empty state
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [newTaskText, setNewTaskText] = useState("");
    
    // UI Logic
    const [activeMenuId, setActiveMenuId] = useState(null);

    // --- EFFECTS ---
    useEffect(() => {
        // Load initial lists
        API.fetchLists().then(setLists);
    }, []);

    useEffect(() => {
        // When switching lists, fetch tasks (mocked empty)
        API.fetchTasks(activeListId).then(setTasks);
    }, [activeListId]);

    // --- HEADER (The Floating Pill from TasksApp) ---
    const renderHeader = () => (
        <div className="absolute -top-2 left-0 right-0 h-14 z-50 flex justify-center items-start pointer-events-none">
            <div className="group pointer-events-auto mt-2 relative">
                {/* 1. Default State */}
                <div className="bg-[#1a1a1a] border border-gray-600 rounded-full px-4 py-1.5 shadow-lg flex items-center gap-2 transition-all duration-300 group-hover:opacity-0 absolute top-0 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="text-[10px] font-bold text-gray-300 tracking-widest uppercase">Google Tasks</span>
                </div>

                {/* 2. Expanded Interactable State */}
                <div className="bg-[#111] border border-gray-500 rounded-xl p-1.5 shadow-2xl flex items-center gap-3 opacity-0 translate-y-2 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-200 ease-out origin-top">
                    {/* Drag Handle */}
                    <div className={`${windowAPI?.dragHandleClass || "custom-window-drag"} cursor-move px-2 py-1 hover:bg-gray-800 rounded flex items-center gap-2 border-r border-gray-700 mr-1`}>
                        <span className="text-xs font-bold text-white">⋮⋮</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Grip</span>
                    </div>
                    
                    {/* App Controls */}
                    <div className="flex bg-black rounded p-0.5 border border-gray-800">
                         <button onClick={() => setSidebarOpen(!isSidebarOpen)} className={`px-3 py-1 text-[9px] font-bold uppercase rounded transition-colors ${isSidebarOpen ? "bg-blue-900 text-white" : "text-gray-500"}`}>
                            Sidebar
                        </button>
                    </div>

                    <button onClick={() => windowAPI?.close?.()} className="w-5 h-5 flex items-center justify-center rounded-full bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white transition-colors ml-2">
                        ×
                    </button>
                </div>
            </div>
        </div>
    );
    // --- SIDEBAR RENDERER ---
    const renderSidebar = () => {
        if (!isSidebarOpen) return null;

        const systemLists = lists.filter(l => l.type === 'system');
        const userLists = lists.filter(l => l.type === 'user');

        return (
            <div className="w-64 bg-[#0a0a0a] border-r border-gray-800 flex flex-col h-full pt-2">
                {/* Brand Header */}
                <div className="px-4 py-4 flex items-center gap-3">
                    <div className="text-gray-400 cursor-pointer hover:text-white transition-colors">
                        <Icons.Menu />
                    </div>
                    <div className="flex items-center gap-2">
                        <Icons.CheckCircle />
                        <span className="text-lg font-bold text-gray-200 tracking-tight">Tasks</span>
                    </div>
                </div>

                {/* Create Button (Pill shaped as in Screenshot) */}
                <div className="px-3 mb-6">
                    <button 
                        onClick={() => alert("Simulate Create List/Task")}
                        className="w-full flex items-center gap-3 bg-[#1a1a1a] hover:bg-[#222] border border-gray-700 text-gray-200 px-4 py-3 rounded-full shadow-lg transition-all group"
                    >
                        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-full p-1 text-white shadow-inner group-hover:scale-110 transition-transform">
                            <Icons.Plus />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider">Créer</span>
                    </button>
                </div>

                {/* Navigation Lists */}
                <div className="flex-1 overflow-y-auto custom-scroll px-2 space-y-6">
                    
                    {/* System Lists (My Tasks, Starred) */}
                    <div className="space-y-1">
                        {systemLists.map(list => {
                            const isActive = activeListId === list.id;
                            return (
                                <div 
                                    key={list.id}
                                    onClick={() => setActiveListId(list.id)}
                                    className={`
                                        flex items-center gap-4 px-4 py-2.5 rounded-r-full cursor-pointer transition-all text-sm font-medium
                                        ${isActive 
                                            ? "bg-blue-900/20 text-blue-400 border-l-2 border-blue-500" 
                                            : "text-gray-400 hover:bg-[#151515] hover:text-gray-200 border-l-2 border-transparent"}
                                    `}
                                >
                                    {list.id === 'starred' ? <Icons.Star /> : <Icons.CheckCircle />}
                                    <span>{list.title}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* User Lists Header */}
                    <div>
                        <div className="px-4 flex justify-between items-center mb-2 group cursor-pointer">
                            <span className="text-[10px] font-bold uppercase text-gray-500 tracking-widest group-hover:text-gray-300">Listes</span>
                            <span className="text-gray-600 group-hover:text-white transition-colors text-xs">^</span>
                        </div>
                        
                        <div className="space-y-1">
                            {userLists.map(list => (
                                <div 
                                    key={list.id}
                                    onClick={() => setActiveListId(list.id)}
                                    className={`
                                        flex items-center gap-4 px-4 py-2 rounded-r-full cursor-pointer transition-all text-sm
                                        ${activeListId === list.id 
                                            ? "bg-blue-900/20 text-blue-400 border-l-2 border-blue-500" 
                                            : "text-gray-400 hover:bg-[#151515] hover:text-gray-200 border-l-2 border-transparent"}
                                    `}
                                >
                                    <Icons.List />
                                    <span>{list.title}</span>
                                </div>
                            ))}
                            
                            {/* Create List Action */}
                            <button className="w-full flex items-center gap-4 px-4 py-2 text-gray-500 hover:text-white text-sm transition-colors">
                                <Icons.Plus />
                                <span>Créer une liste</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    // --- EMPTY STATE ILLUSTRATION (CSS Art) ---
    // Recreating the "Person sitting with a checkmark" vibe abstractly
    const renderEmptyState = () => (
        <div className="flex flex-col items-center justify-center h-[60%] animate-in fade-in zoom-in duration-500">
            {/* Illustration Container */}
            <div className="relative w-48 h-32 mb-6">
                {/* Abstract Laptop/Desk */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-700 rounded-full"></div>
                <div className="absolute bottom-4 left-10 w-24 h-16 bg-[#151515] border border-gray-700 rounded-lg transform -rotate-3 z-10"></div>
                
                {/* Abstract Person Head */}
                <div className="absolute top-0 right-16 w-8 h-8 bg-blue-900 rounded-full opacity-80 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                {/* Abstract Body */}
                <div className="absolute bottom-2 right-12 w-16 h-12 bg-blue-900/20 rounded-t-xl border border-blue-900/30"></div>
                
                {/* The "Checkmark" floating */}
                <div className="absolute top-2 left-6 w-10 h-10 bg-[#000] border border-green-500/50 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.2)] animate-bounce">
                     <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                
                {/* Decorative Elements */}
                <div className="absolute top-10 right-0 w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <div className="absolute bottom-10 left-0 w-1 h-1 bg-yellow-500 rounded-full"></div>
            </div>

            <h2 className="text-xl font-bold text-gray-200 mb-2">Aucune tâche pour l'instant</h2>
            <p className="text-sm text-gray-500 max-w-xs text-center leading-relaxed">
                Ajoutez vos tâches et faites-en le suivi dans Google Workspace
            </p>
        </div>
    );

    // --- MAIN CONTENT RENDERER ---
    const renderMainContent = () => {
        const activeListTitle = lists.find(l => l.id === activeListId)?.title || "Liste";

        return (
            <div className="flex-1 flex flex-col h-full bg-[#050505] relative">
                {/* Top Toolbar */}
                <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-[#0a0a0a]">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-gray-200">{activeListTitle}</h1>
                        {/* Loading Spinner simulation if fetching */}
                        {false && <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>}
                    </div>
                    
                    <button className="text-gray-500 hover:text-white p-2 rounded hover:bg-gray-800 transition-colors">
                        <Icons.Dots />
                    </button>
                </div>

                {/* Add Task Input Area */}
                <div className="px-6 py-4">
                    <div className="group relative">
                        <div className="flex items-center gap-3 text-gray-500 group-hover:text-blue-400 transition-colors cursor-text"
                             onClick={() => document.getElementById('task-input').focus()}>
                            <div className="w-5 h-5 flex items-center justify-center border-2 border-gray-700 rounded-full group-hover:border-blue-500 transition-colors">
                                <span className="text-lg font-bold leading-none mb-0.5">+</span>
                            </div>
                            <input 
                                id="task-input"
                                type="text"
                                value={newTaskText}
                                onChange={(e) => setNewTaskText(e.target.value)}
                                placeholder="Ajouter une tâche"
                                className="bg-transparent border-none outline-none text-sm text-gray-300 placeholder-gray-600 flex-1 font-medium h-10"
                            />
                        </div>
                        {/* Underline animation */}
                        <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-800 group-hover:bg-blue-900/50 transition-colors"></div>
                    </div>
                </div>

                {/* Content Area: Task List or Empty State */}
                <div className="flex-1 overflow-y-auto custom-scroll px-6 pb-6">
                    {tasks.length === 0 ? renderEmptyState() : (
                        <div className="space-y-2">
                            {tasks.map(t => (
                                <div key={t.id} className="text-white">Task Item Placeholder</div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };
    // --- FINAL ASSEMBLY ---
    return (
        <div className="h-full w-full flex flex-col pt-10 overflow-hidden relative select-none">
            {/* Header / Draggable Pill */}
            {renderHeader()}
            
            {/* Main Application Container */}
            <div className="flex-1 flex overflow-hidden bg-[#050505] rounded-xl border border-gray-800/50 shadow-2xl mx-1 mb-1 relative">
                
                {/* Left Sidebar */}
                {renderSidebar()}

                {/* Resizer Divider Visual (Optional) */}
                <div className="w-px bg-gray-800 h-full shadow-[0_0_10px_rgba(0,0,0,1)] z-10"></div>

                {/* Main Right Content */}
                {renderMainContent()}

                {/* Bottom Right Resize Visual Hint */}
                <div className="absolute bottom-1 right-1 pointer-events-none opacity-20 z-50">
                    <div className="w-3 h-3 border-r-2 border-b-2 border-white"></div>
                </div>
            </div>
        </div>
    );
};

export default CheckTask;