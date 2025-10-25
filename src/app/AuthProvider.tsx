import { useEffect, useState } from "react";
import { Ctx, type AuthCtx } from "./auth-context";
import { login as doLogin, me as fetchMe } from "../services/seguridad/auth";
import { tokens } from "../utils/storage";
import type { Me } from "../types/seguridad";

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  setLoading(true);
  const hasToken = !!localStorage.getItem("access"); // tokens.access
  if (!hasToken) {
    setUser(null);
    setLoading(false);
    return; // ⬅️ no pidas /me/ si no hay token
  }

  (async () => {
    try {
      const u = await fetchMe();
      localStorage.setItem("__last_me_groups__", JSON.stringify(u?.groups ?? []));
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  })();
}, []);

  const login = async (username: string, password: string) => {
  setLoading(true);
  try {
    const res = await doLogin(username, password);
    tokens.set(res.access, res.refresh);
    const u = await fetchMe();
    localStorage.setItem("__last_me_groups__", JSON.stringify(u?.groups ?? []));
    setUser(u);
  } finally {
    setLoading(false);
  }
};

  const logout = () => {
    tokens.clear();
    setUser(null);
  };

  const hasRole: AuthCtx["hasRole"] = (role) => {
    const groups = (user?.groups ?? []).map((g) => g.toUpperCase());
    return (
    !!user?.is_superuser ||                // superusuario = todos los permisos
    groups.includes("ADMIN") ||            // grupo ADMIN = todos los permisos
    groups.includes(role.toUpperCase())    // rol específico
  );
  };

  return (
    <Ctx.Provider value={{ user, loading, login, logout, hasRole }}>
      {children}
    </Ctx.Provider>
  );
}

export default AuthProvider;
