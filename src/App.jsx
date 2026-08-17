import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Registro from './pages/registro'
import Home from './pages/home'
import Login from './pages/login'
import Footer from './components/footer';
import PanelRol from './pages/panelRol';
import AdminUsuarios from './components/AdminUsuarios';
import ModalRechazo from './components/ModalRechazo';
import CambiarPassword from './components/CambiarPassword';
import EditarRegistro from './pages/editarRegistro';
import './App.css'

export default function App() {

return (
<BrowserRouter>
  <Routes>

    {/* RUTAS PUBLICA*/}
    <Route path="/" element={<Home />} />
    <Route path="/login" element={<Login />} />

    {/* RUTAS DE TRABAJO */}
    <Route path="/registro" element={<Registro />} />
    <Route path="/editar-registro/:id" element={<EditarRegistro />} />
    <Route path="/cambiar-password" element={<CambiarPassword />} />
        <Route path="/panel-rol" element={<PanelRol />} />
        <Route path="/admin" element={<AdminUsuarios />} />
        <Route path="/modal-rechazo" element={<ModalRechazo />} />
        <Route path="/analista_produccion" element={<PanelRol />} />
        <Route path="/supervisor" element={<PanelRol />} />
        <Route path="/responsable" element={<PanelRol />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

