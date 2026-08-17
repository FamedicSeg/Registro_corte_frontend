// src/pages/CambiarPassword.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from "../services/api";
import '../styles/cambiarPassword.css';

export default function CambiarPassword() {
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    // Obtener usuario del localStorage
    const userData = localStorage.getItem('user');
    if (!userData) {
      // Si no hay usuario, redirigir al login
      nav('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    
    // Verificar si realmente necesita cambiar la contraseña
    if (!parsedUser.primerLogin) {
      // Si no es primer login, redirigir según su rol
      const rutas = {
        "ANALISTA DE PRODUCCIÓN": "/analista_produccion",
        "SUPERVISOR": "/supervisor",
        "RESPONSABLE": "/responsable"
      };
      nav(rutas[parsedUser.rol] || "/panel-rol");
      return;
    }

    setUser(parsedUser);
  }, [nav]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (nuevaPassword.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres');
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (!user) {
      setError('Error: Usuario no encontrado');
      return;
    }

    setCargando(true);
    try {
      // Llamar al endpoint para cambiar contraseña
      await api.put(
        `/api/usuarios/${user.id}/cambiar-primer-login`,
        { nuevaPassword }
      );
      
      // Actualizar usuario en localStorage
      const usuarioActualizado = { ...user, primerLogin: false };
      localStorage.setItem('user', JSON.stringify(usuarioActualizado));
      
      // Mostrar mensaje de éxito
      alert('¡Contraseña cambiada exitosamente!');
      
      // Redirigir según el rol
      const rutas = {
        "RESPONSABLE": "/responsable",
        "ANALISTA DE PRODUCCIÓN": "/analista_produccion",
        "SUPERVISOR": "/supervisor",
        "ADMINISTRADOR": "/admin",
      };
      nav(rutas[user.rol] || "/panel-rol");
      
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      setError(error.response?.data?.error || 'Error al cambiar la contraseña');
    } finally {
      setCargando(false);
    }
  };

  const handleCancel = () => {
    // Si cancela, cerrar sesión
    localStorage.removeItem('user');
    nav('/login');
  };

  if (!user) {
    return (
      <div className="cambiar-password-container">
        <div className="cambiar-password-card">
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cambiar-password-container">
      <div className="cambiar-password-card">
        <div className="cambiar-password-header">
          <h2>Cambio de Contraseña</h2>
          <p className="primer-login-mensaje">
            Es tu primera vez iniciando sesión. Por seguridad, debes cambiar tu contraseña.
          </p>
          <div className="usuario-info">
            <p><strong>Usuario:</strong> {user.nombre}</p>
            <p><strong>Rol:</strong> {user.rol}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="nuevaPassword">Nueva Contraseña:</label>
            <input
              type="password"
              id="nuevaPassword"
              value={nuevaPassword}
              onChange={(e) => setNuevaPassword(e.target.value)}
              placeholder="Mínimo 4 caracteres"
              required
              autoFocus
              disabled={cargando}
            />
            <small className="password-hint">
              Usa al menos 4 caracteres
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmarPassword">Confirmar Contraseña:</label>
            <input
              type="password"
              id="confirmarPassword"
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              placeholder="Repite la contraseña"
              required
              disabled={cargando}
            />
          </div>

          <div className="password-requirements">
            <p className={`requirement ${nuevaPassword.length >= 4 ? 'valid' : ''}`}>
              ✓ Mínimo 4 caracteres
            </p>
            <p className={`requirement ${nuevaPassword && nuevaPassword === confirmarPassword ? 'valid' : ''}`}>
              ✓ Las contraseñas coinciden
            </p>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="btn-cambiar"
              disabled={cargando}
            >
              {cargando ? 'CAMBIANDO...' : 'CAMBIAR CONTRASEÑA'}
            </button>
            <button 
              type="button" 
              className="btn-cancelar"
              onClick={handleCancel}
              disabled={cargando}
            >
              CANCELAR
            </button>
          </div>
        </form>

        <div className="cambiar-password-footer">
          <p>⚠️ Recuerda: Tu nueva contraseña debe ser fácil de recordar pero difícil de adivinar.</p>
        </div>
      </div>
    </div>
  );
}