export function positiveId(value) {
    if (!['string', 'number'].includes(typeof value) || (typeof value === 'string' && !/^[1-9]\d*$/.test(value)))
        throw Object.assign(new Error('Identificador inválido.'), { status: 400 });
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) throw Object.assign(new Error('Identificador inválido.'), { status: 400 });
    return id;
}
export function fail(message, status = 409) { throw Object.assign(new Error(message), { status }); }
export function coordinates(latitude, longitude) {
    if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
        !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180)
        fail('Coordenadas inválidas.', 400);
}
export function distanceMeters(a, b, c, d) {
    const rad = n => n * Math.PI / 180;
    const h = Math.sin(rad(c-a)/2)**2 + Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(rad(d-b)/2)**2;
    return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function arrived(s) {
    const age = Date.now() - new Date(s.location_updated_at).getTime();
    return s.recycler_latitude != null && s.recycler_longitude != null && s.location_updated_at != null &&
        age >= 0 && age < 120000 &&
        distanceMeters(s.latitude, s.longitude, s.recycler_latitude, s.recycler_longitude) <= 100;
}
export function rating(value) {
    if (!Number.isInteger(value) || value < 1 || value > 5) fail('La puntuación debe ser un entero de 1 a 5.', 400);
    return value;
}
