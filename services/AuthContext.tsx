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
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    role: null,
    loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authenticatedUser) => {
            setUser(authenticatedUser);
            if (authenticatedUser) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', authenticatedUser.uid));
                    if (userDoc.exists()) {
                        const profile = { uid: authenticatedUser.uid, ...userDoc.data() } as UserProfile;
                        setUserProfile(profile);
                        setRole(profile.role);
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
        <AuthContext.Provider value={{ user, userProfile, role, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
