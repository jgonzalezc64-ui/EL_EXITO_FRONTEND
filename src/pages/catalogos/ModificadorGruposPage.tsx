import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../app/useAuth";
import {
  listModificadorGrupos,
  createModificadorGrupo,
  updateModificadorGrupo,
  deleteModificadorGrupo,
} from "../../services/catalogos/modificadores";
import type { ModificadorGrupo } from "../../types/catalogos/modificadores";

export default function ModificadorGruposPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("ADMIN");

  const [items, setItems] = useState<ModificadorGrupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  // filtros por columna: obligatorio y rangos
  const [fx, setFx] = useState({
    obligatorio: "ALL" as "ALL" | "YES" | "NO",
    minMin: "",    // mínimo permitido en el grupo
    maxMax: "",    // máximo permitido en el grupo
  });

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    minimo: "0",
    maximo: "5",
    obligatorio: false,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await listModificadorGrupos();
        setItems(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const base = Array.isArray(items) ? items : [];
    const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    const q = normalize(filter.trim());

    let out = base.filter(g => {
      if (!q) return true;
      return (
        String(g.id_grupo).includes(q) ||
        normalize(g.nombre).includes(q) ||
        normalize(g.descripcion || "").includes(q) ||
        String(g.minimo).includes(q) ||
        String(g.maximo).includes(q) ||
        (g.obligatorio ? "obligatorio yes true" : "no opcional false").includes(q)
      );
    });

    if (fx.obligatorio !== "ALL") {
      out = out.filter(g => (fx.obligatorio === "YES" ? g.obligatorio : !g.obligatorio));
    }

    const mn = fx.minMin ? Number(fx.minMin.replace(",", ".")) : null;
    const mx = fx.maxMax ? Number(fx.maxMax.replace(",", ".")) : null;
    if (mn !== null && !Number.isNaN(mn)) out = out.filter(g => g.minimo >= mn);
    if (mx !== null && !Number.isNaN(mx)) out = out.filter(g => g.maximo <= mx);

    return out;
  }, [items, filter, fx]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const nombre = form.nombre.trim();
    const descripcion = (form.descripcion || "").trim();
    const minimo = Number(form.minimo || 0);
    const maximo = Number(form.maximo || 0);
    const obligatorio = !!form.obligatorio;

    if (!nombre) return alert("Nombre requerido");
    if (minimo < 0 || maximo < 0 || maximo < minimo) {
      return alert("Rangos inválidos (max ≥ min, ambos ≥ 0)");
    }

    if (!confirm(`¿Guardar nuevo grupo?\n\n${nombre} (min ${minimo}, max ${maximo}, ${obligatorio ? "obligatorio" : "opcional"})`)) return;

    const created = await createModificadorGrupo({
      nombre,
      descripcion: descripcion || undefined,
      minimo,
      maximo,
      obligatorio,
    });
    setItems(prev => [created, ...prev]);
    setForm({ nombre: "", descripcion: "", minimo: "0", maximo: "5", obligatorio: false });
  }

  async function onInlineEdit(
    id: number,
    patch: Partial<ModificadorGrupo>
    ) {
    const current = items.find((x) => x.id_grupo === id);
    if (!current) return;

    // Resuelve la clave de forma tipada
    const key = Object.keys(patch)[0] as keyof ModificadorGrupo | undefined;
    if (!key) return;

    const beforeVal = current[key];
    const afterVal = (patch as Partial<ModificadorGrupo>)[key];

    const antes = String(beforeVal ?? "");
    const ahora = String(afterVal ?? "");
    if (antes === ahora) return;

    if (!confirm(`¿Guardar cambios de ${String(key)}?\n\nAntes: "${antes}"\nAhora: "${ahora}"`)) {
        return;
    }

    const prev = items;
    // Optimista
    setItems((cur) => cur.map((x) => (x.id_grupo === id ? { ...x, ...patch } : x)));
    try {
        const updated = await updateModificadorGrupo(id, patch);
        setItems((cur) => cur.map((x) => (x.id_grupo === id ? updated : x)));
    } catch {
        setItems(prev); // rollback
        alert("No se pudo guardar el cambio.");
    }
    }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="prod-toolbar">
        <div><h2 className="h1" style={{ margin: 0 }}>Grupos de modificadores</h2></div>
        <input
          className="prod-input"
          placeholder="Buscar..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ maxWidth: 260 }}
        />
      </div>

      {/* Filtros por columna */}
      <div className="ui-card" style={{ padding: 12, display: "grid", gap: 8 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <select
            className="prod-select"
            value={fx.obligatorio}
            onChange={(e)=>setFx(f=>({...f, obligatorio: e.target.value as "ALL"|"YES"|"NO"}))}
          >
            <option value="ALL">Obligatorio (todos)</option>
            <option value="YES">Solo obligatorios</option>
            <option value="NO">Solo opcionales</option>
          </select>

          <input
            className="prod-input"
            placeholder="Mín. mínimo"
            inputMode="decimal"
            value={fx.minMin}
            onChange={(e)=>setFx(f=>({...f, minMin: e.target.value}))}
            style={{ width: 130 }}
          />
          <input
            className="prod-input"
            placeholder="Máx. máximo"
            inputMode="decimal"
            value={fx.maxMax}
            onChange={(e)=>setFx(f=>({...f, maxMax: e.target.value}))}
            style={{ width: 130 }}
          />

          <button className="btn btn-ghost" type="button" onClick={()=>setFx({ obligatorio:"ALL", minMin:"", maxMax:"" })}>
            Limpiar filtros
          </button>
        </div>
      </div>

      {/* Crear (solo ADMIN) */}
      {isAdmin && (
        <div className="ui-card" style={{ maxWidth: 900 }}>
          <h3 style={{ marginTop: 0 }}>Nuevo grupo</h3>
          <form className="prod-form" onSubmit={onCreate}>
            <div>
              <label style={{ display:"block", fontSize:12, marginBottom:6 }}>Nombre</label>
              <input className="prod-input" value={form.nombre} onChange={e=>setForm(f=>({...f, nombre: e.target.value}))}/>
            </div>
            <div className="col-span-2">
              <label style={{ display:"block", fontSize:12, marginBottom:6 }}>Descripción</label>
              <textarea className="prod-textarea" value={form.descripcion} onChange={e=>setForm(f=>({...f, descripcion: e.target.value}))}/>
            </div>
            <div>
              <label style={{ display:"block", fontSize:12, marginBottom:6 }}>Mínimo</label>
              <input className="prod-input" inputMode="decimal" value={form.minimo} onChange={e=>setForm(f=>({...f, minimo: e.target.value}))}/>
            </div>
            <div>
              <label style={{ display:"block", fontSize:12, marginBottom:6 }}>Máximo</label>
              <input className="prod-input" inputMode="decimal" value={form.maximo} onChange={e=>setForm(f=>({...f, maximo: e.target.value}))}/>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <input id="obl" type="checkbox" checked={form.obligatorio} onChange={e=>setForm(f=>({...f, obligatorio: e.target.checked}))}/>
              <label htmlFor="obl">Obligatorio</label>
            </div>
            <div className="col-span-2" style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button className="btn btn-ghost" type="button" onClick={()=>setForm({ nombre:"", descripcion:"", minimo:"0", maximo:"5", obligatorio:false })}>Limpiar</button>
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
              <th style={{ width: 64 }}>ID</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th style={{ width: 90 }}>Min</th>
              <th style={{ width: 90 }}>Max</th>
              <th style={{ width: 140 }}>Obligatorio</th>
              {isAdmin && <th style={{ width: 220 }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={isAdmin ? 7 : 6} style={{ padding:16, textAlign:"center", color:"var(--muted)" }}>Sin resultados</td></tr>
            )}
            {filtered.map(row => (
              <tr key={row.id_grupo}>
                <td>{row.id_grupo}</td>
                <td><InlineText value={row.nombre} onSave={(v)=>onInlineEdit(row.id_grupo, { nombre: v })}/></td>
                <td><InlineText value={row.descripcion || ""} placeholder="Sin descripción" onSave={(v)=>onInlineEdit(row.id_grupo, { descripcion: v || null })}/></td>
                <td><InlineText value={String(row.minimo)} onSave={(v)=>{ const n = Number((v||"").replace(",", ".")); if(Number.isNaN(n)||n<0){alert("Valor inválido"); return;} onInlineEdit(row.id_grupo, { minimo:n }); }}/></td>
                <td><InlineText value={String(row.maximo)} onSave={(v)=>{ const n = Number((v||"").replace(",", ".")); if(Number.isNaN(n)||n<0){alert("Valor inválido"); return;} onInlineEdit(row.id_grupo, { maximo:n }); }}/></td>
                <td>
                  <label style={{ display:"inline-flex", alignItems:"center", gap:8, cursor:"pointer" }}>
                    <input type="checkbox" checked={row.obligatorio} onChange={(e)=>onInlineEdit(row.id_grupo, { obligatorio: e.target.checked })}/>
                    <span className="subtle">{row.obligatorio ? "Sí" : "No"}</span>
                  </label>
                </td>
                {isAdmin && (
                  <td style={{ display:"flex", gap:8 }}>
                    <button className="btn btn-ghost" onClick={async ()=>{
                      if(!confirm(`¿Eliminar el grupo "${row.nombre}"?`)) return;
                      try{
                        await deleteModificadorGrupo(row.id_grupo);
                        setItems(prev => prev.filter(x => x.id_grupo !== row.id_grupo));
                      }catch{ alert("No se pudo eliminar"); }
                    }}>Eliminar</button>
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
    <input className="prod-input" value={v} placeholder={placeholder} onChange={e=>setV(e.target.value)} onBlur={commit}
      onKeyDown={(e)=>{ if(e.key==='Enter') commit(); if(e.key==='Escape'){ setV(value); setEditing(false); }}} autoFocus style={{ height:34 }}/>
  ) : (
    <span onDoubleClick={()=>setEditing(true)} style={{ cursor:"text" }}>{value || <span className="subtle">{placeholder||"—"}</span>}</span>
  );
}
