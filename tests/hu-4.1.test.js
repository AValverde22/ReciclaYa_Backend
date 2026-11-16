import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, sembrarSolicitud } from './apoyo-hu-adicional.js';

test('HU-4.1 registra calificaciones mutuas y muestra el promedio y la reseña', async () => {
    const { id } = await sembrarSolicitud({
        status: 'Finalizada', accepted_by: 2, user_confirmed: true, recycler_confirmed: true
    });
    const ruta = `/solicitud/${id}/calificacion`;
    const body = { evaluador_id: 1, puntuacion: 4, comentario: 'Buen recojo' };
    const enviada = await api('POST', ruta, body);
    assert.equal(enviada.status, 200);
    assert.match(enviada.data.message, /calificación registrada correctamente/i);
    const duplicada = await api('POST', ruta, { ...body, puntuacion: 1 });
    assert.equal(duplicada.status, 409);
    assert.match(duplicada.data.message, /ya fue registrada/i);
    assert.equal((await api('POST', ruta, { evaluador_id: 2, puntuacion: 5 })).status, 200);

    const reputacion = await api('GET', '/user/2/reputation');
    assert.equal(reputacion.status, 200);
    assert.equal(reputacion.data.average_rating, 4);
    assert.equal(reputacion.data.total_ratings, 1);
    assert.equal(reputacion.data.reviews[0].comentario, body.comentario);
});

test('HU-4.1 rechaza calificar recojos pendientes o cancelados y estrellas fuera de rango', async () => {
    for (const status of ['Pendiente', 'Cancelada']) {
        const { id } = await sembrarSolicitud({ status, accepted_by: 2 });
        const respuesta = await api('POST', `/solicitud/${id}/calificacion`, { evaluador_id: 1, puntuacion: 5 });
        assert.equal(respuesta.status, 409);
        assert.match(respuesta.data.message, /solo se pueden calificar recojos finalizados/i);
    }
    const { id } = await sembrarSolicitud({
        status: 'Finalizada', accepted_by: 2, user_confirmed: true, recycler_confirmed: true
    });
    const respuesta = await api('POST', `/solicitud/${id}/calificacion`, { evaluador_id: 1, puntuacion: 6 });
    assert.equal(respuesta.status, 400);
});
test('HU-4.1 | Unitaria: la regla de estrellas acepta los límites y rechaza valores inválidos', async () => {
    const { rating } = await import('../src/services/recojo-rules.js');
    for (const valor of [1, 5]) assert.doesNotThrow(() => rating(valor));
    for (const valor of [0, 6, 2.5]) assert.throws(() => rating(valor), { status: 400 });
});

