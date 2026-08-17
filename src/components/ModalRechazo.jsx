import { useState } from 'react';
import { api } from '../services/api';
import '../styles/modalRechazo.css';

const ModalRechazo = ({ isOpen, onClose, registroId, onRechazado, usuario }) => {
    const [motivo, setMotivo] = useState('');
    const [cargando, setCargando] = useState(false);

    const handleRechazar = async () => {
        if(!motivo.trim()) {
            alert('Debe ingresar un motivo de rechazo');
            return;
        }
        setCargando(true);

        try{
            await api.put(`/api/registro/rechazar/${registroId}`, { 
                motivo: motivo, 
                usuario: usuario.nombre,
                rol: usuario.rol 
            });
            alert("Registro rechazado exitosamente");
            onRechazado();
            onClose();
        } catch (error) {
            console.error("Error al rechazar el registro:", error);
            alert(error.response?.data?.error || "Error al rechazar el registro");  
        } finally {
            setCargando(false);
        }
    };
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Rechazar Registro</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <p>¿Estás seguro de rechazar este registro?</p>
          <p className="modal-warning">
            El registro volverá a estado pendiente para que el responsable pueda editarlo.
          </p>
          
          <div className="form-group">
            <label htmlFor="motivo" className="required">
              Motivo del rechazo:
            </label>
            <textarea
              id="motivo"
              rows="4"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explique por qué se rechaza este registro..."
              className="motivo-textarea"
              required
            />
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={cargando}
          >
            Cancelar
          </button>
          <button 
            className="btn btn-danger" 
            onClick={handleRechazar}
            disabled={cargando || !motivo.trim()}
          >
            {cargando ? 'Rechazando...' : '✓ Rechazar Registro'}
          </button>
        </div>
      </div>
    </div>
    );
}

export default ModalRechazo;