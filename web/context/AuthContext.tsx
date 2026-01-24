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

    // Session Timeout Logic
    useEffect(() => {
        if (!user) return;

        const TIMEOUT_DURATION = 10 * 60 * 1000; // 10 minutes
        const WARNING_CHECK_INTERVAL = 1000; // Check every second

        let lastActivity = Date.now();
        let intervalId: NodeJS.Timeout;

        const updateActivity = () => {
            lastActivity = Date.now();
            setTimeRemaining(600);
        };

        const checkInactivity = () => {
            const now = Date.now();
            const elapsed = now - lastActivity;
            const remaining = Math.max(0, Math.ceil((TIMEOUT_DURATION - elapsed) / 1000));

            setTimeRemaining(remaining);

            if (elapsed > TIMEOUT_DURATION) {
                auth.signOut();
                window.location.href = '/login'; // Force redirect
            }
        };

        // Activity listeners
        // Removed mousemove and scroll to allow timer to count down during passive reading
        // and prevent excessive re-renders.
        window.addEventListener('keydown', updateActivity);
        window.addEventListener('click', updateActivity);
        window.addEventListener('touchstart', updateActivity);

        intervalId = setInterval(checkInactivity, WARNING_CHECK_INTERVAL);

        return () => {
            window.removeEventListener('keydown', updateActivity);
            window.removeEventListener('click', updateActivity);
            window.removeEventListener('touchstart', updateActivity);
            clearInterval(intervalId);
        };
    }, [user]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setLoading(true); // Ensure loading is true while we fetch the role
                setUser(currentUser);
                try {
                    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setRole(data.role || "Member");
                        setGroupCode(data.groupCode || "DEFAULT");
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
