import { useState, useEffect, useCallback } from 'react';
import { registerUaeApp, getUaeEntities, createUaeEntity, updateUaeEntity, deleteUaeEntity } from '../api';

export function useAppEngine(appId, appConfig, entityType) {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // 1. Initialize App & Fetch Data
    useEffect(() => {
        let isMounted = true;
        const init = async () => {
            try {
                setIsLoading(true);
                // Auto-register app in the backend registry (idempotent)
                await registerUaeApp({ id: appId, name: appConfig.name, theme_color: appConfig.themeColor });

                // Fetch the specific entity type for this app
                const entities = await getUaeEntities(appId, entityType);
                if (isMounted) {
                    setData(entities);
                    setError(null);
                }
            } catch (err) {
                if (isMounted) setError(err.message);
                console.error(`[UAE] Init Error for ${appId}:`, err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        init();
        return () => { isMounted = false; };
    }, [appId, entityType]);
    // In useAppEngine.js, make sure you await registration fully before fetching
    // Insert inside useAppEngine, before the return:

    // CREATE
    const addEntity = useCallback(async (payload) => {
        const tempId = `temp_${Date.now()}`;
        const optimisticEntity = { id: tempId, app_id: appId, entity_type: entityType, ...payload, created_at: Date.now() };

        setData(prev => [optimisticEntity, ...prev]); // Optimistic Update

        try {
            const saved = await createUaeEntity(appId, entityType, payload);
            // Replace temp ID with real DB ID & merged data
            setData(prev => prev.map(item => item.id === tempId ? { ...item, ...saved, ...saved.data } : item));
            return saved;
        } catch (err) {
            setData(prev => prev.filter(item => item.id !== tempId)); // Rollback
            throw err;
        }
    }, [appId, entityType]);

    // UPDATE
    const updateEntity = useCallback(async (id, payload) => {
        // Optimistic Update
        setData(prev => prev.map(item => item.id === id ? { ...item, ...payload, updated_at: Date.now() } : item));
        try {
            await updateUaeEntity(id, payload);
        } catch (err) {
            // In a production app, we'd rollback here using a ref of the previous state
            console.error("[UAE] Update Failed", err);
            throw err;
        }
    }, []);

    // DELETE
    const removeEntity = useCallback(async (id) => {
        setData(prev => prev.filter(item => item.id !== id)); // Optimistic Update
        try {
            await deleteUaeEntity(id);
        } catch (err) {
            console.error("[UAE] Delete Failed", err);
            throw err;
        }
    }, []);

    // Update the return statement to expose everything:
    return { data, isLoading, error, addEntity, updateEntity, removeEntity };
}