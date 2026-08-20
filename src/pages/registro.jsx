import { useEffect, useState } from "react";
import { api } from "../services/api";
import "../styles/registro.css";
import { useNavigate } from "react-router-dom";
import logoSafemed from "../assets/safemedic.png";
//import { v4 as uuidv4 } from "uuid";
import { toUpperCase, shouldUpperCase } from "../utils/textUtils";

export default function Registro() {
    const nav = useNavigate();
    
    const INITIAL_FORM = {
        turno: "",
        modulo: "",
        responsable_modulo: "",
        responsable: "",
        supervisor: "",
        numero_importacion: "",
        mesa_corte: "",
        observaciones: "",
    };
    const [form, setForm] = useState(INITIAL_FORM);
    const [msg, setMsg] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [lideresFiltrados, setLideresFiltrados] = useState([]);
    const [responsables, setResponsables] = useState([]);

    useEffect(() => {
        api.get('/api/onedrive/responsables')
            .then(({ data }) => setResponsables(data.data || []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!form.modulo) return; 
        api.post('/api/onedrive/lideres-por-modulo', { modulo: form.modulo })
            .then(({ data }) => setLideresFiltrados(data.data || []))
            .catch(() => setLideresFiltrados([]));
    }, [form.modulo]);

    const INITIAL_ROW = {
        fecha: "",
        lote_materia_prima: "",
        codigo: "",
        producto: "",
        cantidad_tendidos: "",
        cantidad_unidades: "",
        tipo_tela: "",
        numero_rollo: "",
        fecha_entrega: "",
        cantidad_entregada: "",
    };
    const [rows, setRows] = useState([{ ...INITIAL_ROW }]);
    const [rows2, setRows2] = useState([{ ...INITIAL_ROW }]);

    const addRow = () => setRows(prev => [...prev, { ...INITIAL_ROW }]);

    const addRow2 = () => setRows2(prev => [...prev, { ...INITIAL_ROW }]);

    {/*
    const buscarProducto = async (codigo, rowIndex, setter) => {
        if (!codigo.trim()) return;
        try {
            const { data } = await api.post('/api/onedrive/buscar-producto', { productoId: codigo });
            if (data.encontrado) {
                setter(prev => prev.map((row, i) =>
                    i === rowIndex ? { ...row, producto: data.data.descripcion } : row
                ));
            }
        } catch {
            // código no encontrado o error de red, se deja vacío
        }
    };*/}

    // Al salir del campo LOTE, crea filas automáticas para cada producto CF del lote
    const buscarProductosPorLote = async (codigoProducto, rowIndex, setter) => {
        if (!codigoProducto.trim()) return;
        try {   
            const { data } = await api.get('/api/productos/test', {
                params: { codigo: codigoProducto.trim() }
            });
            if (data && data.length > 0) {
            setter(prev => {
                const antes = prev.slice(0, rowIndex);
                const despues = prev.slice(rowIndex + 1);

                const nuevas = data.map(p => ({
                    ...INITIAL_ROW,
                    cf: p.codigo,
                    codigo: codigoProducto,
                    producto: p.descripcion
                }));

                return [...antes, ...nuevas, ...despues];
            });
        }
    } catch {
        // Error consultando los CF
    }
    };

    const removeRow = (index) => {
        if (rows.length === 1) return;
        setRows(prev => prev.filter((_, i) => i !== index));
    };

    const removeRow2 = (index) => {
        if (rows2.length === 1) return;
        setRows2(prev => prev.filter((_, i) => i !== index));
    };

    const onRowChange = (index, e) => {
        const { name, value } = e.target;
        const valorFinal = shouldUpperCase(name) ? toUpperCase(value) : value;
        setRows(prev => prev.map((row, i) => i === index ? { ...row, [name]: valorFinal } : row));
    };

    const onRowChange2 = (index, e) => {
        const { name, value } = e.target;
        const valorFinal = shouldUpperCase(name) ? toUpperCase(value) : value;
        setRows2(prev => prev.map((row, i) => i === index ? { ...row, [name]: valorFinal } : row));
    };

    const handleGuardar = async (e) => {
        e.preventDefault();

        if (!form.turno || !form.modulo) {
            setMsg("Error: Debes seleccionar el turno y el módulo.");
            return;
        }
        if (!form.numero_importacion?.trim()) {
            setMsg("Error: Debes ingresar el Número de Importación.");
            return;
        }

        const rowsValidas  = rows.filter(r => r.fecha || r.lote_materia_prima);
        const rows2Validas = rows2.filter(r => r.fecha || r.lote_materia_prima);

        if (rowsValidas.length === 0 && rows2Validas.length === 0) {
            setMsg("Error: Debes completar al menos una fila de datos.");
            return;
        }

        setGuardando(true);
        try {
            await api.post('/registros', {
                ...form,
                registros_corte:    rowsValidas,
                cambios_produccion: rows2Validas,
            });
            setMsg("¡Registro guardado exitosamente!");
            setForm(INITIAL_FORM);
            setRows([{ ...INITIAL_ROW }]);
            setRows2([{ ...INITIAL_ROW }]);
        } catch (error) {
            console.error("Error al guardar:", error);
            setMsg("Error: " + (error.response?.data?.error || "No se pudo guardar el registro."));
        } finally {
            setGuardando(false);
        }
    };

    const onChange = (e) => {
        const { name, value, type } = e.target;

        let valorFinal = value;
        if(type === "text" || type === "number" || type === "textarea" || type === "select-one"){
            if (shouldUpperCase(name)) {
                valorFinal = toUpperCase(value);
            }
        }
        setForm({
            ...form,
            [name]: valorFinal,
        });
    };

    return(
        <div id="formulario-corte" className="registro-corte-container">
            {msg && (
                <div className={`toast ${msg.toLowerCase().includes("error") ? "error" : "success"}`}>
                    {msg}
                </div>
            )}
            <header className="logo-principal">
                <div className="logo-img">
                    {/* Logo */}
                    <div className="logo">
                        <img src={logoSafemed} alt="Logo Safemed" style={{ width: '200px', height: '70px', transform: 'translateX(30px)' }} />
                    </div>
                    {/* Línea separadora */}
                    <div className="linea-separadora"></div>
                    {/* Título */}
                    <div style={{ textAlign: 'center', flex: 1}}>
                        <h2 className="titulo">REGISTRO DE CORTE</h2>
                    </div>
                    {/* Línea separadora */}
                    <div className="linea-separadora2"></div>
                    {/* Información derecha */}
                    <div className="informacion-derecha"> 
                        <p><span style={{ color: '#000000', fontWeight: 'bold' }}>Código:</span> RG-GPR-03</p>
                        <p><span style={{ color: '#000000', fontWeight: 'bold' }}>Vigencia:</span> 07-02-2025</p>
                        <p><span style={{ color: '#000000', fontWeight: 'bold' }}>Versión:</span> 08</p>
                    </div>
                </div>
            </header>
            
            <div className = "btn-volver-container">
                <button className="btn-volver" type="button" onClick={() => nav("/")}>
                    ⬅ Volver
                </button>
            </div>

            <form onSubmit={handleGuardar}>
                {/* Para la cabecera del registro*/}
                <div className="cabecera">
                    <div className="grid">
                    <div className="form-group">
                        <label htmlFor="turno"> TURNO: </label>
                        <select id="turno" name="turno" value={form.turno} onChange={onChange} style={{fontSize: "12px"}} className="selector-turno">
                            <option value="">SELECCIONE EL TURNO...</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="modulo"> MODULO: </label>
                        <select id="modulo" name="modulo" value={form.modulo} onChange={onChange} style={{fontSize: "12px"}} className="selector-modulo">
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
                    <div className="form-group">
                            <label htmlFor="responsable_modulo"> RESPONSABLE MODULO: </label>
                            <select id = "responsable_modulo" name= "responsable_modulo"
                                value={form.responsable_modulo || ""}
                                onChange={onChange}
                                disabled={!form.modulo}
                                //onChange={(e) => onChange({ target: { name: e.target.name, value: e.target.value.toUpperCase() } })}
                                className="selector-responsable-modulo"
                            >
                                <option value="">SELECCIONA EL RESPONSABLE DEL MÓDULO...</option>
                                {lideresFiltrados.map((lider, idx) => (
                                    <option key={idx} value={lider}>
                                        {lider}
                                    </option>
                                ))}
                            </select>
                        </div>
                </div>
                </div>
                <div className="cabecera">
                    <div className="grid2">
                        
                    <div className= "form-group">
                        <label htmlFor="responsable"> RESPONSABLE: </label>
                        <select id="responsable" name="responsable" value={form.responsable} onChange={onChange} style={{fontSize: "12px"}} className="selector-responsable">
                            <option value="">SELECCIONA AL RESPONSABLE...</option>
                            {responsables.map((resp, idx) => (
                                <option key={idx} value={resp}>{resp}</option>
                            ))}
                        </select>
                    </div>
                    <div className= "form-group">
                        <label htmlFor="supervisor"> SUPERVISOR DE CORTE:</label>
                        <select id="supervisor" name="supervisor" value={form.supervisor} onChange={onChange} style={{fontSize: "12px", border: "1px solid #2e2d2d"}} className="selector-supervisor">
                            <option value="">SELECCIONA AL SUPERVISOR DE CORTE...</option>
                            <option value="Morales Collaguazo Gabriela Alexandra">Morales Collaguazo Gabriela Alexandra</option>
                            <option value="Vera Baque Angelica Maria">Vera Baque Angelica Maria</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="mesa_corte">MESA DE CORTE: </label>
                        <select id="mesa_corte" name="mesa_corte" value={form.mesa_corte || ""} onChange={onChange} style={{fontSize: "12px"}} className="selector-mesa-corte">
                            <option value="">SELECCIONE LA MESA DE CORTE...</option>
                            <option value="MANUAL">MANUAL</option>
                            <option value="AUTOMÁTICA">AUTOMÁTICA</option>
                        </select>
                    </div>
                </div>
                </div>
                

                {/* La Tabla de los registros de corte */}
                <div className="tabla-registros">

                    {/* ── Registros de Corte ── */}
                    <div className="tabla-seccion-header">
                        <h4>REGISTROS DE CORTE</h4>
                    </div>
                    <div className="tabla-scroll">
                        <table className="tabla-datos">
                            <thead>
                                <tr>
                                    <th>FECHA</th>
                                    <th>LOTE MATERIA PRIMA</th>
                                    <th>CÓDIGO PR.</th>
                                    <th>CÓDIGO CF</th>
                                    <th>PRODUCTO</th>
                                    <th>N° DE IMPORTACIÓN</th>
                                    <th>CANT. TENDIDOS</th>
                                    <th>CANT. UNIDADES</th>
                                    <th>TIPO DE TELA</th>
                                    <th>N° ROLLO</th>
                                    <th>FECHA ENTREGA</th>
                                    <th>CANT. ENTREGADA</th>
                                    <th>ACCIONES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, index) => (
                                    <tr key={index}>
                                        <td><input type="date" name="fecha" value={row.fecha} onChange={(e) => onRowChange(index, e)} className="td-input-fecha" /></td>
                                        <td><input type="text" name="lote_materia_prima" value={row.lote_materia_prima} onChange={(e) => onRowChange(index, e)} className="td-input" /></td>
                                        <td><input type="text" name="cf" value={row.cf} onChange={(e) => onRowChange(index, e)} className="td-input-cf" /></td>
                                        <td><input type="text" name="codigo" value={row.codigo} onChange={(e) => onRowChange(index, e)} onBlur={(e) => buscarProductosPorLote(e.target.value, index, setRows)} placeholder="Ingresa Ej: BCD-003" className="td-input-codigo" /></td>
                                        <td><input type="text" name="producto" value={row.producto} onChange={(e) => onRowChange(index, e)} className="td-input td-input-producto" placeholder="Autocompletado automático" /></td>
                                        <td><input type="text" name="numero_importacion" value={form.numero_importacion} onChange={onChange} className="td-input td-input-num" /></td>
                                        <td><input type="text" name="cantidad_tendidos" value={row.cantidad_tendidos} onChange={(e) => onRowChange(index, e)} className="td-input td-input-num" min="0" /></td>
                                        <td><input type="text" name="cantidad_unidades" value={row.cantidad_unidades} onChange={(e) => onRowChange(index, e)} className="td-input td-input-num" min="0" /></td>
                                        <td><input type="text" name="tipo_tela" value={row.tipo_tela} onChange={(e) => onRowChange(index, e)} className="td-input" /></td>
                                        <td><input type="text" name="numero_rollo" value={row.numero_rollo} onChange={(e) => onRowChange(index, e)} className="td-input td-input-num" /></td>
                                        <td><input type="date" name="fecha_entrega" value={row.fecha_entrega} onChange={(e) => onRowChange(index, e)} className="td-input-fecha" /></td>
                                        <td><input type="text" name="cantidad_entregada" value={row.cantidad_entregada} onChange={(e) => onRowChange(index, e)} className="td-input td-input-num" min="0" /></td>
                                        <td><button type="button" onClick={() => removeRow(index)} className="btn-eliminar-fila" disabled={rows.length === 1}>✕</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="tabla-acciones">
                        <button type="button" onClick={addRow} className="btn-agregar-fila">+ Agregar fila</button>
                    </div>

                    {/* ── Cambios de Producción ── */}
                    <div className="tabla-seccion-header tabla-seccion-cambios">
                        <h4>CAMBIOS DE PRODUCCIÓN</h4>
                    </div>
                    <div className="tabla-scroll">
                        <table className="tabla-datos">
                            <thead>
                                <tr>
                                    <th>FECHA</th>
                                    <th>LOTE MATERIA PRIMA</th>
                                    <th>CF</th>
                                    <th>CÓDIGO</th>
                                    <th>PRODUCTO</th>
                                    <th>N° DE IMPORTACIÓN</th>
                                    <th>CANT. TENDIDOS</th>
                                    <th>CANT. UNIDADES</th>
                                    <th>TIPO DE TELA</th>
                                    <th>N° ROLLO</th>
                                    <th>FECHA ENTREGA</th>
                                    <th>CANT. ENTREGADA</th>
                                    <th>ACCIONES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows2.map((row, index) => (
                                    <tr key={index}>
                                        <td><input type="date" name="fecha" value={row.fecha} onChange={(e) => onRowChange2(index, e)} className="td-input-fecha" /></td>
                                        <td><input type="text" name="lote_materia_prima" value={row.lote_materia_prima} onChange={(e) => onRowChange2(index, e)} className="td-input" /></td>
                                        <td><input type="text" name="cf" value={row.cf} onChange={(e) => onRowChange2(index, e)} className="td-input-cf" /></td>
                                        <td><input type="text" name="codigo" value={row.codigo} onChange={(e) => onRowChange2(index, e)} onBlur={(e) => buscarProductosPorLote(e.target.value, index, setRows2)} placeholder="Ingresa Ej: BCD-003" className="td-input-codigo" /></td>
                                        <td><input type="text" name="producto" value={row.producto} onChange={(e) => onRowChange2(index, e)} className="td-input td-input-producto td-input-readonly" readOnly placeholder="Autocompletado automático" /></td>
                                        <td><input type="text" name="numero_importacion" value={row.numero_importacion} onChange={(e) => onRowChange2(index, e)} className="td-input td-input-num" /></td>
                                        <td><input type="text" name="cantidad_tendidos" value={row.cantidad_tendidos} onChange={(e) => onRowChange2(index, e)} className="td-input td-input-num" min="0" /></td>
                                        <td><input type="text" name="cantidad_unidades" value={row.cantidad_unidades} onChange={(e) => onRowChange2(index, e)} className="td-input td-input-num" min="0" /></td>
                                        <td><input type="text" name="tipo_tela" value={row.tipo_tela} onChange={(e) => onRowChange2(index, e)} className="td-input" /></td>
                                        <td><input type="text" name="numero_rollo" value={row.numero_rollo} onChange={(e) => onRowChange2(index, e)} className="td-input td-input-num" /></td>
                                        <td><input type="date" name="fecha_entrega" value={row.fecha_entrega} onChange={(e) => onRowChange2(index, e)} className="td-input-fecha" /></td>
                                        <td><input type="text" name="cantidad_entregada" value={row.cantidad_entregada} onChange={(e) => onRowChange2(index, e)} className="td-input td-input-num" min="0" /></td>
                                        <td><button type="button" onClick={() => removeRow2(index)} className="btn-eliminar-fila" disabled={rows2.length === 1}>✕</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="tabla-acciones">
                        <button type="button" onClick={addRow2} className="btn-agregar-fila">+ Agregar fila</button>
                    </div>

                    <div className="observaciones">
                        <label>OBSERVACIONES:</label>
                        <textarea name="observaciones" value={form.observaciones} onChange={onChange} placeholder="Observaciones..." className="observaciones-textarea"></textarea>
                    </div>
                    <button type="submit" className="btn-guardar-registro" disabled={guardando}>
                        {guardando ? "Guardando..." : "Guardar Registro"}
                    </button>
                </div>
            </form>

        </div>
    );
}