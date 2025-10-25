import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./useAuth";

export function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 16 }}>Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RequireRole({ role }: { role: string }) {
  const { user, loading, hasRole } = useAuth();
  if (loading) return <div style={{ padding: 16 }}>Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasRole(role)) return <Navigate to="/403" replace />;
  return <Outlet />;
}
