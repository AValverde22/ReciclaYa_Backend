import repository from '../repositories/recojo.js';
import routesClient from '../clients/google-routes.js';
import { positiveId, fail, coordinates, arrived, rating } from './recojo-rules.js';

async function actor(id, store = repository, role) {
    const u = await store.findUser(positiveId(id));
    if (!u || (role && u.role !== role)) fail('Usuario o rol inválido.', 403);
    return u;
}
async function participating(id, userId, store) {
    await actor(userId, store);
    const s = await store.findRequest(positiveId(id));
    if (!s) fail('Solicitud no encontrada.', 404);
    if (![s.created_by, s.accepted_by].includes(positiveId(userId))) fail('No participa en esta solicitud.', 403);
    return s;
}
async function editable(id, userId, store) {
    const u = await actor(userId, store, 'Usuario');
    const s = await store.findRequest(positiveId(id));
    if (!s) fail('Solicitud no encontrada.', 404);
    if (s.created_by !== u.id) fail('Solo el creador puede modificar la solicitud.', 403);
    if (s.status !== 'Disponible' || await store.findActive(s.created_by))
        fail('No puede editar ni cancelar solicitudes mientras hay un reciclaje activo.');
    return s;
}
function fields(body) {
    coordinates(body.latitude, body.longitude);
    if (!['Papel','Plástico','Vidrio'].includes(body.type) ||
        !['Extrapequeña','Pequeña','Mediana','Grande','Extragrande'].includes(body.size) ||
        typeof body.address !== 'string' || !body.address.trim()) fail('Complete los datos de la solicitud.', 400);
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(body.day || '');
    if (!match || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(body.time || '')) fail('Fecha u hora inválida.', 400);
    const day = `${match[3]}-${match[2]}-${match[1]}`;
    const date = new Date(`${day}T${body.time.length === 5 ? body.time+':00' : body.time}-05:00`);
    if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now() ||
        date.toLocaleDateString('en-CA', {timeZone:'America/Lima'}) !== day) fail('Seleccione una fecha y hora futuras válidas.', 400);
    return {type:body.type, size:body.size, day, time:body.time, address:body.address.trim(), latitude:body.latitude, longitude:body.longitude};
}
export default {
    async create(body) {
        return repository.atomic(async store => {
            const u = await actor(body.created_by, store, 'Usuario');
            if (await store.findActive(u.id)) fail('Termine su reciclaje activo antes de publicar otra solicitud.');
            await store.createRequest({...fields(body), created_by:u.id, status:'Disponible'});
            return null;
        });
    },
    async edit(id, userId, body) {
        return repository.atomic(async store => {
            const s = await editable(id, userId, store);
            await store.updateRequest(s.id, fields(body));
            return null;
        });
    },
    async cancel(id, userId) {
        return repository.atomic(async store => {
            const s = await editable(id, userId, store);
            await store.updateRequest(s.id, {status:'Cancelada', closed_at:new Date()});
            return null;
        });
    },
    async cancelActive(id, userId) {
        return repository.atomic(async store => {
            let s = await participating(id, userId, store);
            const creatorCancels = s.created_by === positiveId(userId);
            if (creatorCancels && s.status === 'Cancelada') return {success:true, status:s.status, message:'Solicitud cancelada definitivamente.'};
            // A creator cancellation still wins if the recycler just released it.
            if (s.status !== 'Pendiente' && !(creatorCancels && s.status === 'Disponible')) fail('El reciclaje ya no está activo.');
            if ((s.user_confirmed && s.recycler_confirmed) ||
                await store.countRatings(s.id))
                fail('El reciclaje ya fue confirmado. Complete las calificaciones.');
            s = await store.updateRequest(s.id, {
                status:creatorCancels ? 'Cancelada' : 'Disponible',
                closed_at:creatorCancels ? new Date() : null,
                accepted_by:creatorCancels ? s.accepted_by : null,
                recycler_latitude:null, recycler_longitude:null, location_updated_at:null,
                user_confirmed:false, recycler_confirmed:false
            });
            return {success:true, status:s.status, message:creatorCancels ? 'Solicitud cancelada definitivamente.' : 'Recojo cancelado. La solicitud vuelve a estar disponible.'};
        });
    },
    async accept(id, userId) {
        return repository.atomic(async store => {
            const u = await actor(userId, store, 'Reciclador');
            const s = await store.findRequest(positiveId(id));
            if (!s || s.status !== 'Disponible') fail('La solicitud ya no se encuentra disponible.');
            const deadline = new Date(`${s.day}T${s.time}-05:00`);
            if (deadline <= new Date()) fail('La solicitud ha vencido.');
            if (s.created_by === u.id) fail('No puede aceptar su propia solicitud.', 403);
            if (await store.findAcceptanceConflict(u.id, s.created_by))
                fail('El usuario o el reciclador ya tiene un reciclaje activo.');
            await store.updateRequest(s.id, {accepted_by:u.id, status:'Pendiente', closed_at:null});
            return true;
        });
    },
    async active(userId) {
        await actor(userId);
        const id = positiveId(userId);
        const s = await repository.findActive(id);
        if (!s) return {solicitud:null};
        const other = await repository.findCounterpart(s.created_by === id ? s.accepted_by : s.created_by);
        const rated = await repository.findRating(s.id, id);
        return {solicitud:s, counterpart:other, arrived:arrived(s), has_rated:!!rated};
    },
    async location(id, userId, body) {
        coordinates(body.latitude, body.longitude);
        if (typeof body.accuracy !== 'number' || !Number.isFinite(body.accuracy) || body.accuracy < 0 || body.accuracy > 100)
            fail('Esperando una ubicación GPS más precisa.', 400);
        return repository.atomic(async store => {
            let s = await participating(id, userId, store);
            if (s.accepted_by !== positiveId(userId)) fail('Solo el reciclador puede compartir su ubicación.', 403);
            if (s.status !== 'Pendiente') fail('El reciclaje no está activo.');
            s = await store.updateRequest(s.id, {recycler_latitude:body.latitude, recycler_longitude:body.longitude, location_updated_at:new Date()});
            return {success:true};
        });
    },
    async confirm(id, userId) {
        return repository.atomic(async store => {
            let s = await participating(id, userId, store);
            if (s.status !== 'Pendiente') fail('El reciclaje no está activo.');
            if (!(s.user_confirmed && s.recycler_confirmed) && !arrived(s)) fail('El reciclador debe estar a menos de 100 metros con una ubicación reciente.');
            s = await store.updateRequest(s.id, positiveId(userId) === s.created_by ? {user_confirmed:true} : {recycler_confirmed:true});
            return {success:true};
        });
    },
    async rate(id, userId, body) {
        rating(body.puntuacion);
        if (body.comentario != null && (typeof body.comentario !== 'string' || body.comentario.length > 1000)) fail('Reseña inválida (máximo 1000 caracteres).', 400);
        return repository.atomic(async store => {
            let s = await participating(id, userId, store);
            if (!s.user_confirmed || !s.recycler_confirmed) fail('Ambos participantes deben confirmar el fin del reciclaje.');
            const evaluator = positiveId(userId);
            const target = evaluator === s.created_by ? s.accepted_by : s.created_by;
            if (!await store.findRating(s.id, evaluator)) {
                if (s.status !== 'Pendiente') fail('El reciclaje no está activo.');
                await store.createRating({solicitud_id:s.id, evaluador_id:evaluator, evaluado_id:target, puntuacion:body.puntuacion, comentario:body.comentario || null});
                const average = await store.averageRating(target);
                await store.updateScore(target, average);
            }
            if (await store.countRatings(s.id) === 2 && s.status === 'Pendiente')
                s = await store.updateRequest(s.id, {status:'Finalizada', closed_at:new Date()});
            return {success:true, status:s.status};
        });
    },
    async route(id, userId) {
        const state = await this.active(userId);
        const s = state.solicitud;
        if (!s || s.id !== positiveId(id)) fail('Solicitud activa no encontrada.', 404);
        if (!routesClient.isConfigured()) return {polyline:null, message:'Ruta vial no configurada. Puede abrir la navegación externa.'};
        if (s.recycler_latitude == null) return {polyline:null, message:'Esperando ubicación del reciclador.'};
        return routesClient.computeRoute(
            {latitude:s.recycler_latitude, longitude:s.recycler_longitude},
            {latitude:s.latitude, longitude:s.longitude}
        );
    }
};
