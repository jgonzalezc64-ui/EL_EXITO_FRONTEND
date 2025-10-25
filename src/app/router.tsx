// frontend/src/router/index.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";

/* Core/Layout/Guards */
import Layout from "../components/Layout";
import LoginPage from "../pages/seguridad/LoginPage";
import { RequireAuth } from "./guards";
import { useAuth } from "../app/useAuth";

/* --------------------------- Catálogos --------------------------- */
import CategoriasPage from "../pages/catalogos/CategoriasPage";
import ProductosPage from "../pages/catalogos/ProductosPage";
import ModificadorGruposPage from "../pages/catalogos/ModificadorGruposPage";
import ModificadoresPage from "../pages/catalogos/ModificadoresPage";
import ProductoModificadoresPage from "../pages/catalogos/ProductoModificadoresPage";

/* ------------------------------ Menús ------------------------------ */
import MenusPage from "../pages/menus/MenusPage";
import MenuSeccionesPage from "../pages/menus/MenuSeccionesPage";
import MenuItemsPage from "../pages/menus/MenuItemsPage";

/* ------------------------------ Pedidos ------------------------------ */
import TiendasPage from "../pages/pedidos/TiendasPage";
import PedidosPage from "../pages/pedidos/PedidoPage";
import MesasPage from "../pages/pedidos/MesasPage";

/* ------------------------------ KDS (módulo aparte) ------------------------------ */
import KdsPage from "../pages/kds";

/* ------------------------------ Pagos ------------------------------ */
import PagoPage from "../pages/pagos/PagoPage";
import PagosListPage from "../pages/pagos/PagosListPage";

/* -------- Guard por roles -------- */
function RequireRoles({
  roles,
  children,
}: {
  roles: string[];
  children: ReactNode;
}) {
  const { hasRole } = useAuth();
  const ok = roles.some((r) => hasRole(r));
  return ok ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Público */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protegido */}
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          {/* Home → Catálogos */}
          <Route index element={<Navigate to="/catalogos/categorias" replace />} />

          {/* Catálogos */}
          <Route path="catalogos">
            <Route index element={<Navigate to="categorias" replace />} />
            <Route path="categorias" element={<CategoriasPage />} />
            <Route path="productos" element={<ProductosPage />} />
            <Route path="modificador-grupos" element={<ModificadorGruposPage />} />
            <Route path="modificadores" element={<ModificadoresPage />} />
            <Route path="producto-modificadores" element={<ProductoModificadoresPage />} />
          </Route>

          {/* Menús */}
          <Route path="menus">
            <Route index element={<Navigate to="menus" replace />} />
            <Route path="menus" element={<MenusPage />} />
            <Route path="secciones" element={<MenuSeccionesPage />} />
            <Route path="items" element={<MenuItemsPage />} />
          </Route>

          {/* Pedidos (sin KDS) */}
          <Route path="pedidos">
            <Route index element={<Navigate to="tiendas" replace />} />
            <Route path="tiendas" element={<TiendasPage />} />
            <Route
              path="ordenes"
              element={
                <RequireRoles roles={["ADMIN", "MESERO", "CAJA"]}>
                  <PedidosPage />
                </RequireRoles>
              }
            />
            <Route
              path="mesas"
              element={
                <RequireRoles roles={["ADMIN"]}>
                  <MesasPage />
                </RequireRoles>
              }
            />
          </Route>

          {/* KDS como módulo aparte (solo COCINA) */}
          <Route
            path="kds"
            element={
              <RequireRoles roles={["COCINA"]}>
                <KdsPage />
              </RequireRoles>
            }
          />

          {/* Pagos (LISTADO y DETALLE) */}
          <Route
            path="pagos"
            element={
              <RequireRoles roles={["ADMIN", "CAJA"]}>
                <PagosListPage />
              </RequireRoles>
            }
          />
          <Route
            path="pagos/:id_orden"
            element={
              <RequireRoles roles={["ADMIN", "CAJA"]}>
                <PagoPage />
              </RequireRoles>
            }
          />
        </Route>
      </Route>

      {/* Cualquier otra ruta → login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
