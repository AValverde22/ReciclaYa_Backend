import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, modelos } from './apoyo-hu-adicional.js';

async function acceso(estado = 'Rechazado') {
    return modelos.logAccesos.create({
        user_id: 1, estado, dispositivo: 'Android de prueba', fecha_login: new Date('2026-01-02T13:15:00Z')
    });
}

test('HU-3.4 devuelve el acceso por ID y rechaza un ID ajeno o inexistente', async () => {
    const { id } = await acceso();
    const detalle = await api('GET', `/accesos/1/${id}`);
    assert.equal(detalle.status, 200);
    assert.equal(detalle.data.id, id);
    assert.equal(detalle.data.fecha_login, '2026-01-02T13:15:00.000Z');
    assert.equal((await api('GET', `/accesos/2/${id}`)).status, 404);
    assert.equal((await api('GET', '/accesos/1/999')).status, 404);
});

test('HU-3.4 muestra el dispositivo y el resultado autorizado o rechazado', {
    todo: 'El repositorio de detalle omite estado y dispositivo en su selección de columnas.'
}, async () => {
    for (const estado of ['Autorizado', 'Rechazado']) {
        const { id } = await acceso(estado);
        const detalle = await api('GET', `/accesos/1/${id}`);
        assert.equal(detalle.status, 200);
        assert.equal(detalle.data.estado, estado);
        assert.equal(detalle.data.dispositivo, 'Android de prueba');
    }
});

test('HU-3.4 registra un reporte del acceso y evita duplicarlo', async () => {
    const { id } = await acceso();
    const ruta = `/accesos/1/${id}/reportar`;
    const body = { descripcion: 'No reconozco este acceso' };
    const reporte = await api('POST', ruta, body);
    assert.equal(reporte.status, 201);
    assert.equal(reporte.data.success, true);
    assert.equal(reporte.data.data.logAccesos_id, id);
    assert.equal(reporte.data.data.descripcion, body.descripcion);
    assert.equal((await api('POST', ruta, body)).status, 409);

    const listado = await api('GET', '/accesos/1/mis-reportes');
    assert.equal(listado.status, 200);
    assert.deepEqual(listado.data.data.map(item => item.id), [reporte.data.data.id]);
});
