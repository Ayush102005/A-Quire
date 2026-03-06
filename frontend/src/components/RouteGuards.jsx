import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute — redirect unauthenticated users to /login
 */
export function ProtectedRoute({ children }) {
    const { currentUser, loading } = useAuth();
    if (loading) return null;  // wait silently
    return currentUser ? children : <Navigate to="/login" replace />;
}

/**
 * PublicRoute — redirect already-authenticated users to /dashboard
 */
export function PublicRoute({ children }) {
    const { currentUser, loading } = useAuth();
    if (loading) return null;
    return currentUser ? <Navigate to="/dashboard" replace /> : children;
}
