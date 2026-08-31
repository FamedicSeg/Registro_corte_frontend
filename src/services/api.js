import axios from 'axios';

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Agregamos un interceptor para manejar errores de manera global
api.interceptors.response.use(
    response => response,
    error => {
        if(error.response) {
            console.error("Error API:", error.response.status, error.response.data );
        } else if (error.request) {
            console.error("No hubo respuesta del servidor");
        } else {
            console.error("Error al configurar la solicitud:", error.message);
        }
        return Promise.reject(error);
    }
);

// Agregamos los servicios para consumir la conexión a OneDrive
export  const readExcelFile = async (fileName, sheetName, hasHeaders = true) => {
    try{
        const response = await api.post('/onedrive/read', {
            fileName,
            sheetName,
            hasHeaders,
        });
        return response.data;
    } catch (error){
        console.error('Error al leer el archivo de Excel:', error);
        throw error;
    }
};

// Busca en cualquier archivo
export const searchInExcel = async (fileName, sheetName, searchTerm, hasHeaders = true) => {
    try {
        const response = await api.post('/onedrive/search', {
            fileName,
            sheetName,
            searchField: searchTerm.field,
            searchValue: searchTerm.value,
            hasHeaders,
        });
        return response.data;
    } catch (error) {
        console.error('Error al buscar en el archivo de Excel:', error);
        throw error;
    }
};

// Buscar lote especifico en el archivo de Excel
export const buscarLote = async (loteId) => {
    try{
        const response = await api.post('/onedrive/buscar-lote', { loteId });
        return response.data;
    } catch (error){
        console.error('Error al buscar el lote en el archivo de Excel:', error);
        throw error;
    }
};

// Buscar insumo específico
export const buscarInsumo = async (insumoId) => {
    try{
        const response = await api.post('/onedrive/buscar-insumo', { insumoId });
        return response.data;
    } catch (error){
        console.error('Error al buscar el insumo en el archivo de Excel:', error);
        throw error;
    }   
};

// Buscar producto específico
export const buscarProducto = async (productoId) => {
    try{
        const response = await api.post('/onedrive/buscar-producto', { productoId });
        return response.data;
    } catch (error){
        console.error('Error al buscar el producto en el archivo de Excel:', error);
        throw error;
    }
};

// Obtener lote de materia prima desde el Excel de OneDrive, dado el código TEL
export const obtenerLotesMateriaPrima = async (codigo) => {
    try {
        if (!codigo || !String(codigo).trim()) return [];
        const response = await api.get('/api/onedrive/lote-material-prima', {
            params: { codigo: String(codigo).trim() }
        });
        return Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error) {
        console.error('Error al obtener lotes de materia prima:', error);
        return [];
    }
};

// Guardar registro de corte en el archivo de Excel una vez haya sido verificado
export const guardarRegistroCorte = async (sheetaName, registroData) => {
    try{
        const response = await api.post('/onedrive/guardar-registro', {
            sheetaName,
            registroData,
        });
        return response.data;
    } catch (error){
        console.error('Error al guardar el registro de corte en el archivo de Excel:', error);
        throw error;
    }
};