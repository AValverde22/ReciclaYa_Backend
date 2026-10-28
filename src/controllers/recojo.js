import service from '../services/recojo.js';
const handle = work => async (req, res) => {
    try { res.json(await work(req)); }
    catch (error) {
        if (!error.status) console.error('Error en recojo:', error.name);
        res.status(error.status || 500).json({message:error.status ? error.message : 'Error interno al procesar el reciclaje.'});
    }
};
export default {
    create:handle(r => service.create(r.body)),
    edit:handle(r => service.edit(r.params.id, r.query.user_id, r.body)),
    cancel:handle(r => service.cancel(r.params.id, r.query.user_id)),
    cancelActive:handle(r => service.cancelActive(r.params.id, r.query.user_id)),
    accept:handle(r => service.accept(r.params.id, r.query.user_id)),
    active:handle(r => service.active(r.query.user_id)),
    location:handle(r => service.location(r.params.id, r.query.user_id, r.body)),
    confirm:handle(r => service.confirm(r.params.id, r.query.user_id)),
    rate:handle(r => service.rate(r.params.id, r.body.evaluador_id, r.body)),
    route:handle(r => service.route(r.params.id, r.query.user_id))
};
