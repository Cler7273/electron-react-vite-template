import React, { useState, useEffect, useRef } from "react";
import "react-resizable/css/styles.css";
// 1. Import at the top of your React file:
import { getJobLists, createJobList, deleteJobList, getJobs, createJob, updateJob, removeJob } from "../api";



// --- ICONS (SVG Helpers) ---
const Icons = {
    Menu: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>,
    Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
    CheckCircle: () => <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>,
    Star: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
    List: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
    Dots: () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>,
    Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
};

// B. Inside the CheckTask component, REPLACE the existing useState/useEffect block with this:
const CheckTask = ({ windowAPI, onHome }) => {
    // --- STATE MANAGEMENT ---
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [activeListId, setActiveListId] = useState("default");
    const [activeMenuId, setActiveMenuId] = useState(null);
    // 2. Replace "Data & Input State" and "EVENT HANDLERS" with this logic:
    // JOBS DATA (Independent from Jobs)
    const [lists, setLists] = useState([]); // Will load from DB
    const [jobs, setJobs] = useState([]);   // Will load from DB
    const [newJobText, setNewJobText] = useState("");


    // 1. Use the correct property: list_id (from your debug log)


    var activeList = lists.find(l => l.id === activeListId) || lists[0];
    // Filter jobs for the current view
    var currentJobs = jobs.filter(j => String(j.list_id) === String(activeListId));

    // 2. Use the correct property: is_done (from your debug log)
    // We use Number() because SQLite returns 0 or 1
    var pendingJobs = currentJobs.filter(j => Number(j.is_done) === 0);
    var completedJobs = currentJobs.filter(j => Number(j.is_done) === 1);

    const [modal, setModal] = useState({
        isOpen: false,
        title: "",
        value: "",
        action: null
    });
    const renderModal = () => {
        if (!modal.isOpen) return null;

        const confirm = () => {
            if (modal.value.trim()) modal.action(modal.value);
            setModal({ ...modal, isOpen: false });
        };

        return (
            <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200">
                <div className="bg-[#111] border border-gray-700 rounded-xl p-5 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{modal.title}</h3>
                    <input
                        autoFocus
                        type="text"
                        value={modal.value}
                        onChange={(e) => setModal({ ...modal, value: e.target.value })}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') confirm();
                            if (e.key === 'Escape') setModal({ ...modal, isOpen: false });
                        }}
                        className="w-full bg-[#050505] border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-900 outline-none text-sm mb-4 placeholder-gray-600"
                    />
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setModal({ ...modal, isOpen: false })}
                            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-white transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={confirm}
                            className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors shadow-lg shadow-indigo-900/20"
                        >
                            Valider
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    // Load Data on Mount

    // D. Add/Replace these list handlers:
    const handleCreateList = () => {
        setModal({
            isOpen: true,
            title: "Nouvelle Liste",
            value: "",
            action: async (name) => {
                const newList = {
                    id: `list-${Date.now()}`,
                    title: name,
                    type: 'user'
                };
                setLists(prev => [...prev, newList]);
                await createJobList(newList);
            }
        });
    };

    const handleRenameList = () => {
        const currentList = lists.find(l => l.id === activeListId);
        if (!currentList) return;

        setActiveMenuId(null); // Close the 3-dots menu
        setModal({
            isOpen: true,
            title: "Renommer la liste",
            value: currentList.title,
            action: async (newName) => {
                if (newName === currentList.title) return;
                setLists(prev => prev.map(l => l.id === activeListId ? { ...l, title: newName } : l));
                await updateJobList(activeListId, newName);
            }
        });
    };

    const handleDeleteList = async () => {
        if (activeListId === 'default' || activeListId === 'starred') {
            alert("Impossible de supprimer une liste système.");
            return;
        }
        if (confirm("Supprimer cette liste et tous ses jobs ?")) {
            const listToRemove = activeListId;
            setActiveListId('default'); // Jump back to default
            setLists(prev => prev.filter(l => l.id !== listToRemove)); // Optimistic
            setJobs(prev => prev.filter(j => j.list_id !== listToRemove)); // Cleanup UI
            await deleteJobList(listToRemove);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const fetchedLists = await getJobLists();
                if (fetchedLists.length > 0) setLists(fetchedLists);
                const fetchedJobs = await getJobs();
                setJobs(fetchedJobs);
            } catch (err) {
                console.error("Failed to load jobs", err);
            }
        };
        loadData();
    }, []);
    useEffect(() => {
        const initData = async () => {
            try {
                const [dbLists, dbJobs] = await Promise.all([getJobLists(), getJobs()]);
                // If DB is empty, use defaults from the SQL migration, otherwise use fetched
                setLists(dbLists.length ? dbLists : [{ id: "default", title: "Mes jobs", type: "system" }]);
                setJobs(dbJobs);
            } catch (e) {
                console.error("Job System Error:", e);
            }
        };
        initData();
    }, []);
    // --- STATE MANAGEMENT END ---

    // --- EVENT HANDLERS ---

    // Toggle Sidebar
    const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

    // Global Click to Close Dropdowns
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        if (activeMenuId) window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    }, [activeMenuId]);

    const handleMenuToggle = (e, menuId) => {
        e.stopPropagation(); // Prevent global click from closing immediately
        setActiveMenuId(activeMenuId === menuId ? null : menuId);
    };

    // C. Replace handleAddTask with this:
    const handleAddJob = async (e) => {
        if ((e.key === 'Enter' || e.type === 'click') && newJobText.trim()) {
            const tempId = "temp-" + Date.now();
            const jobPayload = {
                id: tempId,
                title: newJobText,
                list_id: String(activeListId)
            };

            // 1. Optimistic UI update
            setJobs(prev => [jobPayload, ...prev]);
            setNewJobText("");

            try {
                // 2. Wait for real DB object
                const savedJob = await createJob(jobPayload);
                // 3. Swap temp job with real job from DB (ensures persistence)
                setJobs(prev => prev.map(j => j.id === tempId ? savedJob : j));
            } catch (err) {
                console.error("Job Creation Failed", err);
                setJobs(prev => prev.filter(j => j.id !== tempId));
            }
        }
    };

    // E. Add/Replace job action handlers:
    const handleToggleJob = async (jobId) => {
        const job = jobs.find(j => j.id === jobId);
        if (!job) return;

        const newStatus = job.is_done ? 0 : 1;
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, is_done: newStatus } : j));
        await updateJob(jobId, { is_done: newStatus });
    };

    const handleDeleteJob = async (jobId) => {
        setJobs(prev => prev.filter(j => j.id !== jobId));
        await removeJob(jobId);
    };

    // EXPANSION: Star functionality (Moves job to 'starred' list or back to 'default')
    // Replace the Star handler to be type-safe
    const handleStarJob = async (e, jobId) => {
        e.stopPropagation();
        const job = jobs.find(j => j.id === jobId);
        if (!job) return;

        // Toggle between "starred" list and "default" list
        const targetListId = String(job.list_id) === 'starred' ? 'default' : 'starred';

        // UI Update
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, list_id: targetListId } : j));

        // Backend Update
        await updateJob(jobId, { list_id: targetListId });
    };



    const handleClearCompleted = async () => {
        if (confirm("Supprimer définitivement tous les jobs terminés de cette liste ?")) {
            // Optimistic
            setJobs(prev => prev.filter(j => !(j.list_id === activeListId && j.is_done)));
            await clearCompletedJobs(activeListId);
        }
        setActiveMenuId(null);
    };

    // --- RENDERERS ---

    // Filter JOBS (not tasks) based on activeListId
    // A. The Floating Pill Header (Controls & Drag)
    console.log(`Rendering List: ${activeListId} | Pending: ${pendingJobs.length} | Done: ${completedJobs.length}`);
    const renderHeader = () => (
        <div className="absolute -top-2 left-0 right-0 h-14 z-50 flex justify-center items-start pointer-events-none">
            <div className="group pointer-events-auto mt-2 relative">
                {/* Default State */}
                <div className="bg-[#1a1a1a] border border-gray-600 rounded-full px-4 py-1.5 shadow-lg flex items-center gap-2 transition-all duration-300 group-hover:opacity-0 absolute top-0 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    <span className="text-[10px] font-bold text-gray-300 tracking-widest uppercase">Google Jobs</span>
                </div>

                {/* Interactable State */}
                <div className="bg-[#111] border border-gray-500 rounded-xl p-1.5 shadow-2xl flex items-center gap-3 opacity-0 translate-y-2 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-200 ease-out origin-top">
                    {/* Drag Handle */}
                    <div className={`${windowAPI?.dragHandleClass || "custom-window-drag"} cursor-move px-2 py-1 hover:bg-gray-800 rounded flex items-center gap-2 border-r border-gray-700 mr-1`}>
                        <span className="text-xs font-bold text-white">⋮⋮</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Grip</span>
                    </div>

                    {/* App Controls */}
                    <div className="flex bg-black rounded p-0.5 border border-gray-800">
                        <button onClick={toggleSidebar} className={`px-3 py-1 text-[9px] font-bold uppercase rounded transition-colors ${isSidebarOpen ? "bg-blue-900 text-white" : "text-gray-500 hover:text-gray-300"}`}>
                            Sidebar
                        </button>
                        <button
                            onClick={() => {
                                console.log("--- JOB ENGINE DEBUG ---");
                                console.log("Active List ID:", activeListId);
                                console.log("Total Jobs in State:", jobs.length);
                                console.log("Raw Jobs Array:", jobs);
                                console.log("Raw Lists Array:", lists);
                                alert(`Jobs: ${jobs.length} | Check Console (F12) for JSON`);
                            }}
                            className="mr-2 px-2 py-1 text-[10px] font-mono border border-indigo-900 text-indigo-400 rounded hover:bg-indigo-900/20"
                        >
                            DEBUG_DATA
                        </button>
                    </div>
                    {onHome && (
                        <button
                            onClick={onHome}
                            className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors ml-2"
                        >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                        </button>
                    )}
                    <button onClick={() => windowAPI?.close?.()} className="w-5 h-5 flex items-center justify-center rounded-full bg-red-900/50 hover:bg-red-600 text-red-200 transition-colors ml-1">
                        ×
                    </button>
                    
                </div>
            </div>
        </div>
    );
    // --- SIDEBAR RENDERER ---
    // Replace the existing renderSidebar function with this:
    const renderSidebar = () => {
        if (!isSidebarOpen) return null;

        const systemLists = lists.filter(l => l.type === 'system');
        const userLists = lists.filter(l => l.type === 'user');

        // Helper to count active jobs per list
        const getCount = (listId) => jobs.filter(j => j.list_id === listId && !j.is_done).length;

        return (
            <div className="w-64 bg-[#0a0a0a] border-r border-gray-800 flex flex-col h-full pt-2 animate-in slide-in-from-left-5 duration-300">
                <div className="px-4 py-4 flex items-center gap-3">
                    <button onClick={toggleSidebar} className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded-full"><Icons.Menu /></button>
                    <span className="text-lg font-bold text-gray-200 tracking-tight">CheckTask</span>
                </div>

                <div className="px-3 mb-6">
                    <button onClick={() => document.getElementById('task-input')?.focus()} className="w-full flex items-center gap-3 bg-[#1a1a1a] hover:bg-[#222] border border-gray-700 text-gray-200 px-4 py-3 rounded-full shadow-lg transition-all group active:scale-95">
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full p-1 text-white shadow-inner"><Icons.Plus /></div>
                        <span className="text-xs font-bold uppercase tracking-wider">Nouveau Job</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scroll px-2 space-y-6">
                    <div className="space-y-1">
                        {systemLists.map(list => {
                            const isActive = activeListId === list.id;
                            const count = getCount(list.id);
                            return (
                                <div key={list.id} onClick={() => setActiveListId(list.id)} className={`flex items-center gap-4 px-4 py-2.5 rounded-r-full cursor-pointer transition-all text-sm font-medium select-none ${isActive ? "bg-indigo-900/20 text-indigo-400 border-l-2 border-indigo-500" : "text-gray-400 hover:bg-[#151515] hover:text-gray-200"}`}>
                                    {list.id === 'starred' ? <Icons.Star /> : <Icons.CheckCircle />}
                                    <span>{list.title}</span>
                                    {count > 0 && <span className="ml-auto text-[10px] bg-gray-800 px-1.5 rounded text-gray-300">{count}</span>}
                                </div>
                            );
                        })}
                    </div>

                    <div>
                        <div className="px-4 flex justify-between items-center mb-2 border-t border-gray-800 pt-4 mt-2">
                            <span className="text-[10px] font-bold uppercase text-gray-500 tracking-widest">Mes Listes</span>
                        </div>
                        <div className="space-y-1">
                            {userLists.map(list => {
                                const isActive = activeListId === list.id;
                                const count = getCount(list.id);
                                return (
                                    <div key={list.id} onClick={() => setActiveListId(list.id)} className={`flex items-center gap-4 px-4 py-2 rounded-r-full cursor-pointer transition-all text-sm select-none ${isActive ? "bg-indigo-900/20 text-indigo-400 border-l-2 border-indigo-500" : "text-gray-400 hover:bg-[#151515] hover:text-gray-200"}`}>
                                        <Icons.List />
                                        <span className="truncate flex-1">{list.title}</span>
                                        {count > 0 && <span className="text-[10px] text-gray-600">{count}</span>}
                                    </div>
                                );
                            })}
                            <button onClick={handleCreateList} className="w-full flex items-center gap-4 px-4 py-2 text-gray-500 hover:text-indigo-400 text-sm transition-colors mt-2">
                                <div className="p-0.5"><Icons.Plus /></div>
                                <span>Créer une liste</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    // --- EMPTY STATE ILLUSTRATION (Dark Mode "Relaxed" Vibe) ---
    const renderEmptyState = () => (
        <div className="flex flex-col items-center justify-center h-[60%] animate-in fade-in zoom-in duration-500 select-none pointer-events-none">
            {/* Illustration Container */}
            <div className="relative w-48 h-32 mb-6 opacity-80">
                {/* Abstract Desk */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-700 rounded-full"></div>
                {/* Screen */}
                <div className="absolute bottom-4 left-10 w-24 h-16 bg-[#111] border border-gray-600 rounded-lg transform -rotate-3 z-10 shadow-lg"></div>

                {/* Abstract Person Head */}
                <div className="absolute top-0 right-16 w-8 h-8 bg-blue-900 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                {/* Abstract Body */}
                <div className="absolute bottom-2 right-12 w-16 h-12 bg-blue-900/20 rounded-t-xl border border-blue-900/30"></div>

                {/* The "Checkmark" floating */}
                <div className="absolute top-2 left-6 w-10 h-10 bg-[#000] border border-green-500/50 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.2)] animate-bounce">
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
            </div>

            <h2 className="text-xl font-bold text-gray-200 mb-2 tracking-tight">Aucune tâche pour l'instant</h2>
            <p className="text-sm text-gray-500 max-w-xs text-center leading-relaxed">
                Ajoutez vos tâches et faites-en le suivi dans Votre application de gestion de tâches personnalisée. Restez organisé et productif avec style !
            </p>
        </div>
    );

    // --- MAIN CONTENT RENDERER ---
    const renderMainContent = () => {
        activeList = lists.find(l => l.id === activeListId) || lists[0];
        // Filter jobs for the current view
        currentJobs = jobs.filter(j => String(j.list_id) === String(activeListId));

        // 2. Use the correct property: is_done (from your debug log)
        // We use Number() because SQLite returns 0 or 1
        pendingJobs = currentJobs.filter(j => Number(j.is_done) === 0);
        completedJobs = currentJobs.filter(j => Number(j.is_done) === 1);

        return (
            <div className="flex-1 flex flex-col h-full bg-[#050505] relative w-full min-w-0">

                {/* 1. Top Toolbar */}
                <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-[#0a0a0a] shrink-0 z-20">
                    <div className="flex items-center gap-3">
                        {!isSidebarOpen && (
                            <button onClick={toggleSidebar} className="text-gray-400 hover:text-white mr-2">
                                <Icons.Menu />
                            </button>
                        )}
                        <h1 className="text-xl font-bold text-gray-200 truncate">{activeList?.title || "Aucune liste sélectionnée"}</h1>

                        {/* Progress Bar Addon */}
                        <div className="flex-1 mx-6 flex flex-col justify-center max-w-xs">
                            {(() => {
                                const listJobs = jobs.filter(j => j.list_id === activeListId);
                                const total = listJobs.length;
                                const done = listJobs.filter(j => j.is_done).length;
                                const percent = total === 0 ? 0 : Math.round((done / total) * 100);

                                if (total === 0) return null;

                                return (
                                    <div className="group cursor-help">
                                        <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span>PROGRESSION</span>
                                            <span>{percent}%</span>
                                        </div>
                                        <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ease-out ${percent === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* 3-Dots Menu */}
                    <div className="relative">
                        <button
                            onClick={(e) => handleMenuToggle(e, 'main-options')}
                            className={`p-2 rounded-full transition-colors ${activeMenuId === 'main-options' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-white hover:bg-gray-900'}`}
                        >
                            <Icons.Dots />
                        </button>

                        {/* Dropdown Menu */}
                        {activeMenuId === 'main-options' && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-[#111] border border-gray-700 rounded-lg shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                                {/* Rename (User lists only) */}
                                {activeList.type === 'user' && (
                                    <button onClick={handleRenameList} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2">
                                        <span className="opacity-50">✎</span> Renommer la liste
                                    </button>
                                )}

                                {/* Clear Completed */}
                                <button onClick={handleClearCompleted} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-2">
                                    <span className="opacity-50">✓</span> Nettoyer terminés
                                </button>

                                <div className="h-px bg-gray-800 my-1"></div>

                                {/* Delete (User lists only) */}
                                {activeList.type === 'user' && (
                                    <button onClick={handleDeleteList} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 flex items-center gap-2">
                                        <Icons.Trash /> Supprimer la liste
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Add Task Input Area */}
                <div className="px-6 py-4 shrink-0 bg-[#050505] z-10">
                    <div className="group relative bg-[#111] border border-gray-700 rounded-t-lg focus-within:bg-[#1a1a1a] focus-within:border-blue-500/50 transition-all shadow-lg">
                        <div className="flex items-center gap-3 p-3 cursor-text" onClick={() => document.getElementById('task-input').focus()}>
                            <div className="w-5 h-5 flex items-center justify-center border-2 border-gray-600 rounded-full group-hover:border-blue-500 transition-colors">
                                <span className="text-lg font-bold leading-none mb-0.5 text-blue-500 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">+</span>
                            </div>
                            <input
                                id="task-input"
                                type="text"
                                value={newJobText} // Updated variable
                                onChange={(e) => setNewJobText(e.target.value)} // Updated setter
                                onKeyDown={handleAddJob} // Updated handler
                                placeholder={`Ajouter un job à "${activeList?.title}"`}
                                autoComplete="off"
                                className="bg-transparent border-none outline-none text-sm text-gray-200 placeholder-gray-500 flex-1 font-medium h-6"
                            />
                        </div>
                        {/* Bottom Active Bar */}
                        <div className="h-0.5 w-0 bg-blue-500 mx-auto group-focus-within:w-full transition-all duration-300"></div>

                        {/* Helper Text (Optional) */}
                        {newJobText && (
                            <div className="absolute right-3 top-3 text-[10px] text-gray-500 font-mono uppercase border border-gray-700 px-1 rounded">
                                Enter ↵
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Task List Container (Start) */}
                <div className="flex-1 overflow-y-auto custom-scroll px-6 pb-6 space-y-4">
                    {/* Logic to render Empty State or List */}
                    {pendingJobs.length === 0 && completedJobs.length === 0 ? (
                        renderEmptyState()
                    ) : (
                        <div className="space-y-1 animate-in slide-in-from-bottom-2 duration-300">
                            {/* PENDING JOBS LIST */}
                            {pendingJobs.map(job => (
                                <div
                                    key={job.id}
                                    className="group flex items-center gap-3 p-3 bg-[#111] border border-gray-800 rounded-lg hover:border-blue-900/50 hover:bg-[#161616] transition-all shadow-sm cursor-default"
                                >
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleToggleJob(job.id); }}
                                        className="w-5 h-5 rounded-full border-2 border-gray-500 hover:border-blue-500 flex items-center justify-center transition-colors group-hover:scale-110"
                                    >
                                        <div className={`w-3 h-3 bg-blue-500 rounded-full transition-opacity ${job.is_done ? 'opacity-100' : 'opacity-0 group-hover:opacity-20'}`} />
                                    </button>

                                    <span className="flex-1 text-sm text-gray-200 font-medium truncate">{job.title}</span>

                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Star Button linked to handleStarJob */}
                                        <button
                                            onClick={(e) => handleStarJob(e, job.id)}
                                            className={`hover:text-yellow-400 ${job.list_id === 'starred' ? 'text-yellow-400' : 'text-gray-600'}`}
                                        >
                                            <Icons.Star />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteJob(job.id); }}
                                            className="text-gray-600 hover:text-red-400"
                                        >
                                            <Icons.Trash />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* COMPLETED JOBS ACCORDION */}
                            {completedJobs.length > 0 && (
                                <div className="pt-6">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="h-px bg-gray-800 flex-1"></div>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                            Terminées ({completedJobs.length})
                                        </span>
                                        <div className="h-px bg-gray-800 flex-1"></div>
                                    </div>

                                    <div className="space-y-1 opacity-60 hover:opacity-100 transition-opacity duration-300">
                                        {completedJobs.map(job => (
                                            <div key={job.id} className="group flex items-center gap-3 p-3 bg-black border border-gray-900 rounded-lg">
                                                <button
                                                    onClick={() => handleToggleJob(job.id)}
                                                    className="w-5 h-5 rounded-full bg-blue-900 border-2 border-blue-700 flex items-center justify-center text-white shadow-[0_0_10px_rgba(30,58,138,0.5)]"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                </button>
                                                <span className="flex-1 text-sm text-gray-500 line-through decoration-gray-700 decoration-2">{job.title}</span>
                                                <button
                                                    onClick={() => handleDeleteJob(job.id)}
                                                    className="text-gray-700 hover:text-red-900 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Icons.Trash />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // --- FINAL ASSEMBLY ---
    return (
        <div className="h-full w-full flex flex-col pt-10 overflow-hidden relative select-none font-sans text-gray-100">
            {/* Header / Draggable Pill */}
            {renderHeader()}

            {/* Main Application Container */}
            <div className="flex-1 flex overflow-hidden bg-[#050505] rounded-xl border border-gray-800/50 shadow-2xl mx-1 mb-1 relative isolate">

                {/* Left Sidebar */}
                {renderSidebar()}

                {/* Vertical Divider (Visual only, separates sidebar from main content) */}
                {isSidebarOpen && <div className="w-px bg-gray-800 h-full shadow-[0_0_10px_rgba(0,0,0,1)] z-10 hidden sm:block" />}

                {/* Main Right Content */}
                {renderMainContent()}

                {/* Bottom Right Resize Visual Hint */}
                <div className="absolute bottom-1 right-1 pointer-events-none opacity-30 z-50">
                    <div className="w-3 h-3 border-r-2 border-b-2 border-gray-500"></div>
                </div>

                {/* INSERT THIS LINE HERE: */}
                {renderModal()}
            </div>
        </div>
    );
};

export default CheckTask;