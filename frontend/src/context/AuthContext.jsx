import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getSession, getCurrentUserInfo, cognitoSignOut, userPool } from "../cognito";

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);  // { uid, email, name, username }
    const [loading, setLoading] = useState(true);

    // Check Cognito session on mount and whenever the pool user changes
    const refreshSession = useCallback(async () => {
        try {
            const info = await getCurrentUserInfo();
            setCurrentUser(info);  // null if not signed in
        } catch (error) {
            console.error("[AuthContext] Error getting user info:", error);
            setCurrentUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshSession();

        // Poll every 5 minutes to refresh session silently
        const interval = setInterval(refreshSession, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [refreshSession]);

    const signOut = useCallback(() => {
        cognitoSignOut();
        setCurrentUser(null);
    }, []);

    const value = {
        currentUser,
        userData: currentUser,    // alias — keeps compatibility with pages using userData
        loading,
        refreshSession,
        signOut,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
