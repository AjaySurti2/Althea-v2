import { supabase } from './supabase';
import { User, Session } from '@supabase/supabase-js';

/**
 * Retrieves the current authenticated user.
 * Throws an error if the user is not authenticated.
 */
export async function getCurrentUser(): Promise<User> {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
        throw new Error(`Authentication error: ${error.message}`);
    }

    if (!user) {
        throw new Error('User not authenticated');
    }

    return user;
}

/**
 * Retrieves the current session.
 * Returns null if no session exists.
 */
export async function getSession(): Promise<Session | null> {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
        console.error('Error getting session:', error);
        return null;
    }

    return session;
}

/**
 * Checks if the user is authenticated.
 */
export async function isAuthenticated(): Promise<boolean> {
    try {
        await getCurrentUser();
        return true;
    } catch {
        return false;
    }
}
