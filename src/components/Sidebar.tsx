// frontend/src/components/Sidebar.tsx
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../app/useAuth";
import { useMemo, useState, useEffect } from "react";

type Item = {
  label: string;
  to: string;
  roles?: string[];           // visible solo si usuario tiene alguno de estos roles
};

type Section = {
  label: string;
  base?: string;              // prefijo para detectar activo (opcional)
  roles?: string[];           // rol requerido para ver la sección (opcional)
  items: Item[];
};

/* --------------------------- Definición de secciones --------------------------- */
/* Mantiene el ORDEN: Catálogo → Menús → Pedidos  y agrega KDS y Pagos como MÓDULOS APARTE */
const SECTIONS: Section[] = [
  /* --------------------------- Catálogo --------------------------- */
  {
    label: "Catálogo",
    base: "/catalogos",
    items: [
      { label: "Categorías", to: "/catalogos/categorias" },
      { label: "Productos", to: "/catalogos/productos" },
      { label: "Grupos", to: "/catalogos/modificador-grupos" },
      { label: "Modificadores", to: "/catalogos/modificadores" },
      { label: "Producto ↔ Modificadores", to: "/catalogos/producto-modificadores" },
    ],
  },

  /* ------------------------------ Menús ------------------------------ */
  {
    label: "Menús",
    base: "/menus",
    items: [
      { label: "Menús", to: "/menus/menus" },
      { label: "Secciones", to: "/menus/secciones" },
      { label: "Items", to: "/menus/items" },
    ],
  },

  /* ------------------------------ Pedidos ------------------------------ */
  {
    label: "Pedidos",
    base: "/pedidos",
    roles: ["ADMIN", "MESERO", "CAJA"],
    items: [
      { label: "Tiendas", to: "/pedidos/tiendas" },
      { label: "Órdenes", to: "/pedidos/ordenes" },
      { label: "Mesas", to: "/pedidos/mesas", roles: ["ADMIN"] },
      // ⚠️ Pagos ya NO va aquí
    ],
  },

  /* ------------------------------ Pagos (módulo aparte) ------------------------------ */
  {
    label: "Pagos",
    base: "/pagos",
    roles: ["ADMIN", "CAJA"],
    items: [
      { label: "Pagos", to: "/pagos" },
    ],
  },

  /* ------------------------------ KDS (módulo aparte) ------------------------------ */
  {
    label: "KDS",
    base: "/kds",
    roles: ["COCINA"], // sólo rol cocina
    items: [{ label: "KDS", to: "/kds" }],
  },
];

/* --------------------------------- Sidebar --------------------------------- */
export default function Sidebar() {
  const { hasRole, loading, user } = useAuth();
  const { pathname } = useLocation();

  // Calcula visibilidad por rol
  const visibleSections = useMemo(() => {
    return SECTIONS
      .filter((sec) => !sec.roles || sec.roles.some((r) => hasRole(r)))
      .map((sec) => ({
        ...sec,
        items: sec.items.filter((it) => !it.roles || it.roles.some((r) => hasRole(r))),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [hasRole]);

  // Estado de colapsado/expandido por sección
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // Abre automáticamente la sección cuyo base coincide con la ruta actual
  useEffect(() => {
    const next: Record<string, boolean> = { ...open };
    visibleSections.forEach((sec) => {
      const active = sec.base
        ? pathname.startsWith(sec.base)
        : sec.items.some((i) => pathname.startsWith(i.to));
      if (active) next[sec.label] = true;
    });
    setOpen(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, visibleSections.length]);

  if (loading) {
    return (
      <aside
        style={{
          width: 220,
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <div style={{ padding: 16 }}>Cargando…</div>
      </aside>
    );
  }

  if (!user) return null;

  return (
    <aside
      style={{
        width: 220,
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Header con logo */}
      <div style={{ padding: "16px 16px 8px", display: "flex", alignItems: "center", gap: 10 }}>
        <img
          src="/logo_el_exito.jpg"
          alt="El Éxito"
          style={{ width: 44, height: 44, objectFit: "contain" }}
        />
        <div style={{ fontWeight: 800, color: "var(--brand-red)", lineHeight: 1 }}>
          El Éxito
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Refacciones</div>
        </div>
      </div>

      {/* Navegación por secciones */}
      <nav style={{ padding: "8px 8px 16px", display: "grid", gap: 8 }}>
        {visibleSections.map((sec) => {
          const isOpen = open[sec.label] ?? true;
          const toggle = () => setOpen((s) => ({ ...s, [sec.label]: !isOpen }));

          return (
            <div key={sec.label} style={{ display: "grid", gap: 6 }}>
              {/* Encabezado de sección */}
              <button
                type="button"
                onClick={toggle}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  padding: "8px 10px",
                  borderRadius: 10,
                  color: "var(--text)",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                <span>{sec.label}</span>
                <span style={{ opacity: 0.6 }}>{isOpen ? "▾" : "▸"}</span>
              </button>

              {/* Items */}
              {isOpen && (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 4 }}>
                  {sec.items.map((it) => {
                    const active = pathname.startsWith(it.to);
                    return (
                      <li key={it.to}>
                        <Link
                          to={it.to}
                          style={{
                            display: "block",
                            padding: "8px 12px 8px 18px",
                            borderRadius: 10,
                            textDecoration: "none",
                            fontWeight: 600,
                            color: active ? "var(--brand-white)" : "var(--text)",
                            background: active ? "var(--brand-red)" : "transparent",
                          }}
                        >
                          {it.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
