import { useNavigate  } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "../services/api";
import '../styles/login.css';


export default function Login(){

    const [usuarios, setUsuarios] = useState([]);    
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [cargando, setCargando] = useState(false);
    const [cargandoLogin, setCargandoLogin] = useState(false);
    const nav = useNavigate();

    useEffect(() => {
        const cargarUsuarios = async () =>{
            setCargando(true);
            try{
                const { data } = await api.get('api/usuarios/');
                setUsuarios(data);
            } catch(error){
                console.error("Error al cargar los usuarios, revise la conexión con el servidor o tu conexión a internet", error);
                alert("Error al cargar los usuarios, revise la conexión con el servidor o tu conexión a internet");
            } finally {
                setCargando(false);
            }
        };
        cargarUsuarios();
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setCargandoLogin(true);
        try{
            const res = await api.post('/api/login', { username, password });
            console.log("Login exitoso:", res.data);

            const user = {
                id: res.data.user.id,
                username: res.data.user.username,
                nombre: res.data.user.nombre,
                rol: res.data.user.rol,
                primerLogin: res.data.user.primerLogin                
            };
            console.log("Usuario loguedo:", user);
            localStorage.setItem('user', JSON.stringify(user));

            // Aqui es donde verificamos el Primer Login del usuario
            if(user.primerLogin){
                nav('/cambiar-password');
            } else {
                // Redirigimos al usuario según su rol
                const rol = user.rol;

                // Mapeo de las rutas
                const rutas = {
                    "SUPERVISOR DE CORTE": "/supervisor",
                    "ADMINISTRADOR": "/admin",
                    "RESPONSABLE": "/responsable",
                    "ANALISTA DE PRODUCCIÓN": "/analista_produccion",
                };
                // Si el rol no existe en el mapeo, redirigimos a una ruta por defecto
                const ruta = rutas[rol] || "/";
                nav(ruta);
            }
        } catch(error){
            alert("Usuario o contraseña incorrectos, por favor intente nuevamente.");
            console.error("Error en el login:", error);
        } finally {
            setCargandoLogin(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="logo">🛡️</div>
                    <h2>PRODUCTION SYSTEM</h2>
                    <h2>INICIO DE SESIÓN</h2>
                    <p>Selecciona tu nombre y escribe tu contraseña a continuación...</p>
                </div>
                <form onSubmit={handleLogin}>
                    <label>Usuario</label>
                    <div className="input-group">
                        <select value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            required
                            disabled={cargando}
                            >
                            <option value="">
                                {cargando ? "Cargando usuarios..." : "Selecciona tu nombre..."}
                            </option>
                                {usuarios.map((u) => (
                            <option key={u.id} value={u.username}>
                                {u.nombre}
                            </option>
                            ))}
                        </select>
                    </div>
                    
                <label>Contraseña</label>
                    <input 
                        className="input-password"
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                        disabled={cargandoLogin}
                    />
                <button 
                    className="btn-login"
                    type="submit" 
                    disabled={cargandoLogin}
                >
                    {cargandoLogin ? "Iniciando sesión..." : "Iniciar sesión"}
                </button> 
                <button
                    className="btn-menu-principal"
                    type="button"
                    onClick={() => nav('/')}
                    >
                    Volver al menú principal
                </button>  
            </form>
        </div>
    </div>
    );
}