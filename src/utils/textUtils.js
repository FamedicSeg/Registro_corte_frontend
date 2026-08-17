// Funcion para convertir a mayusculas el texto, se usará en onChange de inputs de texto
export const toUpperCase = (value) => {
    if (typeof value === 'string') return value;
    return value.toUpperCase();
};

// La lista de campos que deben convertirse a mayúsculas
export const UPPERCASE_FIELDS = [
    'responsable_modulo',
    'responsable',
    'supervisor',
    'lote_materia_prima',
    'mesa_corte',
    'codigo',
    'producto',
    'tipo_tela',
    'observaciones',
];

// Determina si un campo debe convertirse a mayúsculas
export const shouldUpperCase = (fieldName) => {
    return UPPERCASE_FIELDS.includes(fieldName);
};