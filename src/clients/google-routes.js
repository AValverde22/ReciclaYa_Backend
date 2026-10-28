// Transport details stay outside the pickup business service.
export default {
    isConfigured() {
        return Boolean(process.env.GOOGLE_ROUTES_API_KEY);
    },
    async computeRoute(origin, destination) {
        const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
            method:'POST', signal:AbortSignal.timeout(10000),
            headers:{
                'Content-Type':'application/json',
                'X-Goog-Api-Key':process.env.GOOGLE_ROUTES_API_KEY,
                'X-Goog-FieldMask':'routes.polyline.encodedPolyline'
            },
            body:JSON.stringify({
                origin:{location:{latLng:origin}}, destination:{location:{latLng:destination}}, travelMode:'DRIVE'
            })
        });
        if (!response.ok) throw Object.assign(new Error('No se pudo calcular la ruta vial.'), {status:502});
        const data = await response.json();
        return {polyline:data.routes?.[0]?.polyline?.encodedPolyline || null};
    }
};
