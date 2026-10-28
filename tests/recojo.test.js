import { test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Op } from 'sequelize';
import { positiveId, coordinates, distanceMeters, arrived, rating } from '../src/services/recojo-rules.js';

// Isolated service/HTTP contract tests. No connection to the configured production database.
let users, solicitudes, ratings, queue = Promise.resolve(), failScore = false;
function matches(row, where = {}) {
    return Reflect.ownKeys(where).every(key => key === Op.or ? where[key].some(w => matches(row,w)) : row[key] === where[key]);
}
function wrap(row) {
    if (!row) return null;
    return Object.assign({}, row, {
        async update(fields) { Object.assign(row,fields); Object.assign(this,fields); return this; },
        toJSON() { return {...row}; }
    });
}
const models = {
    user: {
        async findByPk(id) { return wrap(users.find(u => u.id === id)); },
        async update(data,{where}) { if (failScore) throw Error('Simulated score failure'); Object.assign(users.find(u => matches(u,where)),data); }
    },
    solicitud: {
        async findByPk(id) { return wrap(solicitudes.find(s => s.id === id)); },
        async findOne({where}) { return wrap(solicitudes.find(s => matches(s,where))); },
        async create(data) { const s = {id:solicitudes.length+1, accepted_by:null, user_confirmed:false, recycler_confirmed:false, closed_at:null, ...data}; solicitudes.push(s); return wrap(s); }
    },
    calificacion: {
        async findOne({where, attributes}) {
            const list = ratings.filter(r => matches(r,where));
            return attributes ? {average:list.reduce((n,r) => n+r.puntuacion,0)/list.length} : wrap(list[0]);
        },
        async count({where}) { return ratings.filter(r => matches(r,where)).length; },
        async create(data) { const row = {...data}; ratings.push(row); return wrap(row); }
    }
};
const db = {
    async transaction(work) {
        const previous = queue; let release; queue = new Promise(resolve => release = resolve); await previous;
        const backup = structuredClone({users,solicitudes,ratings});
        try { return await work({LOCK:{UPDATE:'UPDATE'}}); }
        catch (error) { ({users,solicitudes,ratings} = backup); throw error; }
        finally { release(); }
    },
    async query(sql) { assert.match(sql,/pg_advisory_xact_lock/); },
    fn:() => null, col:() => null
};
mock.module('../src/config/database.js', {defaultExport:db});
mock.module('../src/models/init-models.js', {defaultExport:() => models});
const {default:service} = await import('../src/services/recojo.js');

const body = () => ({created_by:1, type:'Papel', size:'Mediana', day:'01/01/2099', time:'12:00', address:'Punto de recojo', latitude:-12, longitude:-77});
beforeEach(() => {
    users = [{id:1,role:'Usuario',score:5}, {id:2,role:'Reciclador',score:5}, {id:3,role:'Usuario',score:5}, {id:4,role:'Reciclador',score:5}];
    solicitudes = [1,2,3].map((id) => ({id, created_by:id === 3 ? 3 : 1, accepted_by:null, status:'Disponible', day:'2099-01-01', time:'12:00:00', latitude:-12, longitude:-77, user_confirmed:false, recycler_confirmed:false, closed_at:null}));
    ratings = []; failScore = false;
});
const conflict = (work, status = 409) => assert.rejects(work, error => error.status === status);
async function atDestination() { await service.accept(1,2); await service.location(1,2,{latitude:-12,longitude:-77,accuracy:10}); }
async function confirmed() { await atDestination(); await service.confirm(1,1); await service.confirm(1,2); }

test('rejects malformed identifiers, GPS values, and non-integer ratings', () => {
    for (const id of [null,0,-1,1.5,'abc',true,[1],{}]) assert.throws(() => positiveId(id));
    for (const point of [[91,0],[0,181],[NaN,0],[null,0],['-12',0]]) assert.throws(() => coordinates(...point));
    for (const value of [0,6,2.5,'3',null]) assert.throws(() => rating(value));
    assert.ok(distanceMeters(-12,-77,-12.001,-77) > 100);
});
test('arrival requires a recent coordinate within 100 metres; zero coordinates are valid', () => {
    assert.equal(arrived({latitude:0,longitude:0,recycler_latitude:0,recycler_longitude:0,location_updated_at:new Date()}),true);
    assert.equal(arrived({latitude:0,longitude:0,recycler_latitude:0,recycler_longitude:0,location_updated_at:new Date(Date.now()-120001)}),false);
    assert.equal(arrived({latitude:0,longitude:0}),false);
});
test('creates a request using only allowed fields and the server controlled initial status', async () => {
    await service.create({...body(),status:'Finalizada',accepted_by:2,user_confirmed:true});
    assert.equal(solicitudes.at(-1).status,'Disponible'); assert.equal(solicitudes.at(-1).accepted_by,null);
    assert.equal(solicitudes.at(-1).day,'2099-01-01');
});
test('rejects invalid calendar dates, past schedules, and invalid residue types', async () => {
    await conflict(() => service.create({...body(),day:'31/02/2099'}),400);
    await conflict(() => service.create({...body(),day:'01/01/2000'}),400);
    await conflict(() => service.create({...body(),type:'Otro'}),400);
});
test('rejects missing users and wrong roles', async () => {
    await conflict(() => service.accept(1,1),403); await conflict(() => service.accept(1,99),403);
    await conflict(() => service.create({...body(),created_by:2}),403);
});
test('two recyclers accepting one request have exactly one winner', async () => {
    const results = await Promise.allSettled([service.accept(1,2),service.accept(1,4)]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length,1);
    assert.equal(solicitudes[0].status,'Pendiente');
});
test('one recycler accepting different users concurrently has exactly one winner', async () => {
    const results = await Promise.allSettled([service.accept(1,2),service.accept(3,2)]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length,1);
});
test('two requests from one creator cannot be active concurrently', async () => {
    const results = await Promise.allSettled([service.accept(1,2),service.accept(2,4)]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length,1);
});
test('cannot accept missing, cancelled, finalized, or expired requests', async () => {
    await conflict(() => service.accept(99,2));
    for (const status of ['Cancelada','Finalizada']) { solicitudes[0].status = status; await conflict(() => service.accept(1,2)); }
    solicitudes[0].status = 'Disponible'; solicitudes[0].day = '2000-01-01'; await conflict(() => service.accept(1,2));
});
test('creator cannot publish, edit, or cancel any request while a collection is active', async () => {
    await service.accept(1,2);
    await conflict(() => service.create(body())); await conflict(() => service.edit(2,1,body()));
    await conflict(() => service.cancel(1,1)); await conflict(() => service.cancel(2,1));
});
test('only creator can edit/cancel an available request', async () => {
    await conflict(() => service.edit(1,3,body()),403); await conflict(() => service.cancel(1,3),403);
    await service.edit(1,1,{...body(),address:'Nueva dirección',status:'Finalizada'});
    assert.equal(solicitudes[0].address,'Nueva dirección'); assert.equal(solicitudes[0].status,'Disponible');
    await service.cancel(1,1); assert.equal(solicitudes[0].status,'Cancelada');
});
test('active state exposes counterpart, request details and each evaluator status', async () => {
    assert.equal((await service.active(1)).solicitud,null);
    await service.accept(1,2);
    assert.equal((await service.active(1)).counterpart.id,2); assert.equal((await service.active(2)).counterpart.id,1);
    assert.equal((await service.active(3)).solicitud,null);
});
test('only assigned recycler can share a sufficiently precise location', async () => {
    await service.accept(1,2);
    await conflict(() => service.location(1,1,{latitude:-12,longitude:-77,accuracy:5}),403);
    await conflict(() => service.location(1,4,{latitude:-12,longitude:-77,accuracy:5}),403);
    await conflict(() => service.location(1,2,{latitude:-12,longitude:-77,accuracy:101}),400);
    await service.location(1,2,{latitude:-12,longitude:-77,accuracy:5}); assert.equal((await service.active(1)).arrived,true);
});
test('cannot confirm before arrival or with stale GPS; outsiders cannot confirm', async () => {
    await service.accept(1,2); await conflict(() => service.confirm(1,1));
    await service.location(1,2,{latitude:-12.01,longitude:-77,accuracy:10}); await conflict(() => service.confirm(1,2));
    await service.location(1,2,{latitude:-12,longitude:-77,accuracy:10});
    solicitudes[0].location_updated_at = new Date(Date.now()-121000); await conflict(() => service.confirm(1,1));
    await conflict(() => service.confirm(1,3),403);
});
test('both confirmations are required and survive reload', async () => {
    await atDestination(); await service.confirm(1,1);
    await conflict(() => service.rate(1,1,{puntuacion:5}));
    assert.equal((await service.active(2)).solicitud.user_confirmed,true);
    await service.confirm(1,2); await service.confirm(1,2);
    assert.equal(solicitudes[0].status,'Pendiente');
});
test('mutual ratings persist, update averages, reject duplicates by idempotency and release both users only at end', async () => {
    await confirmed(); await service.rate(1,1,{puntuacion:4,comentario:'Gracias'});
    assert.equal(users[1].score,4); assert.equal((await service.active(1)).has_rated,true);
    assert.equal((await service.active(2)).has_rated,false);
    await conflict(() => service.accept(3,2));
    await service.rate(1,1,{puntuacion:1}); assert.equal(ratings.length,1); assert.equal(users[1].score,4);
    await service.rate(1,2,{puntuacion:5});
    assert.equal(solicitudes[0].status,'Finalizada'); assert.equal(ratings.length,2);
    assert.equal((await service.active(1)).solicitud,null); assert.equal((await service.active(2)).solicitud,null);
    await service.accept(3,2); await service.create(body());
});
test('simultaneous final ratings complete a collection once', async () => {
    await confirmed(); await Promise.all([service.rate(1,1,{puntuacion:3}),service.rate(1,2,{puntuacion:4})]);
    assert.equal(ratings.length,2); assert.equal(solicitudes[0].status,'Finalizada');
});
test('rating and score update roll back together when score persistence fails', async () => {
    await confirmed(); failScore = true;
    await assert.rejects(() => service.rate(1,1,{puntuacion:3}));
    assert.equal(ratings.length,0); assert.equal(users[1].score,5); assert.equal(solicitudes[0].status,'Pendiente');
});
test('rejects outsider ratings, invalid ratings, and oversized reviews', async () => {
    await confirmed(); await conflict(() => service.rate(1,3,{puntuacion:4}),403);
    await conflict(() => service.rate(1,1,{puntuacion:4.5}),400);
    await conflict(() => service.rate(1,1,{puntuacion:5,comentario:'x'.repeat(1001)}),400);
});
test('route is limited to own active request and works gracefully without an API key', async () => {
    delete process.env.GOOGLE_ROUTES_API_KEY;
    await service.accept(1,2); assert.equal((await service.route(1,1)).polyline,null);
    await conflict(() => service.route(1,3),404); await conflict(() => service.route(3,1),404);
});

test('recycler cancellation reopens the request, clears tracking/confirmations and permits another recycler', async () => {
    await atDestination(); await service.confirm(1,1);
    const result = await service.cancelActive(1,2);
    assert.equal(result.status,'Disponible');
    assert.equal(solicitudes[0].accepted_by,null);
    for (const field of ['recycler_latitude','recycler_longitude','location_updated_at']) assert.equal(solicitudes[0][field],null);
    assert.equal(solicitudes[0].user_confirmed,false); assert.equal(solicitudes[0].recycler_confirmed,false);
    assert.equal((await service.active(1)).solicitud,null); assert.equal((await service.active(2)).solicitud,null);
    await service.accept(1,4); assert.equal(solicitudes[0].accepted_by,4);
    await conflict(() => service.cancelActive(1,2),403);
    await conflict(() => service.location(1,2,{latitude:-12,longitude:-77,accuracy:10}),403);
    assert.equal(ratings.length,0);
});

test('creator cancellation is definitive and frees the assigned recycler', async () => {
    await atDestination();
    assert.equal((await service.cancelActive(1,1)).status,'Cancelada');
    assert.equal(solicitudes[0].accepted_by,2);
    await conflict(() => service.accept(1,4));
    assert.equal((await service.active(1)).solicitud,null); assert.equal((await service.active(2)).solicitud,null);
    await service.accept(3,2); await service.create(body());
});

test('outsiders cannot cancel an active collection', async () => {
    await service.accept(1,2);
    await conflict(() => service.cancelActive(1,3),403); await conflict(() => service.cancelActive(1,4),403);
    assert.equal(solicitudes[0].status,'Pendiente');
});

test('cannot cancel after mutual completion confirmation or after a rating', async () => {
    await confirmed();
    await conflict(() => service.cancelActive(1,1)); await conflict(() => service.cancelActive(1,2));
    await service.rate(1,1,{puntuacion:4}); await conflict(() => service.cancelActive(1,2));
    assert.equal(ratings.length,1); assert.equal(users[1].score,4);
    await service.rate(1,2,{puntuacion:5}); await conflict(() => service.cancelActive(1,1));
    assert.equal(solicitudes[0].status,'Finalizada');
});

test('creator cancellation wins concurrent recycler withdrawal', async () => {
    await service.accept(1,2);
    await Promise.allSettled([service.cancelActive(1,2),service.cancelActive(1,1)]);
    assert.equal(solicitudes[0].status,'Cancelada');
    assert.equal((await service.cancelActive(1,1)).status,'Cancelada');
});

test('concurrent cancellation and completion cannot reopen a confirmed collection', async () => {
    await atDestination(); await service.confirm(1,1);
    await Promise.allSettled([service.confirm(1,2),service.cancelActive(1,2)]);
    assert.equal(solicitudes[0].status,'Pendiente');
    assert.equal(solicitudes[0].user_confirmed,true); assert.equal(solicitudes[0].recycler_confirmed,true);
});

test('available requests have no closure date and creator cancellation records server time without changing schedule', async () => {
    await service.create({...body(),closed_at:'2000-01-01T00:00:00Z'});
    assert.equal(solicitudes.at(-1).closed_at,null);
    const before = Date.now(); await service.cancel(1,1); const after = Date.now();
    assert.ok(solicitudes[0].closed_at instanceof Date);
    assert.ok(solicitudes[0].closed_at.getTime() >= before && solicitudes[0].closed_at.getTime() <= after);
    assert.equal(solicitudes[0].day,'2099-01-01'); assert.equal(solicitudes[0].time,'12:00:00');
});

test('definitive active cancellation records closure once and repeated cancellation preserves it', async () => {
    await service.accept(1,2); assert.equal(solicitudes[0].closed_at,null);
    await service.cancelActive(1,1); const closedAt = solicitudes[0].closed_at.getTime();
    await service.cancelActive(1,1); assert.equal(solicitudes[0].closed_at.getTime(),closedAt);
});

test('recycler withdrawal does not record a closure date', async () => {
    await atDestination(); await service.confirm(1,1); await service.cancelActive(1,2);
    assert.equal(solicitudes[0].closed_at,null);
    await service.accept(1,4); assert.equal(solicitudes[0].closed_at,null);
});

test('finalization records closure when both ratings complete and retries do not change it', async () => {
    await confirmed(); assert.equal(solicitudes[0].closed_at,null);
    await service.rate(1,1,{puntuacion:5}); assert.equal(solicitudes[0].closed_at,null);
    const before = Date.now(); await service.rate(1,2,{puntuacion:4}); const after = Date.now();
    const closedAt = solicitudes[0].closed_at.getTime();
    assert.ok(closedAt >= before && closedAt <= after);
    assert.equal(solicitudes[0].day,'2099-01-01');
    await service.rate(1,2,{puntuacion:1}); assert.equal(solicitudes[0].closed_at.getTime(),closedAt);
    assert.equal(ratings.length,2);
});

test('HTTP contracts return JSON 409 conflicts and bind rating request ID from path', async () => {
    const {default:express} = await import('express');
    const {default:controller} = await import('../src/controllers/recojo.js');
    const app = express(); app.use(express.json());
    app.get('/solicitud/activa',controller.active);
    app.patch('/solicitud/:id/accept',controller.accept);
    app.post('/solicitud/:id/calificacion',controller.rate);
    const server = app.listen(0,'127.0.0.1'); await new Promise(resolve => server.once('listening',resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
        const accepted = await fetch(base+'/solicitud/1/accept?user_id=2',{method:'PATCH'}); assert.equal(await accepted.json(),true);
        const rejected = await fetch(base+'/solicitud/3/accept?user_id=2',{method:'PATCH'}); assert.equal(rejected.status,409); assert.ok((await rejected.json()).message);
        assert.equal((await (await fetch(base+'/solicitud/activa?user_id=1')).json()).solicitud.id,1);
        await service.location(1,2,{latitude:-12,longitude:-77,accuracy:10}); await service.confirm(1,1); await service.confirm(1,2);
        const rated = await fetch(base+'/solicitud/1/calificacion',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({solicitud_id:99,evaluador_id:1,puntuacion:4})});
        assert.equal(rated.status,200); assert.equal(ratings[0].solicitud_id,1);
    } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
