import React, { useState, useMemo } from 'react';
import { useAppEngine } from '../hooks/useAppEngine';
import { UniversalAppShell, UaeInput, UaeListItem } from '../components/UniversalComponents'; // Ensure these match your paths

export const LinkSaverApp = ({ windowAPI, onHome }) => {
    // 1. Instantly spin up a backend table & API for this app

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [tempCategoryName, setTempCategoryName] = useState("");
    const [customCategories, setCustomCategories] = useState([]);

    const {
        data: links,
        isLoading,
        addEntity,
        removeEntity
    } = useAppEngine(
        'app_linksaver',
        { name: 'LinkSaver', themeColor: '#10b981' },
        'bookmark' // The entity type
    );

    // 2. App-specific state
    const [activeCategory, setActiveCategory] = useState("General");
    const [newLinkUrl, setNewLinkUrl] = useState("");

    // 3. Dynamically extract categories from the JSON data
    // Replace your existing `categories` useMemo block with this:
    const categories = useMemo(() => {
        // 1. Start with 'General' and any custom empty folders the user created
        const cats = new Set(["General", ...customCategories]);

        // 2. Add folders that currently have links in them
        links.forEach(link => {
            if (link.category) cats.add(link.category);
        });

        return Array.from(cats);
    }, [links, customCategories]); // <-- Note the updated dependency array

    // 4. Generate Sidebar Content
    const SidebarContent = (
        <div className="p-4 space-y-2">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Dossiers</h3>
            {categories.map(cat => {
                const count = links.filter(l => l.category === cat).length;
                return (
                    <div
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer transition-all text-sm
                            ${activeCategory === cat ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                    >
                        <span>📁 {cat}</span>
                        {count > 0 && <span className="text-[10px] bg-black px-1.5 py-0.5 rounded text-gray-500">{count}</span>}
                    </div>
                );
            })}

            <button
                onClick={() => setIsModalOpen(true)}
                className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-emerald-400 mt-4"
            >
                + Ajouter dossier
            </button>
        </div>
    );
    // 5. Handle adding a new link
    const handleAddLink = async (value) => {
        try {
            // value is the URL typed by the user
            let url = value;
            if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

            // Clean up the URL to use as a temporary title
            const title = new URL(url).hostname.replace('www.', '');

            // BOOM! Saved to database instantly.
            await addEntity({
                title: title,
                url: url,
                category: activeCategory
            });

            setNewLinkUrl(""); // Clear input
        } catch (e) {
            console.error("Invalid URL", e);
            alert("URL invalide !");
        }
    };
    // 6. Generate Main Content
    const MainContent = (
        <div className="max-w-3xl mx-auto">
            {/* Standard Input Component */}
            <UaeInput
                value={newLinkUrl}
                onChange={setNewLinkUrl}
                onSubmit={handleAddLink}
                placeholder={`Coller un lien dans "${activeCategory}"...`}
                icon="🔗"
            />

            {isLoading ? (
                <div className="text-center text-gray-500 mt-10 text-sm animate-pulse">Chargement des liens...</div>
            ) : (
                <div className="mt-6 space-y-2">
                    {links.filter(l => l.category === activeCategory).map(link => (
                        <UaeListItem
                            key={link.id}
                            title={link.title}
                            subtitle={link.url}
                            onClick={() => window.open(link.url, '_blank')}
                            actions={
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeEntity(link.id); }}
                                    className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                                >
                                    🗑️
                                </button>
                            }
                        />
                    ))}
                    {links.filter(l => l.category === activeCategory).length === 0 && (
                        <div className="text-center text-gray-600 mt-10 text-sm">
                            Aucun lien dans ce dossier.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
    // 7. Final Assembly
    return (
        <UniversalAppShell
            appName="LinkSaver"
            themeColor="#10b981"
            windowAPI={windowAPI}  // <--- Pass it down to the shell!
            onHome={onHome}        // <--- Pass it down so the Home button works!
            sidebarContent={SidebarContent}
            headerActions={
                <span className="text-xs text-emerald-500 font-mono bg-emerald-900/20 px-2 py-1 rounded">
                    {links.length} saved
                </span>
            }
        >
            {MainContent}
            {isModalOpen && (
                <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-[#111] border border-gray-700 rounded-xl p-6 w-full max-w-xs shadow-2xl">
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-4">Nouveau Dossier</h3>
                        <input
                            autoFocus
                            className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-white mb-4 outline-none focus:border-emerald-500"
                            value={tempCategoryName}
                            onChange={e => setTempCategoryName(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    const newCat = tempCategoryName.trim();
                                    if (newCat) {
                                        setCustomCategories(prev => [...prev, newCat]);
                                        setActiveCategory(newCat);
                                    }
                                    setIsModalOpen(false);
                                    setTempCategoryName(""); // Reset input
                                }
                            }}
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => { setIsModalOpen(false); setTempCategoryName(""); }} className="text-xs text-gray-500">Annuler</button>
                            <button
                                onClick={() => {
                                    const newCat = tempCategoryName.trim();
                                    if (newCat) {
                                        setCustomCategories(prev => [...prev, newCat]);
                                        setActiveCategory(newCat);
                                    }
                                    setIsModalOpen(false);
                                    setTempCategoryName(""); // Reset input
                                }}
                                className="bg-emerald-600 px-4 py-1 rounded text-xs font-bold text-white"
                            >
                                Créer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </UniversalAppShell>

    );
};