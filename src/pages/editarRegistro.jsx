import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import "../styles/registro.css";
import logoSafemed from "../assets/safemedic.png";
import { toUpperCase, shouldUpperCase } from "../utils/textUtils";
import ModalRechazo from "../components/ModalRechazo";

export default function EditarRegistro() {
  const nav = useNavigate();
  const { id } = useParams();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  // solo SUPERVISOR y RESPONSABLE pueden guardar cambios
  const puedeEditar = ["SUPERVISOR DE CORTE", "RESPONSABLE"].includes(user?.rol);

  const INITIAL_FORM = {
    turno: "", modulo: "", responsable_modulo: "", responsable: "",
    numero_importacion: "", mesa_corte: "", observaciones: "", estado: "",
    motivo_rechazo: "", rechazado_por: "", fecha_rechazo: "",
  };
  const INITIAL_ROW = {
    fecha: "", lote_materia_prima: "", cf: "", codigo: "", producto: "",
    cantidad_tendidos: "", cantidad_unidades: "", tipo_tela: "",
    numero_rollo: "", fecha_entrega: "", cantidad_entregada: "",
  };
  const esSupervisor = user?.rol === "SUPERVISOR DE CORTE";

  const [form, setForm] = useState(INITIAL_FORM);
  const [rows, setRows]   = useState([{ ...INITIAL_ROW }]);
  const [rows2, setRows2] = useState([{ ...INITIAL_ROW }]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [modalRechazoOpen, setModalRechazoOpen] = useState(false);
  const [msg, setMsg] = useState("");
  
  const [responsables, setResponsables] = useState([]);
  const [lideresFiltrados, setLideresFiltrados] = useState([]);

  // Cargar lista de responsables (se ejecuta una vez)
  useEffect(() => {
    api
      .get("/api/onedrive/responsables")
      .then(({ data }) => setResponsables(data.data || []))
      .catch((err) => console.error("Error cargando responsables:", err));
  }, []);

  // Cargar líderes por módulo cuando cambia el módulo
  useEffect(() => {
    if (!form.modulo) {
      setLideresFiltrados([]);
      return;
    }
    api
      .post("/api/onedrive/lideres-por-modulo", { modulo: form.modulo })
      .then(({ data }) => setLideresFiltrados(data.data || []))
      .catch((err) => {
        console.error("Error cargando líderes:", err);
        setLideresFiltrados([]);
      });
  }, [form.modulo]);

  useEffect(() => {
    if (!id) return;
    const cargar = async () => {
      setCargando(true);
      try {
        const { data } = await api.get(`/api/registros/${id}`);
        setForm({
          turno:              data.turno              || "",
          modulo:             data.modulo             || "",
          responsable_modulo: data.responsable_modulo || "",
          responsable:        data.responsable        || "",
          supervisor:         data.supervisor         || "",
          numero_importacion: data.numero_importacion || "",
          mesa_corte:         data.mesa_corte         || "",
          observaciones:      data.observaciones      || "",
          estado:             data.estado             || "",
          motivo_rechazo:     data.motivo_rechazo     || "",
          rechazado_por:      data.rechazado_por      || "",
          fecha_rechazo:      data.fecha_rechazo      || "",
        });
        const parseRows = (v) => (Array.isArray(v) && v.length > 0 ? v : [{ ...INITIAL_ROW }]);
        setRows(parseRows(data.registros_corte));
        setRows2(parseRows(data.cambios_produccion));
      } catch (err) {
        console.error("Error al cargar registro:", err);
        setMsg("Error al cargar el registro. Intente nuevamente.");
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [id]);

  const onChange = (e) => {
    const { name, value, type } = e.target;
    let valorFinal = value;
    if (["text", "number", "textarea", "select-one"].includes(type) && shouldUpperCase(name)) {
      valorFinal = toUpperCase(value);
    }
    setForm((prev) => ({ ...prev, [name]: valorFinal }));
  };

  const onRowChange = (index, e) => {
    const { name, value } = e.target;
    const v = shouldUpperCase(name) ? toUpperCase(value) : value;
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [name]: v } : r));
  };
  const addRow    = () => setRows(prev => [...prev, { ...INITIAL_ROW }]);
  const removeRow = (i) => { if (rows.length > 1) setRows(prev => prev.filter((_, idx) => idx !== i)); };

  const onRowChange2 = (index, e) => {
    const { name, value } = e.target;
    const v = shouldUpperCase(name) ? toUpperCase(value) : value;
    setRows2(prev => prev.map((r, i) => i === index ? { ...r, [name]: v } : r));
  };
  const addRow2    = () => setRows2(prev => [...prev, { ...INITIAL_ROW }]);
  const removeRow2 = (i) => { if (rows2.length > 1) setRows2(prev => prev.filter((_, idx) => idx !== i)); };

  const buscarProductosPorLote = async (cf, rowIndex, setter) => {
    if (!cf.trim()) return;
    try {
      const { data } = await api.post("/api/onedrive/buscar-productos-por-lote", { cf });
      if (data.data?.length > 0) {
        setter(prev => [
          ...prev.slice(0, rowIndex),
          ...data.data.map(p => ({ ...INITIAL_ROW, cf, codigo: p.codigo, producto: p.descripcion })),
          ...prev.slice(rowIndex + 1),
        ]);
      }
    } catch { /* sin conexión a onedrive */ }
  };

  const estadoPendienteSupervisor = (form.estado || "").toLowerCase().includes("supervisor");

  const handleVerificar = async () => {
    if (!window.confirm("¿Confirma que desea verificar este registro?")) return;
    setVerificando(true);
    setMsg("");
    try {
      await api.put(`/api/registros/${id}/verificar`, {
        nombre: user.nombre,
        rol:    user.rol,
      });
      setMsg("¡Registro verificado correctamente!");
      setTimeout(() => nav(-1), 1500);
    } catch (error) {
      setMsg(error.response?.data?.error || "Error al verificar el registro.");
    } finally {
      setVerificando(false);
    }
  };

  const handleRechazado = async () => {
    setMsg("Registro rechazado exitosamente.");
    setTimeout(() => nav(-1), 1500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!puedeEditar) return;
    setGuardando(true);
    setMsg("");
    try {
      const esRechazado = (form.estado || "").toLowerCase().includes("rechazado");
      await api.put(`/api/registros/${id}`, {
        ...form,
        registros_corte_json:    JSON.stringify(rows),
        cambios_produccion_json: JSON.stringify(rows2),
        rol:    user.rol,
        nombre: user.nombre,
        // si estaba rechazado, vuelve a pendiente para re-verificación
        ...(esRechazado && { estado: "pendiente Supervisor" }),
      });
      setMsg("¡Registro actualizado correctamente!");
      setTimeout(() => nav(-1), 1500);
    } catch (error) {
      console.error("Error al guardar:", error);
      setMsg(error.response?.data?.error || "Error al guardar el registro.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="registro-corte-container" style={{ textAlign: "center", padding: 40 }}>
        <p>Cargando registro...</p>
      </div>
    );
  }

  return (
    <div id="formulario-corte" className="registro-corte-container">
      {msg && (
        <div
          className={`toast ${msg.toLowerCase().includes("error") ? "error" : "success"}`}
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9999,
            padding: "12px 24px",
            borderRadius: 8,
            backgroundColor: msg.toLowerCase().includes("error") ? "#f44336" : "#4caf50",
            color: "#fff",
            fontWeight: "bold",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          }}
        >
          {msg}
        </div>
      )}

      <header className="logo-principal">
        <div className="logo-img">
          <div className="logo">
            <img
              src={logoSafemed}
              alt="Logo Safemed"
              style={{ width: "200px", height: "70px", transform: "translateX(30px)" }}
            />
          </div>
          <div className="linea-separadora"></div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <h2 className="titulo">
              {puedeEditar ? "EDITAR REGISTRO DE CORTE" : "VER REGISTRO DE CORTE"}
            </h2>
          </div>
          <div className="linea-separadora2"></div>
          <div className="informacion-derecha">
            <p>
              <span style={{ color: "#000000", fontWeight: "bold" }}>Código:</span> RG-GPR-03
            </p>
            <p>
              <span style={{ color: "#000000", fontWeight: "bold" }}>Vigencia:</span> 07-02-2025
            </p>
            <p>
              <span style={{ color: "#000000", fontWeight: "bold" }}>Versión:</span> 08
            </p>
          </div>
        </div>
      </header>

      <div className="btn-volver-container">
        <button className="btn-volver" type="button" onClick={() => nav(-1)}>
          ⬅ Volver
        </button>
      </div>

      {!puedeEditar && (
        <div style={{
          margin: "12px 0",
          padding: "10px 16px",
          backgroundColor: "#fef9c3",
          border: "1px solid #fde047",
          borderRadius: "6px",
          fontSize: "13px",
          color: "#854d0e"
        }}>
          ⚠️ Solo SUPERVISOR DE CORTE y RESPONSABLE pueden editar. Estás en modo de solo lectura.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* CABECERA */}
        <div className="cabecera">
          <div className="grid">
            <div className="form-group">
              <label htmlFor="turno">TURNO:</label>
              <select
                id="turno"
                name="turno"
                value={form.turno}
                onChange={onChange}
                className="selector-turno"
                required
              >
                <option value="">SELECCIONE EL TURNO...</option>
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="modulo">MÓDULO:</label>
              <select
                id="modulo"
                name="modulo"
                value={form.modulo}
                onChange={onChange}
                className="selector-modulo"
                required
              >
                <option value="">SELECCIONE EL MÓDULO...</option>
                <option value="MODULO 1">MODULO 1</option>
                <option value="MODULO 2">MODULO 2</option>
                <option value="MODULO 3">MODULO 3</option>
                <option value="MODULO 4">MODULO 4</option>
                <option value="MODULO 6">MODULO 6</option>
                <option value="MODULO 7">MODULO 7</option>
                <option value="MODULO 8">MODULO 8</option>
                <option value="MODULO 10">MODULO 10</option>
                <option value="VARIOS 1">VARIOS 1</option>
                <option value="VARIOS 2">VARIOS 2</option>
                <option value="VARIOS 3">VARIOS 3</option>
                <option value="ESTAMPADO">ESTAMPADO</option>
                <option value="BOTAS SIMPLES">BOTAS SIMPLES</option>
                <option value="SPA">SPA</option>
                <option value="MASCARILLAS">MASCARILLAS</option>
                <option value="GPA">GPA</option>
                <option value="SELLADO">SELLADO</option>
                <option value="CORTE">CORTE</option>
                <option value="METBLOWN">METBLOWN</option>
              </select>
            </div>
          </div>
        </div>

        <div className="cabecera">
          <div className="grid2">
            <div className="form-group">
              <label htmlFor="responsable_modulo">RESPONSABLE MÓDULO:</label>
              <select
                id="responsable_modulo"
                name="responsable_modulo"
                value={form.responsable_modulo || ""}
                onChange={onChange}
                disabled={!form.modulo}
                className="selector-responsable-modulo"
                required
              >
                <option value="">SELECCIONA EL RESPONSABLE DEL MÓDULO...</option>
                {lideresFiltrados.map((lider, idx) => (
                  <option key={idx} value={lider}>
                    {lider}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="responsable">RESPONSABLE:</label>
              <select
                id="responsable"
                name="responsable"
                value={form.responsable}
                onChange={onChange}
                className="selector-responsable"
                required
              >
                <option value="">SELECCIONA AL RESPONSABLE...</option>
                {responsables.map((resp, idx) => (
                  <option key={idx} value={resp}>
                    {resp}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="supervisor">SUPERVISOR DE CORTE:</label>
              <select
                id="supervisor"
                name="supervisor"
                value={form.supervisor}
                onChange={onChange}
                className="selector-supervisor"
                required
              >
                <option value="">SELECCIONA AL SUPERVISOR DE CORTE...</option>
                <option value="Morales Collaguazo Gabriela Alexandra">Morales Collaguazo Gabriela Alexandra</option>
              </select>

            </div>
          </div>
        </div>

        <div className="cabecera">
          <div className="grid3">
            <div className="form-group">
              <label htmlFor="numero_importacion">NÚMERO DE IMPORTACIÓN:</label>
              <input
                type="text"
                id="numero_importacion"
                name="numero_importacion"
                value={form.numero_importacion || ""}
                onChange={onChange}
                className="input-text"
              />
            </div>
            <div className="form-group">
              <label htmlFor="mesa_corte">MESA DE CORTE:</label>
              <select
                id="mesa_corte"
                name="mesa_corte"
                value={form.mesa_corte || ""}
                onChange={onChange}
                className="selector-mesa-corte"
              >
                <option value="">SELECCIONE LA MESA DE CORTE...</option>
                <option value="MANUAL">MANUAL</option>
                <option value="AUTOMÁTICA">AUTOMÁTICA</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABLA: REGISTROS DE CORTE */}
        <div className="tabla-registros">
          <div className="tabla-seccion-header">
            <h4>REGISTROS DE CORTE</h4>
          </div>
          <div className="tabla-scroll">
            <table className="tabla-datos">
              <thead>
                <tr>
                  <th>FECHA</th><th>LOTE MATERIA PRIMA</th><th>CF</th><th>CÓDIGO</th>
                  <th>PRODUCTO</th><th>CANT. TENDIDOS</th><th>CANT. UNIDADES</th>
                  <th>TIPO DE TELA</th><th>N° ROLLO</th><th>FECHA ENTREGA</th>
                  <th>CANT. ENTREGADA</th>{puedeEditar && <th>ACCIONES</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index}>
                    <td><input type="date" name="fecha" value={row.fecha} onChange={(e) => onRowChange(index, e)} className="td-input-fecha" disabled={!puedeEditar} /></td>
                    <td><input type="text" name="lote_materia_prima" value={row.lote_materia_prima} onChange={(e) => onRowChange(index, e)} className="td-input" disabled={!puedeEditar} /></td>
                    <td><input type="text" name="cf" value={row.cf} onChange={(e) => onRowChange(index, e)} className="td-input-cf" disabled={!puedeEditar} /></td>
                    <td><input type="text" name="codigo" value={row.codigo} onChange={(e) => onRowChange(index, e)} onBlur={(e) => puedeEditar && buscarProductosPorLote(e.target.value, index, setRows)} className="td-input-codigo" disabled={!puedeEditar} /></td>
                    <td><input type="text" name="producto" value={row.producto} onChange={(e) => onRowChange(index, e)} className="td-input td-input-producto" disabled={!puedeEditar} /></td>
                    <td><input type="number" name="cantidad_tendidos" value={row.cantidad_tendidos} onChange={(e) => onRowChange(index, e)} className="td-input td-input-num" min="0" disabled={!puedeEditar} /></td>
                    <td><input type="number" name="cantidad_unidades" value={row.cantidad_unidades} onChange={(e) => onRowChange(index, e)} className="td-input td-input-num" min="0" disabled={!puedeEditar} /></td>
                    <td><input type="text" name="tipo_tela" value={row.tipo_tela} onChange={(e) => onRowChange(index, e)} className="td-input" disabled={!puedeEditar} /></td>
                    <td><input type="text" name="numero_rollo" value={row.numero_rollo} onChange={(e) => onRowChange(index, e)} className="td-input td-input-num" disabled={!puedeEditar} /></td>
                    <td><input type="date" name="fecha_entrega" value={row.fecha_entrega} onChange={(e) => onRowChange(index, e)} className="td-input-fecha" disabled={!puedeEditar} /></td>
                    <td><input type="number" name="cantidad_entregada" value={row.cantidad_entregada} onChange={(e) => onRowChange(index, e)} className="td-input td-input-num" min="0" disabled={!puedeEditar} /></td>
                    {puedeEditar && <td><button type="button" onClick={() => removeRow(index)} className="btn-eliminar-fila" disabled={rows.length === 1}>✕</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {puedeEditar && (
            <div className="tabla-acciones">
              <button type="button" onClick={addRow} className="btn-agregar-fila">+ Agregar fila</button>
            </div>
          )}

          {/* TABLA: CAMBIOS DE PRODUCCIÓN */}
          <div className="tabla-seccion-header tabla-seccion-cambios">
            <h4>CAMBIOS DE PRODUCCIÓN</h4>
          </div>
          <div className="tabla-scroll">
            <table className="tabla-datos">
              <thead>
                <tr>
                  <th>FECHA</th><th>LOTE MATERIA PRIMA</th><th>CF</th><th>CÓDIGO</th>
                  <th>PRODUCTO</th><th>CANT. TENDIDOS</th><th>CANT. UNIDADES</th>
                  <th>TIPO DE TELA</th><th>N° ROLLO</th><th>FECHA ENTREGA</th>
                  <th>CANT. ENTREGADA</th>{puedeEditar && <th>ACCIONES</th>}
                </tr>
              </thead>
              <tbody>
                {rows2.map((row, index) => (
                  <tr key={index}>
                    <td><input type="date" name="fecha" value={row.fecha} onChange={(e) => onRowChange2(index, e)} className="td-input-fecha" disabled={!puedeEditar} /></td>
                    <td><input type="text" name="lote_materia_prima" value={row.lote_materia_prima} onChange={(e) => onRowChange2(index, e)} className="td-input" disabled={!puedeEditar} /></td>
                    <td><input type="text" name="cf" value={row.cf} onChange={(e) => onRowChange2(index, e)} className="td-input-cf" disabled={!puedeEditar} /></td>
                    <td><input type="text" name="codigo" value={row.codigo} onChange={(e) => onRowChange2(index, e)} onBlur={(e) => puedeEditar && buscarProductosPorLote(e.target.value, index, setRows2)} className="td-input-codigo" disabled={!puedeEditar} /></td>
                    <td><input type="text" name="producto" value={row.producto} onChange={(e) => onRowChange2(index, e)} className="td-input td-input-producto" disabled={!puedeEditar} /></td>
                    <td><input type="number" name="cantidad_tendidos" value={row.cantidad_tendidos} onChange={(e) => onRowChange2(index, e)} className="td-input td-input-num" min="0" disabled={!puedeEditar} /></td>
                    <td><input type="number" name="cantidad_unidades" value={row.cantidad_unidades} onChange={(e) => onRowChange2(index, e)} className="td-input td-input-num" min="0" disabled={!puedeEditar} /></td>
                    <td><input type="text" name="tipo_tela" value={row.tipo_tela} onChange={(e) => onRowChange2(index, e)} className="td-input" disabled={!puedeEditar} /></td>
                    <td><input type="text" name="numero_rollo" value={row.numero_rollo} onChange={(e) => onRowChange2(index, e)} className="td-input td-input-num" disabled={!puedeEditar} /></td>
                    <td><input type="date" name="fecha_entrega" value={row.fecha_entrega} onChange={(e) => onRowChange2(index, e)} className="td-input-fecha" disabled={!puedeEditar} /></td>
                    <td><input type="number" name="cantidad_entregada" value={row.cantidad_entregada} onChange={(e) => onRowChange2(index, e)} className="td-input td-input-num" min="0" disabled={!puedeEditar} /></td>
                    {puedeEditar && <td><button type="button" onClick={() => removeRow2(index)} className="btn-eliminar-fila" disabled={rows2.length === 1}>✕</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {puedeEditar && (
            <div className="tabla-acciones">
              <button type="button" onClick={addRow2} className="btn-agregar-fila">+ Agregar fila</button>
            </div>
          )}
          <div className="observaciones">
            <label>OBSERVACIONES:</label>
            <textarea name="observaciones" value={form.observaciones} onChange={onChange}
              placeholder="Observaciones..."
              disabled={!puedeEditar}
              className="observaciones-textarea" />
          </div>

          {(form.estado || "").toLowerCase().includes("rechazado") && (
            <div style={{ margin: "16px 0", padding: "16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px" }}>
              <h3 style={{ margin: "0 0 12px 0", color: "#991b1b", fontSize: "15px", borderBottom: "1px solid #fecaca", paddingBottom: "8px" }}>⚠️ INFORMACIÓN DE RECHAZO</h3>
              {form.motivo_rechazo && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: "#991b1b", fontSize: 14 }}>Motivo del Rechazo:</div>
                  <div style={{ padding: 12, background: "white", borderRadius: 8, color: "#7f1d1d", fontSize: 14, whiteSpace: "pre-wrap", border: "1px solid #fecaca" }}>{form.motivo_rechazo}</div>
                </div>
              )}
              {form.rechazado_por && (
                <div style={{ fontSize: 13, color: "#b91c1c" }}>
                  Rechazado por: <strong>{form.rechazado_por}</strong>
                  {form.fecha_rechazo && ` — ${new Date(form.fecha_rechazo).toLocaleString("es-CL")}`}
                </div>
              )}
              {puedeEditar && (
                <div style={{ marginTop: 10, fontSize: 13, color: "#92400e", background: "#fef9c3", padding: "8px 12px", borderRadius: 6, border: "1px solid #fde68a" }}>
                  💡 Al guardar los cambios, el registro volverá a estado <strong>pendiente Supervisor</strong> para ser verificado.
                </div>
              )}
            </div>
          )}

          {puedeEditar && (
            <button type="submit" className="btn-guardar-registro" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar Cambios"}
            </button>
          )}

          {esSupervisor && estadoPendienteSupervisor && (
            <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-guardar-registro"
                style={{ background: "#16a34a", minWidth: "160px" }}
                onClick={handleVerificar}
                disabled={verificando}
              >
                {verificando ? "Verificando..." : "✔ Verificar Registro"}
              </button>
              <button
                type="button"
                className="btn-guardar-registro"
                style={{ background: "#dc2626", minWidth: "160px" }}
                onClick={() => setModalRechazoOpen(true)}
              >
                ✕ Rechazar Registro
              </button>
            </div>
          )}
        </div>
      </form>

      <ModalRechazo
        isOpen={modalRechazoOpen}
        onClose={() => setModalRechazoOpen(false)}
        registroId={id}
        onRechazado={handleRechazado}
        usuario={user}
      />
    </div>
  );
}    