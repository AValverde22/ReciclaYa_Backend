import { describe, test } from 'node:test';

describe('Caja negra | Cierre de sesión', () => {
    test('HU-1.5 confirmar cierra la sesión, redirige al inicio e impide volver a una vista protegida',
        { skip: 'El backend abierto no expone una ruta de cierre de sesión ni una vista protegida' });
    test('HU-1.5 cancelar conserva la sesión', { skip: 'Requiere el diálogo de cierre de sesión del frontend' });
});


// El proyecto abierto solo contiene el backend. Se necesita el código de sesión
// del frontend para diseñar y ejecutar las pruebas de caja blanca y unitarias.
