import { useEffect, useState, useMemo, useRef} from "react";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";
import "../styles/panelRol.css";
import AdminUsuarios from "../components/AdminUsuarios";
import ModalRechazo from "../components/ModalRechazo";

export default function PanelRol(){
    const [filtroTexto, setFiltroTexto] = useState(() => sessionStorage.getItem("panelFiltroTexto") || "");
    const [filtroEstado, setFiltroEstado] = useState(() => sessionStorage.getItem("panelFiltroEstado") || "todos");
    const [filtroTipoFecha, setFiltroTipoFecha] = useState(() => sessionStorage.getItem("panelFiltroTipoFecha") || "todos");
    const [filtroFechaSeleccionada, setFiltroFechaSeleccionada] = useState(() => sessionStorage.getItem("panelFiltroFechaSeleccionada") || "");
    const [registros, setRegistros] = useState([]);
    const [cargando, setCargando] = useState(false);
    {/* const [aprobado, setAprobado] = useState(false);
    const [mostrarAdmin, setMostrarAdmin] = useState(false); */}
    const [modalRechazoOpen, setModalRechazoOpen] = useState(false);
    const [registroSeleccionado, setRegistroSeleccionado] = useState(null);

    const nav = useNavigate();
    const user = useMemo(() => {
        const stored = localStorage.getItem("user");
        return stored ? JSON.parse(stored) : null;
    }, []);


    const rol = user?.rol || "";

    // Función para obtener el título mostrado según el rol del usuario
    const getTituloPorRol = () => {
        return rol; 
    }

    // Función para obtener el título mostrado según el rol del usuario
    const esResponsable = rol === "RESPONSABLE";
    const esSupervisor = rol === "SUPERVISOR DE CORTE";
    const esAnalista = rol === "ANALISTA DE PRODUCCIÓN";

    // HELPERS PARA EL FILTRO DE FECHAS
    const normalizarFecha = (fechaStr) => {
        if(!fechaStr) return "";
        if(/^\d{2}\/\d{2}\/\d{4}$/.test(fechaStr)) {
            const [d, m, y] = fechaStr.split("/");
            return `${y}-${m}-${d}`;
        }
        if(/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) return fechaStr.substring(0, 10);
        const date = new Date(fechaStr);
        if (!isNaN(date)) return date.toISOString().substring(0, 10);
        return fechaStr;
    };

    const getWeekRange = (dateStr) =>{
        const date = new Date (dateStr + "T00:00:00");
        const day = date.getDay();
        const diffStart = day === 0 ? -6 : 1 - day;
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() + diffStart);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return { startOfWeek, endOfWeek };
    };

    const puedeEliminar = useMemo(() => 
        rol === "SUPERVISOR DE CORTE" || rol === "RESPONSABLE",
    [rol]);

    const cargarRegistrosRef = useRef();

    useEffect(() => {
    const fetchData = async () => {
        if (!user) return;
        console.log("fetchData llamado con user:", user);
        try{
            setCargando(true);
            const res = await api.get("/api/registros/mi-perfil", {
                params: {
                    nombre: user.nombre,
                    rol: user.rol,
                }
                
            }
        );
        console.log("Respuesta de API:", res.data);
            setRegistros(Array.isArray(res.data) ? res.data : []);
        }catch (error){
            console.error("Error al cargar los registros: ", error);
        }finally{
            setCargando(false);
        }
    };
    cargarRegistrosRef.current = fetchData;
    fetchData();
    }, [user]);

    // Persistir con los filtros de sessionStorage
    useEffect(() => {
        sessionStorage.setItem("panelFiltroTexto", filtroTexto);
    }, [filtroTexto]);

    useEffect(() => {
        sessionStorage.setItem("panelFiltroEstado", filtroEstado);
    }, [filtroEstado]);

    useEffect(() => {
        sessionStorage.setItem("panelFiltroTipoFecha", filtroTipoFecha);
    }, [filtroTipoFecha]);

    useEffect(() => {
        sessionStorage.setItem("panelFiltroFechaSeleccionada", filtroFechaSeleccionada);
    }, [filtroFechaSeleccionada]);

    // Eliminamos el registro
    const eliminarRegistro = async (id, estadoActual) => {
        if(estadoActual !== "pendiente Supervisor"){
            alert("Solo se pueden eliminar registros pendientes de aprobación por el Supervisor.");
            return;
        }
        if(!window.confirm("¿Está seguro de que desea eliminar este registro?")){
            return;
        } 
        try{
            await api.delete(`/api/registros/${id}`);
            alert("Registro eliminado correctamente.");
            await cargarRegistrosRef.current();
        } catch(error){
            console.error("Error al eliminar el registro: ", error);
            alert( error.response?.data?.error || "Ocurrió un error al eliminar el registro. Por favor, inténtelo de nuevo.");
        }
    };

    // FILTRO DE REGISTROS
    const registrosFiltrados = 
        ["ADMINISTRADOR", "SUPERVISOR DE CORTE", "RESPONSABLE", "ANALISTA DE PRODUCCIÓN"].includes(rol)
        ? registros.filter((r) => {
            // FILTRO POR FECHA (día o semana)
            if(filtroTipoFecha !== "todos" && filtroFechaSeleccionada){
                const fechaNorm = normalizarFecha(r.fecha);
                if(filtroTipoFecha === "dia"){
                    if(fechaNorm !== filtroFechaSeleccionada) return false;
                } else if (filtroTipoFecha === "semana"){
                    const { startOfWeek, endOfWeek } = getWeekRange(filtroFechaSeleccionada);
                    const fechaRegistro = new Date(fechaNorm + "T00:00:00");
                    if(fechaRegistro < startOfWeek || fechaRegistro > endOfWeek) return false;
                }
            }
            const texto = filtroTexto.toLowerCase();
            if (Array.isArray(r.maquinasSeleccionadas)) {
                const encontrado = r.maquinasSeleccionadas.some((m) =>
                    String(m?.label || m?.nombre || m?.id || "")
                        .toLowerCase()
                        .includes(texto)
                );
                if(encontrado) return true;
            }
            return Object.values(r).some((val) =>
                String(val || "")
                    .toLowerCase()
                    .includes(texto)
            );
        })
        : registros;

    const registrosPorEstadoSinOrden = registrosFiltrados.filter((r) => {
        const estado = (r.estado || "pendiente").toLowerCase();
        if(filtroEstado === "pendientes") return estado.includes("pendiente");
        if(filtroEstado === "aprobados") return estado.includes("aprobado");
        if(filtroEstado === "rechazados") return estado.includes("rechazado");
        if(filtroEstado === "pendiente Supervisor") return estado.includes("pendiente") && estado.includes("supervisor de corte");
        return true;
    });

    const ordenarPorFecha = rol === "ANALISTA DE PRODUCCIÓN" || rol === "SUPERVISOR DE CORTE";

    const registrosPorEstado = ordenarPorFecha
    ? [...registrosPorEstadoSinOrden].sort((a, b) => {
        const fechaA = a.fecha ? new Date(a.fecha) : new Date(0);
        const fechaB = b.fecha ? new Date(b.fecha) : new Date(0);
        return fechaB - fechaA;
    })
    : registrosPorEstadoSinOrden;

    const counts = useMemo(() => {
        const acc = {
            aprobados: 0,
            pSupervisor: 0,
            rechazados: 0
        };
        registros.forEach((r) => {
            const s = (r.estado || "").toLowerCase();
            if(s.includes("aprob")) acc.aprobados++;
            if(s.includes("supervisor")) acc.pSupervisor++;
            if(s.includes("rechazado")) acc.rechazados++;
        });
        acc.total = registros.length;
        return acc;
    }, [registros]);

    // Funciones para determinar estado
    const esEstadoPendienteSupervisor = (estado) => {
        return estado?.toLowerCase().includes("supervisor");
    };
    
    const verDetalle = (id) => {
        nav(`/editar-registro/${id}`);
    };

    const handleLogout = () => {
        localStorage.removeItem("user");
        nav("/login");
    };

    /*
    const verificar = async (id) => {
        if(!window.confirm("¿Está seguro de que desea verificar este registro?")) return;
        try{
            setVerificado(true);
            const response = await api.put(`/api/registros/${id}/verificar`, {
                usuarios: user.nombre,
                rol: user.rol 
            });
            if (response.data.registro){
                setRegistro(prev => 
                    prev.map(r => r.id === id ? response.data.registro : r)
                );
            } else {
                await cargarRegistros();
            }
        } catch (error) {
            console.error("Error: ",error.response?.data || error);
            alert(error.response?.data?.error || "Error al verificar el registro. Por favor, inténtelo de nuevo.");
        } finally {
            setVerificado(false);
        }
    };
*/
    const handleRechazarClick = (registro) => {
        setRegistroSeleccionado(registro);
        setModalRechazoOpen(true);
    };

    const handleRechazado = async () =>{
        await cargarRegistrosRef.current();
    };

    if(!user){
        return <div>No hay usuario logueado. Regresa a Iniciar Sesión e ingresa tus credenciales</div>;
    }

    if(rol === "ADMINISTRADOR") {
        return (
            <div className="panel-rol-container">
                <div className="panel-rol-header">
                    <div>
                        <h3>SISTEMA GESTIÓN DE REGISTROS</h3>
                    </div>
                    <button className="panel-btn panel-btn-logout" onClick={handleLogout}>
                        Salir
                    </button>
                </div>
                <AdminUsuarios onClose={handleLogout} />
            </div>
        );
    }

    console.log("Renderizando PanelRol, rol:", rol, "registros:", registros.length, "cargando:", cargando);

    return (
        <div className="panel-rol-container">
            <div className="panel-rol-header">
                <div className="panel-rol-titulos">
                    <h2>Panel de {getTituloPorRol()}</h2>
                    <h3>SISTEMA DE GESTIÓN DE REGISTROS</h3>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:"8px", flex: 1, minWidth: 0}}>
                    {/* Filtro Buscardor y Estado */}
                    {(!esSupervisor) && (
                        <div style={{ display:"flex", gap:"10px", alignItems:"center", transform: "translateX(600px) translateY(-30px)"}}>
                            <div style={{
                                display: "flex",
                                gap: "6px",
                                backgroundColor: "#f5f5f5",
                                padding: "6px",
                                borderRadius: "8px",
                                border: "1px solid #ddd"
                            }}>
                                {[
                                    {valor: "todos", label: "Todos"},
                                    {valor: "pendientes", label: `Pendientes (${counts.pSupervisor})`},
                                    {valor: "aprobados", label: `Aprobados (${counts.aprobados})`},
                                    {valor: "rechazados", label: `Rechazados (${counts.rechazados})`},
                                ].map(opcion => (
                                    <button
                                        key={opcion.valor}
                                        onClick={() => setFiltroEstado(opcion.valor)}
                                        style={{
                                            padding: "8px 16px",
                                            borderRadius: "6px",
                                            border: "none",
                                            backgroundColor: filtroEstado === opcion.valor ? "#007bff" : "#fff",
                                            color: filtroEstado === opcion.valor ? "#fff" : "#333",
                                            cursor: "pointer",
                                            fontSize: "13px",
                                            fontWeight: filtroEstado === opcion.valor ? "600" : "500",
                                            transition: "all 0.3s ease",
                                            boxShadow: filtroEstado === opcion.valor ? "0 2px 8px rgba(0,123,255,0.3)" : "none"
                                        }}
                                        >
                                        {opcion.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Filtro por texto 
                    {(esAnalista || esSupervisor) && (
                        <div style={{display: "flex", gap:"8px", alignItems:"center"}}>
                            <span style={{ fontSize: "13px", color: "#555", fontWeight: "500" }}>🔍 Buscar:</span>
                            <input
                                type="text"
                                placeholder="Buscar por cualquier campo..."
                                value={filtroTexto}
                                onChange={(e) => setFiltroTexto(e.target.value)}
                                style={{
                                    padding: "8px 12px",
                                    borderRadius: "6px",
                                    border: "1px solid #ddd",
                                    fontSize: "13px",
                                    width: "280px",
                                    outline: "none"
                                }}
                            />
                            {filtroTexto && (
                                <button 
                                onClick={() => setFiltroTexto("")}
                                style={{
                                    padding: "7px 10px",
                                    borderRadius: "6px",
                                    border: "1px solid #ddd",
                                    backgroundColor: "#fff",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    color: "#666"
                                }}
                                >
                                    ❌ Limpiar
                                </button>
                            )}
                        </div>
                    )} */}
                </div>

                {!esResponsable && (
                    <div style={{display: "flex", flexDirection: "column", gap:"8px", flex: 1, minWidth: 0}}>
                        {/* Fila para el filtro por fecha */}
                        <div style={{display: "flex", gap:"8px", alignItems: "center", flexWrap: "wrap", justifyContent:"center"}}>
                            <span style={{fontSize: "13px", color: "#555", fontWeight: "500" }}>📅 Fecha:</span>
                            <div style={{
                                display: "flex",
                                gap: "4px",
                                backgroundColor: "#f5f5f5",
                                padding: "4px",
                                borderRadius: "8px",
                                border: "1px solid #ddd"
                            }}>
                                {[
                                    {valor: "todos", label:"Todos"},
                                    {valor: "dia", label:"Día"},
                                    {valor: "semana", label:"Semana"}
                                ].map(opcion => (
                                    <button
                                        key={opcion.valor}
                                        onClick={() => { setFiltroTipoFecha(opcion.valor); setFiltroFechaSeleccionada(""); }}
                                        style={{
                                            padding: "6px 14px",
                                            borderRadius: "6px",
                                            border: "none",
                                            backgroundColor: filtroTipoFecha === opcion.valor ? "#2563eb" : "#fff",
                                            color: filtroTipoFecha === opcion.valor ? "#fff" : "#333",
                                            cursor: "pointer",
                                            fontSize: "13px",
                                            fontWeight: filtroTipoFecha === opcion.valor ? "600" : "500",
                                            transition: "all 0.3s ease",
                                            boxShadow: filtroTipoFecha === opcion.valor ? "0 2px 8px rgba(37,99,235,0.3)" : "none"
                                        }}
                                    > 
                                        {opcion.label}
                                    </button>
                                ))}
                                {filtroTipoFecha !== "todos" && (
                                    <input
                                        type="date"
                                        value={filtroFechaSeleccionada}
                                        onChange={(e) => setFiltroFechaSeleccionada(e.target.value)}
                                        style={{
                                            padding: "7px 12px",
                                            borderRadius: "6px",
                                            border: "1px solid #ddd",
                                            fontSize: "12px",
                                            cursor: "pointer",
                                            backgroundColor: "#f5f5f5",
                                            color: "#090909",
                                            width: "160px"
                                        }}
                                    />
                                )}
                                <div style={{display:"flex", gap:"8px", alignItems:"center"}}>
                                    {filtroTipoFecha === "semana" && filtroFechaSeleccionada && (() => {
                                        const { startOfWeek, endOfWeek } = getWeekRange(filtroFechaSeleccionada);
                                        const fmt = (d) => d.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
                                        return (
                                            <span style={{ fontSize: "12px", color: "#2563eb", fontWeight: "500" }}>
                                                {fmt(startOfWeek)} — {fmt(endOfWeek)}
                                            </span>
                                        );
                                    })()}

                                    {filtroTipoFecha !== "todos" && filtroFechaSeleccionada && (
                                        <button
                                            onClick={() => setFiltroFechaSeleccionada("")}
                                            style={{
                                                padding: "5px 10px",
                                                borderRadius: "6px",
                                                border: "1px solid #ddd",
                                                backgroundColor: "#fff",
                                                cursor: "pointer",
                                                fontSize: "12px",
                                                color: "#666"
                                            }}
                                        >
                                        ✕ Limpiar
                                        </button>
                                    )}
                                </div>      
                            </div>
                        </div>
                    </div>
                )}
                <div className="btn-logout">
                    <button className="panel-btn panel-btn-logout" onClick={handleLogout}>
                        Salir
                    </button>
                </div>
            </div>

            {cargando ? (
                <div  style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
                    <div style={{ fontSize: "16px", fontWeight: "500" }}>⏳ Cargando registros...</div>
                </div>
            ) : registrosPorEstado.length === 0 ? (
                <div style={{
                        padding: 40, 
                        textAlign: "center", 
                        backgroundColor: "#f9fafb",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb"
                }}>
                    <div style={{ fontSize: "16px", fontWeight: "500", color: "#6b7280" }}>
                        No hay registros que mostrar
                    </div>
                </div>
            ) : (
                <div style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
                }}>
                    <table className="panel-rol-table">
                        <thead className="panel-rol-head">
                            <tr>
                                <th>TURNO</th>
                                <th>MÓDULO</th>
                                <th>RESPONSABLE DEL MÓDULO</th>
                                <th>RESPONSABLE</th>
                                <th>N° DE IMPORTACIÓN</th>
                                <th>MESA DE CORTE</th>
                                <th>ESTADO</th>
                                <th>ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody className="panel-rol-body">
                            {registrosPorEstado.map((r) => (
                                <tr key={r.id}>
                                    <td>{r.turno}</td>
                                    <td>{r.modulo}</td>
                                    <td>{r.responsable_modulo}</td>
                                    <td>{r.responsable}</td>
                                    <td>{r.numero_importacion}</td>
                                    <td>{r.mesa_corte}</td>
                                    <td style={{ textAlign: "center", fontWeight: "bold" }}>{r.estado}</td>
                                    <td>
                                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                            <button
                                                className="panel-btn panel-btn-view"
                                                onClick={() => verDetalle(r.id)}
                                            >
                                                Ver Registro
                                            </button>
                                            {/* Rechazar 
                                            {(
                                                (esSupervisor && esEstadoPendienteSupervisor(r.estado))
                                            ) && (
                                                <button
                                                    className="panel-btn panel-btn-rechazar"
                                                    onClick={() => handleRechazarClick(r)}
                                                >
                                                    ✕ Rechazar
                                                </button>
                                            )}
                                            */}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ModalRechazo
                isOpen={modalRechazoOpen}
                onClose={() => setModalRechazoOpen(false)}
                registroId={registroSeleccionado?.id}
                onRechazado={handleRechazado}
                usuario={user}
            />
        </div>
    );
}
