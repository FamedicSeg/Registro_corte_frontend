import { useNavigate } from "react-router-dom";
import { useState } from "react";
import '../styles/home.css';

export default function Home() {
    const nav = useNavigate();
    const [hoveredBtn, setHoveredBtn] = useState(null);

    // Calcular la fecha directamente
    const fecha = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Capitalizar la primera letra de cada palabra en la fecha
    const fechaFormateada = fecha.charAt(0).toUpperCase() + fecha.slice(1);
    const handleMouseEnter = (btn) => setHoveredBtn(btn);
    const handleMouseLeave = () => setHoveredBtn(null);

    return (
        <div className="home-container">
            {/* Para la Barra Superior */}
            <div className="barra-superior">
                <div className="home-logo-area">
                    <span className="home-logo-text">DHISVE - SISTEMA DE GESTIÓN</span>
                </div>
            <div className="fecha-area">
                <span className="home-date-icon">📅 </span>
                <span className="home-date-text">{fechaFormateada}</span>
            </div>
            </div>
            <div className="home-content">
                <h1 className="home-title">DIGITAL REGISTRY SYSTEM</h1>
                <p className="home-subtitle">
                    Sistema Integral para el Control y Seguimiento de Procesos de Corte y Registro Digital de la Información.
                </p>
            </div>

            {/* Grid de tarjetas*/}
            <div className="home-card-grid">
                {/* Tarjeta de Nuevo Registro*/}
                <div
                    className={`home-card card-registro ${hoveredBtn === 'registro' ? 'hover' : ''}`}
                    onMouseEnter={() => handleMouseEnter('registro')}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => nav('/registro')}
                >
                    <div className="home-card-icon-container">
                        <span className="home-card-icon">📝</span>
                    </div>
                    <div className="home-card-container">
                        <h3 className="home-card-title">Nuevo Registro</h3>
                        <p className="home-card-description">
                            Ingresar un nuevo registro de producción con todos los detalles
                        </p>
                    </div>
                    <div className="home-card-arrow">→</div>
                </div>
                {/* Tarjeta de Login*/}
                <div 
                    className={`home-card card-login ${hoveredBtn === 'login' ? 'hover' : ''}`}
                    onMouseEnter={() => handleMouseEnter('login')}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => nav('/login')}
                >
                    <div className="home-card-icon-container">
                        <span className="home-card-icon">🔑</span>
                    </div>
                    <div className="home-card-container">
                        <h3 className="home-card-title"> Iniciar Sesión</h3>
                        <p className="home-card-description">
                            Acceder a tus registros con tus credenciales
                        </p>
                    </div>
                    <div className="home-card-arrow">→</div>
                </div>
            </div>
        </div>
    );
}