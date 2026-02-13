"use client";

import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";

interface AuthContextType {
    user: User | null;
    role: string | null;
    groupCode: string | null;
    loading: boolean;
    timeRemaining?: number;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    groupCode: null,
    loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [groupCode, setGroupCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRemaining, setTimeRemaining] = useState<number>(600); // 10 minutes in seconds

    // Session Timeout Logic - Fixed 10-minute countdown no matter the activity
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
                    window.location.href = '/login';
                }
                return next;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setLoading(true); // Ensure loading is true while we fetch the role
                setUser(currentUser);
                try {
                    if (currentUser.emailVerified) {
                        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                        if (userDoc.exists()) {
                            const data = userDoc.data();
                            setRole(data.role || "Member");
                            setGroupCode(data.groupCode || "DEFAULT");
                        }
                    } else {
                        // Optional: clear role if unverified, though it's null by default
                        setRole(null);
                    }
                } catch (error) {
                    console.error("Error fetching user role:", error);
                }
                setLoading(false);
            } else {
                setUser(null);
                setRole(null);
                setGroupCode(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, role, groupCode, loading, timeRemaining }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
