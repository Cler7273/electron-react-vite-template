import React, { useState } from 'react';
import CheckTask from './CheckTask'; // Adjust path
import { LinkSaverApp } from './apps/LinkSaverApp'; // Adjust path
import { UaeLauncher } from './apps/UaeLauncher';

// Local React Component Registry
const APPS_REGISTRY = [
    { id: 'checktask', name: 'CheckTask', icon: '✅', color: '#3b82f6', component: CheckTask },
    { id: 'linksaver', name: 'LinkSaver', icon: '🔗', color: '#10b981', component: LinkSaverApp },
    // Want a new app tomorrow? Just add ONE line here!
    // { id: 'notes', name: 'Notes', icon: '📝', color: '#f59e0b', component: NotesApp }
];

export const Desktop = ({ windowAPI }) => {
    // null = show Launcher. string = show specific App.
    const [activeAppId, setActiveAppId] = useState(null);

    // If an app is selected, render it
    if (activeAppId) {
        const AppTarget = APPS_REGISTRY.find(a => a.id === activeAppId);
        if (!AppTarget) return null;
        
        const AppComponent = AppTarget.component;
        return (
            <AppComponent 
                windowAPI={windowAPI} 
                onHome={() => setActiveAppId(null)} // Pass the exit function
            />
        );
    }

    // Otherwise, render the Desktop Launcher
    return (
        <UaeLauncher 
            apps={APPS_REGISTRY} 
            onLaunch={(id) => setActiveAppId(id)}
            windowAPI={windowAPI}
        />
    );
};