import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    // Return a dummy client that will fail methods but not crash the app import
    supabaseInstance = {
        auth: {
            getSession: () => Promise.reject(new Error('Missing Supabase environment variables')),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            signInWithPassword: () => Promise.reject(new Error('Missing Supabase environment variables')),
            signUp: () => Promise.reject(new Error('Missing Supabase environment variables')),
            signOut: () => Promise.reject(new Error('Missing Supabase environment variables')),
        },
        from: () => ({
            select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
        }),
    } as any;
} else {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = supabaseInstance;
