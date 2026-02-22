import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export function useSupabaseData<T>(tableName: string, options: {
    select?: string,
    orderBy?: string,
    ascending?: boolean,
    limit?: number,
    realtime?: boolean
} = {}) {
    const { select = '*', orderBy = 'created_at', ascending = false, limit, realtime = false } = options;
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();

        let subscription: any;
        if (realtime) {
            subscription = supabase
                .channel(`public:${tableName}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
                    console.log(`Realtime update for ${tableName}:`, payload);
                    if (payload.eventType === 'INSERT') {
                        setData((prev) => [payload.new as T, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setData((prev) => prev.map((item: any) => (item.id === payload.new.id ? payload.new : item)));
                    } else if (payload.eventType === 'DELETE') {
                        setData((prev) => prev.filter((item: any) => item.id !== payload.old.id));
                    }
                })
                .subscribe();
        }

        return () => {
            if (subscription) {
                supabase.removeChannel(subscription);
            }
        };
    }, [tableName, select, orderBy, ascending, limit, realtime]);

    async function fetchData() {
        try {
            setLoading(true);
            let query = supabase
                .from(tableName)
                .select(select)
                .order(orderBy, { ascending });

            if (limit) {
                query = query.limit(limit);
            }

            const { data, error } = await query;

            if (error) throw error;
            setData(data as T[]);
        } catch (err: any) {
            console.error(`Error fetching ${tableName}:`, err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function addItem(item: any) {
        try {
            if (item.id === '') delete item.id;
            const { data: newItem, error } = await supabase
                .from(tableName)
                .insert([item])
                .select()
                .single();

            if (error) throw error;
            // State update is handled by realtime subscription if enabled
            if (!realtime) {
                setData((prev) => [newItem as T, ...prev]);
            }
            return newItem;
        } catch (err: any) {
            console.error(`Error adding to ${tableName}:`, err);
            throw err;
        }
    }

    async function updateItem(id: string | number, updates: any) {
        try {
            const { data: updatedItem, error } = await supabase
                .from(tableName)
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            // State update is handled by realtime subscription if enabled
            if (!realtime) {
                setData((prev) => prev.map((item: any) => (item.id === id ? updatedItem : item)));
            }
            return updatedItem;
        } catch (err: any) {
            console.error(`Error updating ${tableName}:`, err);
            throw err;
        }
    }

    async function deleteItem(id: string | number) {
        try {
            const { error } = await supabase
                .from(tableName)
                .delete()
                .eq('id', id);

            if (error) throw error;
            // State update is handled by realtime subscription if enabled
            if (!realtime) {
                setData((prev) => prev.filter((item: any) => item.id !== id));
            }
        } catch (err: any) {
            console.error(`Error deleting from ${tableName}:`, err);
            throw err;
        }
    }

    return { data, loading, error, refresh: fetchData, addItem, updateItem, deleteItem };
}
