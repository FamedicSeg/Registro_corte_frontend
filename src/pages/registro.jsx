import { useEffect, useState } from "react";
import { api, obtenerLotesMateriaPrima } from "../services/api";
import "../styles/registro.css";
import { useNavigate } from "react-router-dom";
import logoSafemed from "../assets/safemedic.png";
//import { v4 as uuidv4 } from "uuid";
import { toUpperCase, shouldUpperCase } from "../utils/textUtils";

let rowSequence = 0;

const createRowId = () => {
    rowSequence += 1;
    return `row-${rowSequence}`;
};

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
        cf: "",
        codigo: "",
        producto: "",
        numero_importacion: "",
        cantidad_tendidos: "",
        cantidad_unidades: "",
        tipo_tela: "",
        descripcion_tipo_tela: "",
        numero_rollo: "",
        fecha_entrega: "",
        cantidad_entregada: "",
    };
    const [rows, setRows] = useState([{ ...INITIAL_ROW, id: "row-inicial-1" }]);
    const [rows2, setRows2] = useState([{ ...INITIAL_ROW, id: "row-inicial-2" }]);

    const addRow = () => setRows(prev => [...prev, { ...INITIAL_ROW, id: createRowId() }]);

    const addRow2 = () => setRows2(prev => [...prev, { ...INITIAL_ROW, id: createRowId() }]);

    const esCodigoCf = (codigo = "") => {
        const valor = String(codigo || "").trim().toUpperCase();
        return /^CF(?:[-\s_]*[A-Z0-9]+)+$/.test(valor);
    };

    const obtenerInsumosDelCf = (cfItem) => {
        if (!cfItem) return [null];

        const raw = cfItem.insumos || cfItem.insumo || cfItem.detalle?.insumos || cfItem.detalle?.insumo || [];

        if (Array.isArray(raw)) return raw.length ? raw : [null];
        if (raw) return [raw];
        return [null];
    };

    const normalizarInsumos = (insumos = []) => {
        const lista = obtenerInsumosDelCf({ insumos });
        return lista.filter(Boolean);
    };

    const extraerCodigosTela = (valor = "") => {
        const texto = String(valor || "").trim();
        if (!texto) return [];

        const partes = texto.split(/[\/|,]/).map(item => item.trim()).filter(Boolean);
        const codigos = partes.flatMap(item => item.split(/\s+/).filter(Boolean));
        return [...new Set(codigos.filter(item => /^TEL/i.test(item)))];
    };

    const poblarLotesDesdeTipoTela = async (tipoTela = "", setter, rowIndex) => {
        const codigos = extraerCodigosTela(tipoTela);
        if (!codigos.length) return;

        const lotesRespuesta = await Promise.all(
            codigos.map(async (codigoTela) => {
                const resultados = await obtenerLotesMateriaPrima(codigoTela);
                return Array.isArray(resultados) ? resultados.filter(Boolean) : [];
            })
        );

        const lotesUnicos = [...new Set(lotesRespuesta.flat())];
        if (!lotesUnicos.length) return;

        setter(prev => prev.map((row, i) => i === rowIndex ? { ...row, lote_materia_prima: lotesUnicos.join(' / ') } : row));
    };

    const buscarProductosPorLote = async (codigo, rowIndex, setter, origen = "codigo") => {
        const codigoBuscado = String(codigo || "").trim();
        if (!codigoBuscado) return;

        try {
            if (esCodigoCf(codigoBuscado)) {
                const { data } = await api.post('/api/onedrive/buscar-producto', { productoId: codigoBuscado });
                const cfItem = data?.data && typeof data.data === 'object' && !Array.isArray(data.data)
                    ? data.data
                    : Array.isArray(data?.data)
                        ? data.data.find(item => String(item.codigo || item.cf || "").toUpperCase() === codigoBuscado.toUpperCase()) || data.data[0]
                        : data?.item || data || null;

                if (!cfItem) return;

                const insumos = normalizarInsumos(cfItem.insumos || []);
                const tipoTela = insumos.map(item => item.codigo || "NO APLICA").join(' / ') || 'NO APLICA';
                const descripcionTela = insumos.map(item => item.descripcion || item.nombre || "").filter(Boolean).join(' / ') || 'NO APLICA';

                if (insumos.length > 1 && origen === 'cf') {
                    const filaOrigen = rows[rowIndex] || INITIAL_ROW;
                    const nuevas = await Promise.all(insumos.map(async (insumo, index) => {
                        const lotes = await obtenerLotesMateriaPrima(insumo?.codigo || "");
                        const loteFinal = Array.isArray(lotes) ? [...new Set(lotes.filter(Boolean))].join(' / ') : "";

                        return {
                            ...INITIAL_ROW,
                            id: createRowId(),
                            fecha: filaOrigen.fecha,
                            lote_materia_prima: loteFinal,
                            cf: cfItem.codigo || codigoBuscado,
                            codigo: filaOrigen.codigo || codigoBuscado,
                            producto: cfItem.descripcion || cfItem.nombre || cfItem.producto || cfItem.codigo || "",
                            tipo_tela: insumo?.codigo || "NO APLICA",
                            descripcion_tipo_tela: insumo?.descripcion || insumo?.nombre || "NO APLICA",
                            numero_importacion: filaOrigen.numero_importacion,
                            ...(index === 0 ? { cantidad_tendidos: filaOrigen.cantidad_tendidos, cantidad_unidades: filaOrigen.cantidad_unidades, numero_rollo: filaOrigen.numero_rollo, fecha_entrega: filaOrigen.fecha_entrega, cantidad_entregada: filaOrigen.cantidad_entregada } : {})
                        };
                    }));

                    setter(prev => {
                        const antes = prev.slice(0, rowIndex);
                        const despues = prev.slice(rowIndex + 1);
                        return [...antes, ...nuevas, ...despues];
                    });
                    return;
                }

                setter(prev => prev.map((row, i) => {
                    if (i !== rowIndex) return row;

                    const codigoActual = origen === 'cf' ? row.codigo : codigoBuscado;

                    return {
                        ...row,
                        cf: cfItem.codigo || codigoBuscado,
                        codigo: codigoActual,
                        producto: cfItem.descripcion || cfItem.nombre || cfItem.producto || cfItem.codigo || "",
                        tipo_tela: tipoTela,
                        descripcion_tipo_tela: descripcionTela,
                    };
                }));

                await poblarLotesDesdeTipoTela(tipoTela, setter, rowIndex);
                return;
            }

            const { data } = await api.post('/api/onedrive/buscar-productos-por-lote', { codigo: codigoBuscado });
            const items = Array.isArray(data?.data) ? data.data : [];

            if (items.length > 0) {
                const nuevas = await Promise.all(items.flatMap(async (cfItem) => {
                    const insumos = normalizarInsumos(cfItem.insumos || []);
                    if (insumos.length === 0) {
                        return [{
                            ...INITIAL_ROW,
                            id: createRowId(),
                            fecha: "",
                            lote_materia_prima: "",
                            cf: cfItem.codigo,
                            codigo: codigoBuscado,
                            producto: cfItem.descripcion || cfItem.codigo || "",
                            tipo_tela: "NO APLICA",
                            descripcion_tipo_tela: "NO APLICA",
                        }];
                    }

                    const filasPorCf = await Promise.all(insumos.map(async (insumo) => {
                        const codigoTela = insumo?.codigo || "";
                        const lotes = codigoTela ? await obtenerLotesMateriaPrima(codigoTela) : [];
                        const loteFinal = Array.isArray(lotes) ? [...new Set(lotes.filter(Boolean))].join(' / ') : "";

                        return {
                            ...INITIAL_ROW,
                            id: createRowId(),
                            fecha: "",
                            lote_materia_prima: loteFinal,
                            cf: cfItem.codigo,
                            codigo: codigoBuscado,
                            producto: cfItem.descripcion || cfItem.codigo || "",
                            tipo_tela: codigoTela || "NO APLICA",
                            descripcion_tipo_tela: insumo?.descripcion || insumo?.nombre || "NO APLICA",
                        };
                    }));

                    return filasPorCf;
                }));

                setter(prev => {
                    const antes = prev.slice(0, rowIndex);
                    const despues = prev.slice(rowIndex + 1);
                    return [...antes, ...nuevas.flat(), ...despues];
                });
            }
        } catch {
            // código no encontrado o error de red
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

    const completarLoteMateriaPrima = async (codigo, index, setter) => {
        const codigos = extraerCodigosTela(codigo);
        if (!codigos.length) return;

        const lotesRespuesta = await Promise.all(
            codigos.map(async (codigoTela) => {
                const lotes = await obtenerLotesMateriaPrima(codigoTela);
                return Array.isArray(lotes) ? lotes.filter(Boolean) : [];
            })
        );

        const lotesUnicos = [...new Set(lotesRespuesta.flat())];
        if (!lotesUnicos.length) return;

        setter(prev => prev.map((row, i) => i === index ? { ...row, lote_materia_prima: lotesUnicos.join(' / ') } : row));
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

    {/*}
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");
    const fechaHoy = `${yyyy}-${mm}-${dd}`;
    */}

    const handleGuardar = async (e) => {
        e.preventDefault();

        if (!form.turno || !form.modulo) {
            setMsg("Error: Debes seleccionar el turno y el módulo.");
            return;
        }
        const rowsValidas  = rows.filter(r => r.fecha || r.lote_materia_prima);
        const rows2Validas = rows2.filter(r => r.fecha || r.lote_materia_prima);

        const filas = [...rowsValidas, ...rows2Validas];
        const numeroImportacion = filas.find((row) => row.numero_importacion?.trim())?.numero_importacion || "";
        if (!numeroImportacion.trim()) {
            setMsg("Error: Debes ingresar el Número de Importación.");
            return;
        }

        if (rowsValidas.length === 0 && rows2Validas.length === 0) {
            setMsg("Error: Debes completar al menos una fila de datos.");
            return;
        }

        setGuardando(true);
        try {
            await api.post('/api/registros', {
                ...form,
                numero_importacion: numeroImportacion,
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
                                    <th>CÓDIGO</th>
                                    <th>CÓDIGO CF</th>
                                    <th>PRODUCTO</th>
                                    <th>N° DE IMPORTACIÓN</th>
                                    <th>CANT. TENDIDOS</th>
                                    <th>CANT. UNIDADES</th>
                                    <th>TIPO DE TELA</th>
                                    <th>DESCRIPCIÓN TELA</th>
                                    <th>N° ROLLO</th>
                                    <th>FECHA ENTREGA</th>
                                    <th>CANT. ENTREGADA</th>
                                    <th>ACCIONES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, index) => (
                                    <tr key={row.id || index}>
                                        <td><input type="date" name="fecha" value={row.fecha} onChange={(e) => onRowChange(index, e)} className="td-input-fecha" /></td>
                                        <td><input type="text" name="lote_materia_prima" value={row.lote_materia_prima} onChange={(e) => onRowChange(index, e)} className="td-input" /></td>
                                        <td><input type="text" name="codigo" value={row.codigo} onChange={(e) => onRowChange(index, e)} onBlur={async (e) => {
                                            const valor = e.target.value;
                                            await completarLoteMateriaPrima(valor, index, setRows);
                                            buscarProductosPorLote(valor, index, setRows, 'codigo');
                                        }} placeholder="Ej: EQE-047" className="td-input-codigo" readOnly={Boolean(row.cf)} /></td>
                                        <td><input type="text" name="cf" value={row.cf} placeholder="Ej: CF-CAP-001" onChange={(e) => onRowChange(index, e)} onBlur={(e) => buscarProductosPorLote(e.target.value, index, setRows, 'cf')} className="td-input-cf" /></td>
                                        <td><input type="text" name="producto" value={row.producto} onChange={(e) => onRowChange(index, e)} className="td-input td-input-producto" placeholder="Autocompletado automático" /></td>
                                        <td><input type="text" name="numero_importacion" value={row.numero_importacion} onChange={(e) => onRowChange(index, e)} className="td-input td-input-num" /></td>
                                        <td><input type="number" name="cantidad_tendidos" value={row.cantidad_tendidos} onChange={(e) => onRowChange(index, e)} className="td-input td-input-num" min="0" /></td>
                                        <td><input type="number" name="cantidad_unidades" value={row.cantidad_unidades} onChange={(e) => onRowChange(index, e)} className="td-input td-input-num" min="0" /></td>
                                        <td><input type="text" name="tipo_tela" value={row.tipo_tela} onChange={(e) => onRowChange(index, e)} className="td-input" /></td>
                                        <td><input type="text" name="descripcion_tipo_tela" value={row.descripcion_tipo_tela} onChange={(e) => onRowChange(index, e)} className="td-input td-input-producto"/></td>
                                        <td><input type="text" name="numero_rollo" value={row.numero_rollo} onChange={(e) => onRowChange(index, e)} className="td-input td-input-num" /></td>
                                        <td><input type="date" name="fecha_entrega" value={row.fecha_entrega} onChange={(e) => onRowChange(index, e)} className="td-input-fecha" /></td>
                                        <td><input type="number" name="cantidad_entregada" value={row.cantidad_entregada} onChange={(e) => onRowChange(index, e)} className="td-input td-input-num" min="0" /></td>
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
                                    <th>CÓDIGO</th>
                                    <th>CÓDIGO CF</th>
                                    <th>PRODUCTO</th>
                                    <th>N° DE IMPORTACIÓN</th>
                                    <th>CANT. TENDIDOS</th>
                                    <th>CANT. UNIDADES</th>
                                    <th>TIPO DE TELA</th>
                                    <th>DESCRIPCIÓN TELA</th>
                                    <th>N° ROLLO</th>
                                    <th>FECHA ENTREGA</th>
                                    <th>CANT. ENTREGADA</th>
                                    <th>ACCIONES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows2.map((row, index) => (
                                    <tr key={row.id || index}>
                                        <td><input type="date" name="fecha" value={row.fecha} onChange={(e) => onRowChange2(index, e)} className="td-input-fecha" /></td>
                                        <td><input type="text" name="lote_materia_prima" value={row.lote_materia_prima} onChange={(e) => onRowChange2(index, e)} className="td-input" /></td>
                                        <td><input type="text" name="codigo" value={row.codigo} onChange={(e) => onRowChange2(index, e)} onBlur={async (e) => {
                                            const valor = e.target.value;
                                            await completarLoteMateriaPrima(valor, index, setRows2);
                                            buscarProductosPorLote(valor, index, setRows2, 'codigo');
                                        }} placeholder="Ingresa Ej: EQE-047" className="td-input-codigo" readOnly={Boolean(row.cf)} /></td>
                                        <td><input type="text" name="cf" value={row.cf} onChange={(e) => onRowChange2(index, e)} onBlur={(e) => buscarProductosPorLote(e.target.value, index, setRows2, 'cf')} className="td-input-cf" /></td>
                                        <td><input type="text" name="producto" value={row.producto} onChange={(e) => onRowChange2(index, e)} className="td-input td-input-producto td-input-readonly" readOnly placeholder="Autocompletado automático" /></td>
                                        <td><input type="text" name="numero_importacion" value={row.numero_importacion} onChange={(e) => onRowChange2(index, e)} className="td-input td-input-num" /></td>
                                        <td><input type="number" name="cantidad_tendidos" value={row.cantidad_tendidos} onChange={(e) => onRowChange2(index, e)} className="td-input td-input-num" min="0" /></td>
                                        <td><input type="number" name="cantidad_unidades" value={row.cantidad_unidades} onChange={(e) => onRowChange2(index, e)} className="td-input td-input-num" min="0" /></td>
                                        <td><input type="text" name="tipo_tela" value={row.tipo_tela} onChange={(e) => onRowChange2(index, e)} className="td-input" /></td>
                                        <td><input type="text" name="descripcion_tipo_tela" value={row.descripcion_tipo_tela} onChange={(e) => onRowChange2(index, e)} className="td-input td-input-producto" /></td>
                                        <td><input type="text" name="numero_rollo" value={row.numero_rollo} onChange={(e) => onRowChange2(index, e)} className="td-input td-input-num" /></td>
                                        <td><input type="date" name="fecha_entrega" value={row.fecha_entrega} onChange={(e) => onRowChange2(index, e)} className="td-input-fecha" /></td>
                                        <td><input type="number" name="cantidad_entregada" value={row.cantidad_entregada} onChange={(e) => onRowChange2(index, e)} className="td-input td-input-num" min="0" /></td>
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