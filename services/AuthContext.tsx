import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { UserProfile } from './memberService';

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    role: string | null;
    loading: boolean;
    timeRemaining: number;
    resetInactivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    role: null,
    loading: true,
    timeRemaining: 600,
    resetInactivityTimer: () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRemaining, setTimeRemaining] = useState<number>(600);

    const resetInactivityTimer = () => {
        // No longer resetting as per user request for fixed countdown
    };

    useEffect(() => {
        if (!user) {
            setTimeRemaining(600);
            return;
        }

        const interval = setInterval(() => {
            setTimeRemaining((prev) => {
                const next = Math.max(0, prev - 1);
                if (next === 0) {
                    auth.signOut();
                }
                return next;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authenticatedUser) => {
            setUser(authenticatedUser);
            if (authenticatedUser) {
                try {
                    if (authenticatedUser.emailVerified) {
                        const userDoc = await getDoc(doc(db, 'users', authenticatedUser.uid));
                        if (userDoc.exists()) {
                            const profile = { uid: authenticatedUser.uid, ...userDoc.data() } as UserProfile;
                            setUserProfile(profile);
                            setRole(profile.role);
                        }
                    } else {
                        setUserProfile(null);
                        setRole(null);
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                }
            } else {
                setUserProfile(null);
                setRole(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    return (
        <AuthContext.Provider value={{ user, userProfile, role, loading, timeRemaining, resetInactivityTimer }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
