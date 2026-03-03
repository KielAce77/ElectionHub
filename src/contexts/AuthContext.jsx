import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Implementation of a safeguard to ensure authentication requests do not indefinitely stall the user interface.
    const withTimeout = async (promise, label, ms = 8000) => {
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out`)), ms)
        );
        return Promise.race([promise, timeout]);
    };

    const fetchProfile = async (userId) => {
        // Monitor exactly when profile retrieval is triggered and identify the associated user.
        console.log('fetchProfile called with uid:', userId);

        if (!userId) {
            console.log('fetchProfile raw response: skipped (no userId provided)');
            console.log('Setting profile to:', null);
            return null;
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*, organizations(*)')
                .eq('id', userId)
                .single();

            // Verify the information returned from the database.
            console.log('fetchProfile raw response:', { data, error });

            if (error) {
                console.warn('Auth: Profile retrieval note:', error.code, error.message);
                console.log('Setting profile to:', null);
                return null;
            }

            // Prepare the profile information to be used within the application.
            console.log('Setting profile to:', data);
            return data;
        } catch (err) {
            console.error('Auth: Profile retrieval error:', err);
            console.log('Setting profile to:', null);
            return null;
        }
    };

    const ensureProfile = async (currentUser) => {
        if (!currentUser) return null;

        // 1. Attempt to retrieve any existing profile record.
        let profileData = await fetchProfile(currentUser.id);

        const metaOrgName = currentUser.user_metadata?.org_name;
        const metaFullName = currentUser.user_metadata?.full_name;
        const resolvedFullName = metaFullName || profileData?.full_name || 'Administrator';
        const fallbackOrgName = metaOrgName || 'Primary Organization';

        // 2. Automatically assign an organization to the profile if it is currently missing.
        if (profileData && !profileData.organization_id) {
            console.log('Auth: Repairing existing profile without organization_id...');
            try {
                const { data: org, error: orgError } = await supabase
                    .from('organizations')
                    .insert({ name: fallbackOrgName })
                    .select()
                    .single();

                if (orgError) throw orgError;

                const { data: patchedProfile, error: patchError } = await supabase
                    .from('profiles')
                    .update({
                        organization_id: org.id,
                        full_name: resolvedFullName
                    })
                    .eq('id', currentUser.id)
                    .select('*, organizations(*)')
                    .single();

                if (patchError) throw patchError;

                console.log('Auth: Profile repair successful.');
                return patchedProfile;
            } catch (err) {
                console.error('Auth: Profile repair failed:', err.message);
                return profileData;
            }
        }

        // 3. Automatically create a new profile if no existing record is found.
        if (!profileData) {
            console.log('Auth: Profile missing. Attempting auto-creation...');
            try {
                // 1. Create Organization
                const { data: org, error: orgError } = await supabase
                    .from('organizations')
                    .insert({ name: fallbackOrgName })
                    .select()
                    .single();

                if (orgError) throw orgError;

                // 2. Create Profile
                const { data: newProfile, error: profError } = await supabase
                    .from('profiles')
                    .insert({
                        id: currentUser.id,
                        email: currentUser.email,
                        full_name: resolvedFullName,
                        role: 'admin',
                        organization_id: org.id
                    })
                    .select('*, organizations(*)')
                    .single();

                if (profError) throw profError;
                console.log('Auth: Profile auto-created successfully.');
                return newProfile;
            } catch (err) {
                console.error('Auth: Profile recovery failed:', err.message);
                return null;
            }
        }

        // 4. Return whatever we have (may legitimately have no org_name metadata)
        return profileData;
    };

    useEffect(() => {
        let isMounted = true;

        // Synchronize local authentication state with the remote server.
        const syncAuth = async () => {
            try {
                const { data: { session } } = await withTimeout(
                    supabase.auth.getSession(),
                    'supabase.auth.getSession'
                );
                if (!isMounted) return;

                const currentUser = session?.user ?? null;
                setUser(currentUser);

                // OPTIMIZATION: Retrieve the profile from local storage for a faster initial load.
                if (currentUser && typeof window !== 'undefined') {
                    const cached = window.sessionStorage.getItem('electionhub-profile');
                    if (cached) {
                        try {
                            const p = JSON.parse(cached);
                            if (p && p.id === currentUser.id) {
                                setProfile(p);
                                // Unblock UI immediately if cache hits
                                setLoading(false);
                            }
                        } catch (e) { }
                    }
                }

                if (currentUser) {
                    const profileData = await ensureProfile(currentUser);
                    if (isMounted) {
                        setProfile(profileData);
                        if (typeof window !== 'undefined' && profileData) {
                            window.sessionStorage.setItem('electionhub-profile', JSON.stringify(profileData));
                        }
                    }
                } else {
                    if (isMounted) {
                        setProfile(null);
                        if (typeof window !== 'undefined') {
                            window.sessionStorage.removeItem('electionhub-profile');
                        }
                    }
                }
            } catch (err) {
                console.error('Auth: Sync failed:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        syncAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            // Trace every auth event coming from Supabase
            console.log('Auth event received:', event);
            if (!isMounted) return;

            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    // Only block on loading if we don't have a profile yet (state or cache)
                    if (!profile) setLoading(true);

                    const p = await ensureProfile(currentUser);
                    if (isMounted) {
                        setProfile(p);
                        if (typeof window !== 'undefined' && p) {
                            window.sessionStorage.setItem('electionhub-profile', JSON.stringify(p));
                        }
                        setLoading(false);
                    }
                } else {
                    if (isMounted) {
                        setProfile(null);
                        setLoading(false);
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
                if (typeof window !== 'undefined') {
                    window.sessionStorage.removeItem('electionhub-profile');
                }
                if (isMounted) setLoading(false);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // Log authentication status updates to ensure consistent state across the application.
    useEffect(() => {
        console.log('AuthContext state changed:', {
            user,
            profile,
            loading
        });
    }, [user, profile, loading]);

    const signUp = async (email, password, metadata) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: metadata }
        });
        if (error) throw error;
        return data;
    };

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    const signOut = async () => {
        // Promptly clear local user information to ensure an immediate transition.
        setUser(null);
        setProfile(null);
        try {
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem('electionhub-auth-token');
            }
        } catch (storageErr) {
            console.warn('Auth: Failed to clear local session storage', storageErr);
        }

        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error('Auth: signOut failed', err);
            // We already cleared local state; no need to rethrow.
        }
    };

    const resetPassword = async (email) => {
        // Send a recovery link to the user's email address.
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        return data;
    };

    const updatePassword = async (newPassword) => {
        // Apply the new password to the currently authenticated user session.
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });
        if (error) throw error;
        return data;
    };

    const verifyRecoveryOtp = async (email, token) => {
        // Verify the 6-digit code sent to the user's email.
        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'recovery'
        });
        if (error) throw error;
        return data;
    };

    const contextValue = {
        user,
        profile,
        authLoading: loading,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        verifyRecoveryOtp
    };
    console.log('AuthProvider context value:', contextValue);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
