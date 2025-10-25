import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/useAuth";
import {
  listModificadores,
  createModificador,
  updateModificador,
  toggleModificador,
  deleteModificador,
} from "../../services/catalogos/modificadores";
import { listModificadorGrupos } from "../../services/catalogos/modificadores";
import type { Modificador, ModificadorGrupo } from "../../types/catalogos/modificadores";

export default function ModificadoresPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("ADMIN");

  const [items, setItems] = useState<Modificador[]>([]);
  const [grupos, setGrupos] = useState<ModificadorGrupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const [fx, setFx] = useState({
    grupo: 0,               // 0 = todos los grupos
    estado: "ALL" as "ALL" | "ON" | "OFF",
    minPrecio: "",
    maxPrecio: "",
  });

  const [form, setForm] = useState({
    id_grupo: 0,
    nombre: "",
    precio_extra: "",
    activo: true,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [mods, grps] = await Promise.all([listModificadores(), listModificadorGrupos()]);
        setItems(mods);
        setGrupos(grps);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const base = Array.isArray(items) ? items : [];
    const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    const q = normalize(filter.trim());

    const groupName = (id: number) => grupos.find(g => g.id_grupo === id)?.nombre || "";

    let out = base.filter(m => {
      if (!q) return true;
      return (
        String(m.id_modificador).includes(q) ||
        normalize(m.nombre).includes(q) ||
        String(m.precio_extra).includes(q) ||
        normalize(groupName(m.id_grupo)).includes(q) ||
        (m.activo ? "activo on true" : "inactivo off false").includes(q)
      );
    });

    if (fx.grupo) out = out.filter(m => m.id_grupo === fx.grupo);
    if (fx.estado !== "ALL") out = out.filter(m => (fx.estado === "ON" ? m.activo : !m.activo));

    const mn = fx.minPrecio ? Number(fx.minPrecio.replace(",", ".")) : null;
    const mx = fx.maxPrecio ? Number(fx.maxPrecio.replace(",", ".")) : null;
    if (mn !== null && !Number.isNaN(mn)) out = out.filter(m => m.precio_extra >= mn);
    if (mx !== null && !Number.isNaN(mx)) out = out.filter(m => m.precio_extra <= mx);

    return out;
  }, [items, filter, fx, grupos]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const id_grupo = Number(form.id_grupo);
    const nombre = form.nombre.trim();
    const precio = Number((form.precio_extra || "0").replace(",", "."));
    const activo = !!form.activo;

    if (!id_grupo || !nombre || precio < 0) {
      alert("Completa: grupo, nombre y precio ≥ 0.");
      return;
    }

    if (!confirm(`¿Guardar nuevo modificador?\n\n${nombre} (Q${precio.toFixed(2)})`)) return;

    const created = await createModificador({ id_grupo, nombre, precio_extra: precio, activo });
    setItems(prev => [created, ...prev]);
    setForm({ id_grupo: 0, nombre: "", precio_extra: "", activo: true });
  }

  async function onToggle(id: number, activo: boolean) {
    const accion = activo ? "desactivar" : "activar";
    if (!confirm(`¿Seguro que deseas ${accion} este modificador?`)) return;

    const prev = items;
    setItems(cur => cur.map(x => x.id_modificador === id ? { ...x, activo: !activo } : x));
    try {
      const updated = await toggleModificador(id, !activo);
      setItems(cur => cur.map(x => x.id_modificador === id ? updated : x));
    } catch {
      setItems(prev);
      alert("No se pudo cambiar el estado.");
    }
  }

  async function onInlineEdit(
    id: number,
    patch: Partial<Modificador>
    ) {
    const current = items.find((x) => x.id_modificador === id);
    if (!current) return;

    const key = Object.keys(patch)[0] as keyof Modificador | undefined;
    if (!key) return;

    const beforeVal = current[key];
    const afterVal = (patch as Partial<Modificador>)[key];

    const antes = String(beforeVal ?? "");
    const ahora = String(afterVal ?? "");
    if (antes === ahora) return;

    if (!confirm(`¿Guardar cambios de ${String(key)}?\n\nAntes: "${antes}"\nAhora: "${ahora}"`)) {
        return;
    }

    const prev = items;
    setItems((cur) => cur.map((x) => (x.id_modificador === id ? { ...x, ...patch } : x)));
    try {
        const updated = await updateModificador(id, patch);
        setItems((cur) => cur.map((x) => (x.id_modificador === id ? updated : x)));
    } catch {
        setItems(prev);
        alert("No se pudo guardar el cambio.");
    }
    }

  return (
    <div style={{ display:"grid", gap:16 }}>
      <div className="prod-toolbar">
        <div><h2 className="h1" style={{ margin:0 }}>Modificadores</h2></div>
        <input className="prod-input" placeholder="Buscar..." value={filter} onChange={(e)=>setFilter(e.target.value)} style={{ maxWidth:260 }}/>
      </div>

      {/* Filtros */}
      <div className="ui-card" style={{ padding:12, display:"grid", gap:8 }}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          <select className="prod-select" value={fx.grupo} onChange={(e)=>setFx(f=>({...f, grupo: Number(e.target.value)}))}>
            <option value={0}>Todos los grupos</option>
            {grupos.map(g => <option key={g.id_grupo} value={g.id_grupo}>{g.nombre}</option>)}
          </select>

          <select className="prod-select" value={fx.estado} onChange={(e)=>setFx(f=>({...f, estado: e.target.value as "ALL"|"ON"|"OFF"}))}>
            <option value="ALL">Todos</option>
            <option value="ON">Activos</option>
            <option value="OFF">Inactivos</option>
          </select>

          <input className="prod-input" placeholder="Precio mín." inputMode="decimal" value={fx.minPrecio} onChange={(e)=>setFx(f=>({...f, minPrecio: e.target.value}))} style={{ width:120 }}/>
          <input className="prod-input" placeholder="Precio máx." inputMode="decimal" value={fx.maxPrecio} onChange={(e)=>setFx(f=>({...f, maxPrecio: e.target.value}))} style={{ width:120 }}/>

          <button className="btn btn-ghost" type="button" onClick={()=>setFx({ grupo:0, estado:"ALL", minPrecio:"", maxPrecio:"" })}>Limpiar filtros</button>
        </div>
      </div>

      {/* Crear (solo ADMIN) */}
      {isAdmin && (
        <div className="ui-card" style={{ maxWidth: 900 }}>
          <h3 style={{ marginTop: 0 }}>Nuevo modificador</h3>
          <form className="prod-form" onSubmit={onCreate}>
            <div>
              <label style={{ display:"block", fontSize:12, marginBottom:6 }}>Grupo</label>
              <select className="prod-select" value={form.id_grupo} onChange={(e)=>setForm(f=>({...f, id_grupo: Number(e.target.value)}))}>
                <option value={0}>Seleccione…</option>
                {grupos.map(g => <option key={g.id_grupo} value={g.id_grupo}>{g.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:"block", fontSize:12, marginBottom:6 }}>Nombre</label>
              <input className="prod-input" value={form.nombre} onChange={(e)=>setForm(f=>({...f, nombre: e.target.value}))}/>
            </div>
            <div>
              <label style={{ display:"block", fontSize:12, marginBottom:6 }}>Precio extra (Q)</label>
              <input className="prod-input" inputMode="decimal" value={form.precio_extra} onChange={(e)=>setForm(f=>({...f, precio_extra: e.target.value}))} placeholder="0.00"/>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <input id="act" type="checkbox" checked={form.activo} onChange={(e)=>setForm(f=>({...f, activo: e.target.checked}))}/>
              <label htmlFor="act">Activo</label>
            </div>
            <div className="col-span-2" style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button className="btn btn-ghost" type="button" onClick={()=>setForm({ id_grupo:0, nombre:"", precio_extra:"", activo:true })}>Limpiar</button>
              <button className="btn btn-primary" type="submit">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla */}
      <div className="prod-table">
        <table className="prod-table">
          <thead>
            <tr>
              <th style={{ width:64 }}>ID</th>
              <th>Grupo</th>
              <th>Nombre</th>
              <th style={{ width:120 }}>Precio extra</th>
              <th style={{ width:110 }}>Estado</th>
              {isAdmin && <th style={{ width:220 }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={isAdmin ? 6 : 5} style={{ padding:16, textAlign:"center", color:"var(--muted)" }}>Sin resultados</td></tr>
            )}

            {filtered.map(row => (
              <tr key={row.id_modificador}>
                <td>{row.id_modificador}</td>
                <td>{grupos.find(g => g.id_grupo === row.id_grupo)?.nombre || <span className="subtle">—</span>}</td>
                <td>
                  {isAdmin ? (
                    <InlineText value={row.nombre} onSave={(v)=>onInlineEdit(row.id_modificador, { nombre: v })}/>
                  ) : row.nombre}
                </td>
                <td>
                  {isAdmin ? (
                    <InlineText
                      value={String(row.precio_extra)}
                      onSave={(v)=> {
                        const n = Number((v||"").replace(",", "."));
                        if(Number.isNaN(n) || n<0){ alert("Precio inválido"); return; }
                        onInlineEdit(row.id_modificador, { precio_extra: n });
                      }}
                    />
                  ) : `Q ${Number(row.precio_extra).toFixed(2)}`}
                </td>
                <td>
                  <span className={`badge ${row.activo ? "ok" : "off"}`}>
                    {row.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                {isAdmin && (
                  <td style={{ display:"flex", gap:8 }}>
                    <button className="btn btn-ghost" onClick={()=>onToggle(row.id_modificador, row.activo)}>
                      {row.activo ? "Desactivar" : "Activar"}
                    </button>
                    <button className="btn btn-ghost" onClick={async ()=>{
                      if(!confirm(`¿Eliminar el modificador "${row.nombre}"?`)) return;
                      try{
                        await deleteModificador(row.id_modificador);
                        setItems(prev => prev.filter(x => x.id_modificador !== row.id_modificador));
                      }catch{ alert("No se pudo eliminar"); }
                    }}>
                      Eliminar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && <div className="subtle">Cargando...</div>}
    </div>
  );
}

function InlineText({ value, onSave, placeholder }: { value: string; placeholder?: string; onSave: (val: string)=>void }) {
  const [v, setV] = useState(value);
  const [editing, setEditing] = useState(false);
  useEffect(()=>setV(value),[value]);
  function commit(){ setEditing(false); if(v!==value) onSave(v.trim()); }
  return editing ? (
    <input className="prod-input" value={v} placeholder={placeholder} onChange={(e)=>setV(e.target.value)} onBlur={commit}
      onKeyDown={(e)=>{ if(e.key==='Enter') commit(); if(e.key==='Escape'){ setV(value); setEditing(false); }}} autoFocus style={{ height:34 }}/>
  ) : (
    <span onDoubleClick={()=>setEditing(true)} style={{ cursor:"text" }}>{value || <span className="subtle">{placeholder||"—"}</span>}</span>
  );
}
