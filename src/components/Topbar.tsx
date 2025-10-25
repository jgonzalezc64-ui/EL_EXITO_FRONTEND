import { useAuth } from "../app/useAuth";

export default function Topbar() {
  const { user, logout } = useAuth();

  const roles = (user?.groups ?? []) as string[];

  return (
    <header
      style={{
        background: "linear-gradient(0deg, var(--topbar-bg), var(--brand-yellow))",
        borderBottom: "1px solid var(--border)",
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Marca */}
      <span style={{ fontWeight: 900, color: "var(--brand-red)", letterSpacing: 0.3 }}>
        El Éxito
      </span>

      {/* Lado derecho */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        {user ? (
          <>
            {/* Username */}
            <span style={{ fontWeight: 700 }}>{user.username}</span>

            {/* Roles como badges (si existieran) */}
            {roles.length > 0 && (
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                {roles.map((r) => (
                  <span
                    key={r}
                    title={r}
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#fff",
                      background:
                        r.toUpperCase() === "ADMIN"
                          ? "var(--brand-red)"
                          : r.toUpperCase() === "CAJA"
                          ? "#2563eb" // azul
                          : r.toUpperCase() === "COCINA"
                          ? "#0ea5e9" // celeste
                          : r.toUpperCase() === "MESERO"
                          ? "#16a34a" // verde
                          : "#9ca3af", // gris por defecto
                    }}
                  >
                    {r}
                  </span>
                ))}
              </div>
            )}

            {/* Salir */}
            <button className="btn btn-ghost" onClick={logout}>
              Salir
            </button>
          </>
        ) : (
          <span className="subtle">No autenticado</span>
        )}
      </div>
    </header>
  );
}
