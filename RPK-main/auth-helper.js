/**
 * FleetConnect Auth Helper
 * Production-safe Supabase Auth integration for Client Authentication.
 */

// We use the esm.sh bundle for browser compatibility
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://rreqjjrmvytnwnsidmqi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyZXFqanJtdnl0bnduc2lkbXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MjAxMzcsImV4cCI6MjA5Mzk5NjEzN30.q4M3A6Dix3F_9Im2pw8DUIeE4C-INtUlvImRDM58MTA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const AuthHelper = {
    /**
     * Sign up a new customer
     */
    async signUp(email, password, fullName) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        });
        return { data, error };
    },

    /**
     * Sign in an existing customer
     */
    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        return { data, error };
    },

    /**
     * Sign out current user
     */
    async signOut() {
        const { error } = await supabase.auth.signOut();
        return { error };
    },

    /**
     * Get current session
     */
    async getSession() {
        const { data, error } = await supabase.auth.getSession();
        return { session: data.session, error };
    },

    /**
     * Get current user
     */
    async getUser() {
        const { data, error } = await supabase.auth.getUser();
        return { user: data.user, error };
    },

    /**
     * Password recovery
     */
    async resetPasswordForEmail(email) {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/reset-password.html',
        });
        return { data, error };
    },

    /**
     * Update password (used in reset flow)
     */
    async updatePassword(newPassword) {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });
        return { data, error };
    },

    /**
     * Redirect if not authenticated
     */
    async requireAuth(redirectUrl = 'index.html') {
        const { session } = await this.getSession();
        if (!session) {
            window.location.href = redirectUrl;
            return null;
        }
        return session;
    },

    /**
     * Redirect if already authenticated
     */
    async redirectIfAuth(redirectUrl = 'klantenportaal.html') {
        const { session } = await this.getSession();
        if (session) {
            window.location.href = redirectUrl;
            return session;
        }
        return null;
    }
};

window.AuthHelper = AuthHelper;
window.supabaseClient = supabase;
