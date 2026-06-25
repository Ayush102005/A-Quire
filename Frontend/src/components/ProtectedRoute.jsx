import { Navigate, useLocation } from 'react-router-dom';
import { getAccessToken, getCurrentUser } from '../services/api';

/**
 * Wraps a route so only authenticated users can access it.
 *
 * @param {string[]} [allowedRoles] - If provided, only users with one of these
 *   roles can access the route. Others are redirected to their own dashboard.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();
  const token = getAccessToken();
  const user  = getCurrentUser();

  // Not logged in → go to login, remember where they were trying to go
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but wrong role → redirect to their own dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const fallback =
      user.role === 'admin'       ? '/admin'      :
      user.role === 'instructor'  ? '/instructor' :
      '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return children;
}
