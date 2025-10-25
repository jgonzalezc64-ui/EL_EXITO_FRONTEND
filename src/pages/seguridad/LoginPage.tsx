import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/useAuth";

export default function LoginPage() {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();
  const { login, user } = useAuth();

  // Si ya está logueado y abre /login, redirige a categorías
  useEffect(() => {
    if (user) {
      nav("/catalogos/categorias", { replace: true });
    }
  }, [user, nav]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await login(username, password);
      // home por defecto al iniciar sesión (puedes cambiarlo por lógica de rol después)
      nav("/catalogos/categorias", { replace: true });
    } catch {
      setErr("Credenciales inválidas");
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100vw",
        display: "grid",
        placeItems: "center",
        margin: 0,
        background: `radial-gradient(1200px 600px at -10% -20%, #fff7d6 0%, transparent 60%),
                     radial-gradient(1000px 500px at 110% 120%, #ffe9b0 0%, transparent 60%),
                     var(--bg)`,
      }}
    >
      <div className="ui-card" style={{ width: 360 }}>
        {/* Logo y título */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <img
            src="/logo_el_exito.jpg" // si el archivo tiene espacio: /logo_el%20_exito.jpg
            alt="El Éxito"
            style={{
              width: 100,
              height: 100,
              objectFit: "contain",
              filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))",
              borderRadius: 12,
              background: "#fff",
            }}
          />
          <h1
            className="h1"
            style={{ color: "var(--brand-red)", letterSpacing: ".5px" }}
          >
            El Éxito
          </h1>
          <div className="subtle">Accede con tu usuario y contraseña</div>
        </div>

        {/* Formulario (inputs más angostos que el card) */}
        <form
          onSubmit={onSubmit}
          style={{
            display: "grid",
            gap: 12,
            width: 300,
            margin: "0 auto",
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
              Usuario
            </label>
            <input
              className="input"
              placeholder="Usuario"
              value={username}
              onChange={(e) => setU(e.target.value)}
              tabIndex={1}
              autoComplete="username"
              style={{
                height: 36,
                fontSize: 14,
                color: "var(--brand-black)",
                background: "#fff",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
              Contraseña
            </label>
            <input
              className="input"
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setP(e.target.value)}
              tabIndex={2}
              autoComplete="current-password"
              style={{
                height: 36,
                fontSize: 14,
                color: "var(--brand-black)",
                background: "#fff",
              }}
            />
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            tabIndex={3}
            style={{ marginTop: 8, height: 38 }}
          >
            Entrar
          </button>
          {err && (
            <p style={{ color: "var(--brand-red)", margin: 0 }}>{err}</p>
          )}
        </form>
      </div>
    </div>
  );
}
