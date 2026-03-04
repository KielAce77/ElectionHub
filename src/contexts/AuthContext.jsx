import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const withTimeout = async (promise, label, ms = 8000) => {
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out`)), ms)
        );
        return Promise.race([promise, timeout]);
    };

    const fetchProfile = async (userId) => {
        if (!userId) return null;

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*, organizations(*)')
                .eq('id', userId)
                .single();

            if (error) {
                console.warn('Auth: Profile retrieval note:', error.code, error.message);
                return null;
            }
            return data;
        } catch (err) {
            console.error('Auth: Profile retrieval error:', err);
            return null;
        }
    };

    const ensureProfile = async (currentUser) => {
        if (!currentUser) return null;

        let profileData = await fetchProfile(currentUser.id);
        const metaOrgName = currentUser.user_metadata?.org_name;
        const metaFullName = currentUser.user_metadata?.full_name;
        const resolvedFullName = metaFullName || profileData?.full_name || 'Administrator';
        const fallbackOrgName = metaOrgName || 'Primary Organization';

        if (profileData && !profileData.organization_id) {
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
                return patchedProfile;
            } catch (err) {
                console.error('Auth: Profile repair failed:', err.message);
                return profileData;
            }
        }

        if (!profileData) {
            try {
                const { data: org, error: orgError } = await supabase
                    .from('organizations')
                    .insert({ name: fallbackOrgName })
                    .select()
                    .single();

                if (orgError) throw orgError;

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
                return newProfile;
            } catch (err) {
                console.error('Auth: Profile recovery failed:', err.message);
                return null;
            }
        }
        return profileData;
    };

    useEffect(() => {
        let isMounted = true;

        const syncAuth = async () => {
            try {
                const { data: { session }, error: sessionError } = await withTimeout(
                    supabase.auth.getSession(),
                    'supabase.auth.getSession',
                    5000
                );

                if (sessionError) throw sessionError;
                if (!isMounted) return;

                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    const cached = typeof window !== 'undefined' ? window.sessionStorage.getItem('electionhub-profile') : null;
                    if (cached) {
                        try {
                            const p = JSON.parse(cached);
                            if (p && p.id === currentUser.id) {
                                setProfile(p);
                                setLoading(false);
                            }
                        } catch (e) { }
                    }

                    const profileData = await ensureProfile(currentUser);
                    if (isMounted) {
                        setProfile(profileData);
                        if (profileData && typeof window !== 'undefined') {
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
                console.warn('Auth: Initial sync note:', err.message);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        syncAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return;

            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    const needsProfileFetch = !profile || profile.id !== currentUser.id;
                    if (needsProfileFetch) {
                        ensureProfile(currentUser).then(p => {
                            if (isMounted) {
                                setProfile(p);
                                if (p && typeof window !== 'undefined') {
                                    window.sessionStorage.setItem('electionhub-profile', JSON.stringify(p));
                                }
                                setLoading(false);
                            }
                        }).catch(() => {
                            if (isMounted) setLoading(false);
                        });
                    } else {
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
        setUser(null);
        setProfile(null);
        try {
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem('electionhub-auth-token');
                window.sessionStorage.removeItem('electionhub-profile');
            }
        } catch (storageErr) {
            console.warn('Auth: Failed to clear local session storage', storageErr);
        }

        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error('Auth: signOut failed', err);
        }
    };

    const resetPassword = async (email) => {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        return data;
    };

    const updatePassword = async (newPassword) => {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });
        if (error) throw error;
        return data;
    };

    const verifyRecoveryOtp = async (email, token) => {
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

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
